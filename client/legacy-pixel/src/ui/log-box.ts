// Terminal-style log: lines are revealed token by token, with a blinking ▌ caret.
// A / B while text is typing (or pausing) fast-forwards; input is never required to progress.
import Phaser from 'phaser';
import { C, TEXT } from './theme';
import { Panel } from './panel';
import { wait } from './gfx';
import type { InputRouter } from './input';
import { tokenize } from './tokenize';
import { wrapText } from './format';
import { charWidth } from './text';

export interface LogOpts {
  /** "[GPT-4o]" style prefix, drawn in tagColour. */
  tag?: string;
  tagColour?: string;
  colour?: string;
  /** Pause after the line is fully shown (ms). Default 340. */
  pauseMs?: number;
  instant?: boolean;
}

interface Line {
  tag: string;
  tagColour: string;
  colour: string;
  indent: number; // characters
  full: string;
  shown: string;
}

const STYLE = { ...TEXT.log };
const ROW_H = 8;

export class LogBox extends Phaser.GameObjects.Container {
  override readonly w: number;
  readonly h: number;
  private readonly lines: Line[] = [];
  private readonly tagTexts: Phaser.GameObjects.Text[] = [];
  private readonly bodyTexts: Phaser.GameObjects.Text[] = [];
  private readonly maxRows: number;
  private readonly cw: number;
  private readonly maxChars: number;
  private caretOn = true;
  private caretVisible = true;
  private waiting = false;

  constructor(
    scene: Phaser.Scene,
    private readonly router: InputRouter,
    x: number,
    y: number,
    w: number,
    h: number,
  ) {
    super(scene, Math.round(x), Math.round(y));
    this.w = w;
    this.h = h;
    this.add(new Panel(scene, 0, 0, w, h, { style: 'terminal' }));
    this.maxRows = Math.floor((h - 6) / ROW_H);
    this.cw = charWidth(scene, STYLE);
    this.maxChars = Math.max(8, Math.floor((w - 10) / this.cw));
    for (let i = 0; i < this.maxRows; i++) {
      const tag = scene.add.text(5, 3 + i * ROW_H, '', STYLE);
      const body = scene.add.text(5, 3 + i * ROW_H, '', STYLE);
      this.tagTexts.push(tag);
      this.bodyTexts.push(body);
      this.add([tag, body]);
    }
    scene.add.existing(this);
    scene.time.addEvent({
      delay: 440,
      loop: true,
      callback: () => {
        this.caretOn = !this.caretOn;
        this.render();
      },
    });
  }

  clear(): void {
    this.lines.length = 0;
    this.render();
  }

  setCaret(v: boolean): void {
    this.caretVisible = v;
    this.render();
  }

  private render(): void {
    const visible = this.lines.slice(-this.maxRows);
    for (let i = 0; i < this.maxRows; i++) {
      const tagT = this.tagTexts[i] as Phaser.GameObjects.Text;
      const bodyT = this.bodyTexts[i] as Phaser.GameObjects.Text;
      const line = visible[i];
      if (!line) {
        tagT.setText('');
        bodyT.setText('');
        continue;
      }
      tagT.setText(line.tag).setColor(line.tagColour);
      const off = Math.round(line.indent * this.cw);
      const isLast = i === visible.length - 1;
      const caret = isLast && this.caretVisible && this.caretOn ? '▌' : isLast && this.caretVisible ? ' ' : '';
      bodyT.setText(line.shown + caret).setColor(line.colour).setX(5 + off);
    }
  }

  /** Types a message. Resolves once typed and the short pause is over (or skipped). */
  async print(text: string, opts: LogOpts = {}): Promise<void> {
    const tag = opts.tag ?? '';
    const indent = tag ? tag.length + 1 : 0;
    const colour = opts.colour ?? C.cream;
    const wrapped = wrapText(text, Math.max(6, this.maxChars - indent));
    const start = this.lines.length;
    wrapped.forEach((full, i) =>
      this.lines.push({
        tag: i === 0 ? tag : '',
        tagColour: opts.tagColour ?? C.gold,
        colour,
        indent,
        full,
        shown: '',
      }),
    );
    const total = wrapped.join(' ').length;
    const reveal = (n: number): void => {
      let rem = n;
      for (let i = start; i < this.lines.length; i++) {
        const l = this.lines[i] as Line;
        l.shown = l.full.slice(0, Math.max(0, Math.min(l.full.length, rem)));
        rem -= l.full.length + 1;
      }
      this.render();
    };

    let skipped = opts.instant === true;
    const off = this.router.onSkip(() => {
      skipped = true;
    });
    try {
      if (!skipped) {
        const tokens = tokenize(wrapped.join(' '));
        let n = 0;
        for (const tk of tokens) {
          if (skipped) break;
          n += tk.length;
          reveal(n);
          const last = tk.trimEnd().slice(-1);
          await wait(this.scene, '.!?…:'.includes(last) ? 90 : 22);
        }
      }
      reveal(total + 1);
      if (!skipped) await this.pause(opts.pauseMs ?? 340);
    } finally {
      off();
    }
  }

  private pause(ms: number): Promise<void> {
    return new Promise((resolve) => {
      let done = false;
      const finish = (): void => {
        if (done) return;
        done = true;
        timer.remove();
        off();
        resolve();
      };
      const timer = this.scene.time.delayedCall(ms, finish);
      const off = this.router.onSkip(finish);
    });
  }

  /** Waits for A or B (shows the caret). */
  waitKey(): Promise<void> {
    this.waiting = true;
    return new Promise((resolve) => {
      const off = this.router.onSkip(() => {
        off();
        this.waiting = false;
        resolve();
      });
    });
  }

  get isWaiting(): boolean {
    return this.waiting;
  }
}
