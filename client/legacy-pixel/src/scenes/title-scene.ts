import Phaser from 'phaser';
import { SCENES } from './keys';
import { game } from '../state/store';
import type { VibeurClass } from '../state/types';
import { padActionOf } from '../story/controls';
import { C, FONT_PIXEL, GAME_HEIGHT, GAME_WIDTH, hex, ZOOM } from '../ui/theme';

type Mode = 'menu' | 'name' | 'class';

const CLASSES: { id: VibeurClass; label: string; blurb: string }[] = [
  { id: 'prompt_engineer', label: 'Prompt Engineer', blurb: 'Il écrit « Tu es un expert » avant chaque phrase. Ça marche, parfois.' },
  { id: 'vibe_coder', label: 'Vibe Coder', blurb: 'Il ne lit jamais le code. Il sent qu\'il est bon.' },
  { id: 'doomer', label: 'Doomer', blurb: 'Il est sûr que tout va mal finir, mais il déploie quand même.' },
  { id: 'accelerationist', label: 'Accélérationniste', blurb: 'Plus vite. Plus gros. Pas de freins, c\'est du poids.' },
];
const PARADE = ['smollm', 'bert', 'qwen', 'claude_haiku', 'phi_1', 'gemma', 'gpt_2'];
const STYLE = (size: number, color: string): Phaser.Types.GameObjects.Text.TextStyle => ({ fontFamily: FONT_PIXEL, fontSize: `${size}px`, color, resolution: ZOOM });

export class TitleScene extends Phaser.Scene {
  private mode: Mode = 'menu';
  private sel = 0;
  private items: string[] = [];
  private menuTexts: Phaser.GameObjects.Text[] = [];
  private cursor!: Phaser.GameObjects.Text;
  private hint!: Phaser.GameObjects.Text;
  private nameText!: Phaser.GameObjects.Text;
  private blurb!: Phaser.GameObjects.Text;
  private panel!: Phaser.GameObjects.Container;
  private name = 'Vibeur';

  constructor() {
    super(SCENES.Title);
  }

  create(): void {
    this.mode = 'menu';
    this.sel = 0;
    this.name = 'Vibeur';
    this.cameras.main.setBackgroundColor(C.ink);
    this.drawBackground();
    this.drawTitle();
    this.parade();
    this.panel = this.add.container(0, 0);
    this.cursor = this.add.text(0, 0, '▶', STYLE(10, C.gold)).setDepth(5);
    this.hint = this.add.text(GAME_WIDTH / 2, 120, '', STYLE(8, C.fog)).setOrigin(0.5).setDepth(5);
    this.nameText = this.add.text(GAME_WIDTH / 2, 98, '', STYLE(12, C.cream)).setOrigin(0.5).setDepth(5);
    this.blurb = this.add.text(GAME_WIDTH / 2, 134, '', { ...STYLE(8, C.sky), align: 'center', wordWrap: { width: 280 } }).setOrigin(0.5, 0).setDepth(5);
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 8, 'Parodie non affiliée.', STYLE(8, C.fog)).setOrigin(0.5).setDepth(5);
    this.showMenu();
    const kb = this.input.keyboard;
    if (!kb) return;
    kb.addCapture('SPACE,UP,DOWN,LEFT,RIGHT,BACKSPACE');
    const onKey = (ev: KeyboardEvent): void => this.onKey(ev);
    kb.on('keydown', onKey);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => kb.off('keydown', onKey));
  }

  // ---------- visuals ----------

  private drawBackground(): void {
    const g = this.add.graphics();
    for (let y = 0; y < GAME_HEIGHT; y += 4) g.fillStyle(hex(y % 8 === 0 ? C.night : C.ink), 1).fillRect(0, y, GAME_WIDTH, 4);
    for (let i = 0; i < 40; i++) g.fillStyle(hex(C.dusk), 1).fillRect(Phaser.Math.Between(0, GAME_WIDTH), Phaser.Math.Between(0, 90), 1, 1);
    g.fillStyle(hex(C.moss), 1).fillRect(0, 160, GAME_WIDTH, 20);
    g.fillStyle(hex(C.leaf), 1).fillRect(0, 160, GAME_WIDTH, 2);
  }

  private drawTitle(): void {
    const mk = (dx: number, dy: number, col: string): Phaser.GameObjects.Text =>
      this.add.text(GAME_WIDTH / 2 + dx, 42 + dy, 'PokAI', STYLE(34, col)).setOrigin(0.5);
    mk(2, 2, C.ink);
    mk(1, 1, C.ember);
    const main = mk(0, 0, C.cream);
    this.tweens.add({ targets: main, y: main.y - 2, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.add.text(GAME_WIDTH / 2, 66, 'Ils ont lu tout Internet. Pas toi.', STYLE(8, C.gold)).setOrigin(0.5);
  }

  private parade(): void {
    PARADE.forEach((id, i) => {
      const key = `pokai:${id}`;
      if (!this.textures.exists(key)) return;
      const s = this.add.image(-20 - i * 52, 142, key).setOrigin(0.5, 1);
      this.tweens.add({ targets: s, x: GAME_WIDTH + 40, duration: 14000, repeat: -1, delay: i * 1800, onRepeat: () => s.setX(-30) });
      this.tweens.add({ targets: s, y: 138, duration: 260, yoyo: true, repeat: -1, delay: i * 90 });
    });
  }

  // ---------- states ----------

  private clearPanel(): void {
    this.menuTexts.forEach((t) => t.destroy());
    this.menuTexts = [];
    this.panel.removeAll(true);
    this.nameText.setText('');
    this.blurb.setText('');
    this.hint.setText('');
  }

  private showMenu(): void {
    this.mode = 'menu';
    this.clearPanel();
    this.items = game.hasSave() ? ['Continuer', 'Nouvelle partie'] : ['Nouvelle partie'];
    this.sel = 0;
    this.rowH = 14;
    this.hint.setY(120);
    this.layoutList(86);
    this.hint.setText('↑↓ choisir · Espace/Entrée valider');
  }

  private layoutList(y0: number): void {
    this.items.forEach((label, i) => {
      this.menuTexts.push(this.add.text(GAME_WIDTH / 2 - 56, y0 + i * this.rowH, label, STYLE(10, C.cream)).setDepth(5));
    });
    this.updateCursor(y0);
    this.listY = y0;
  }
  private listY = 86;
  private rowH = 14;

  private updateCursor(y0 = this.listY): void {
    this.cursor.setPosition(GAME_WIDTH / 2 - 70, y0 + this.sel * this.rowH).setVisible(this.mode !== 'name');
    this.menuTexts.forEach((t, i) => t.setColor(i === this.sel ? C.gold : C.cream));
    if (this.mode === 'class') this.blurb.setText(CLASSES[this.sel]?.blurb ?? '');
  }

  private showName(): void {
    this.mode = 'name';
    this.clearPanel();
    this.cursor.setVisible(false);
    this.menuTexts.push(this.add.text(GAME_WIDTH / 2, 84, 'Ton nom de Vibeur ?', STYLE(10, C.cream)).setOrigin(0.5));
    this.refreshName();
    this.hint.setText('Tape ton nom · Entrée valider · Retour pour effacer');
  }

  private refreshName(): void {
    this.nameText.setText(`${this.name}▌`);
  }

  private showClass(): void {
    this.mode = 'class';
    this.clearPanel();
    this.items = CLASSES.map((c) => c.label);
    this.sel = 0;
    // Heading 74, rows 82/93/104/115 (11 px pitch), blurb 129-147, hint 155: nothing overlaps.
    this.panel.add(this.add.rectangle(0, 68, GAME_WIDTH, 94, hex(C.ink), 0.85).setOrigin(0, 0).setDepth(4));
    this.menuTexts.push(this.add.text(GAME_WIDTH / 2, 74, 'Choisis ta classe de Vibeur', STYLE(10, C.cream)).setOrigin(0.5).setDepth(5));
    this.rowH = 11;
    this.layoutList(82);
    this.hint.setText('↑↓ choisir · Entrée valider · Échap retour');
    this.hint.setY(155);
    this.blurb.setY(129);
    this.updateCursor();
  }

  private onKey(ev: KeyboardEvent): void {
    if (this.mode === 'name') {
      if (ev.code === 'Enter' || ev.code === 'NumpadEnter') {
        if (this.name.trim().length === 0) this.name = 'Vibeur';
        this.showClass();
      } else if (ev.code === 'Backspace') {
        this.name = this.name.slice(0, -1);
        this.refreshName();
      } else if (ev.code === 'Escape') {
        this.showMenu();
      } else if (ev.key.length === 1 && /[\p{L}\p{N} _-]/u.test(ev.key) && this.name.length < 12) {
        this.name += ev.key;
        this.refreshName();
      }
      return;
    }
    const a = padActionOf(ev.code);
    if (!a || (ev.repeat && (a === 'a' || a === 'b'))) return;
    if (a === 'up') this.sel = (this.sel + this.items.length - 1) % this.items.length;
    else if (a === 'down') this.sel = (this.sel + 1) % this.items.length;
    else if (a === 'a') return this.confirm();
    else if (a === 'b') {
      if (this.mode === 'class') this.showName();
      return;
    }
    this.updateCursor();
  }

  private confirm(): void {
    if (this.mode === 'menu') {
      const choice = this.items[this.sel];
      if (choice === 'Continuer') {
        if (game.load()) this.startGame();
        else this.showName();
      } else {
        this.name = 'Vibeur';
        this.showName();
      }
    } else if (this.mode === 'class') {
      const cls = CLASSES[this.sel] ?? CLASSES[0]!;
      game.newGame(this.name.trim() || 'Vibeur', cls.id);
      const s = game.state;
      s.map = 'player_house';
      s.x = 4;
      s.y = 5;
      s.facing = 'up';
      game.save();
      this.startGame();
    }
  }

  private startGame(): void {
    this.cameras.main.fadeOut(300, 20, 16, 28);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start(SCENES.Overworld));
  }
}
