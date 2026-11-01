// Full-screen party chooser (switch, forced switch, item target). Resolves with the index or null on B.
import Phaser from 'phaser';
import { C, GAME_HEIGHT, GAME_WIDTH, TEXT, hex } from './theme';
import { Panel } from './panel';
import { PartyPicker } from './party-picker';
import { txt } from './text';
import type { Action, InputRouter } from './input';
import type { PokaiInstance } from '../state/types';

export interface PartyScreenOpts {
  party: PokaiInstance[];
  title: string;
  /** Forced choice: B is ignored. */
  forced?: boolean;
  activeIndex?: number;
  /** Return an error message to refuse a choice, null to accept. */
  validate?: (p: PokaiInstance, index: number) => string | null;
  depth?: number;
}

export function pickParty(scene: Phaser.Scene, router: InputRouter, o: PartyScreenOpts): Promise<number | null> {
  return new Promise((resolve) => {
    const root = scene.add.container(0, 0).setDepth(o.depth ?? 400);
    const bg = scene.add.graphics();
    bg.fillStyle(hex(C.ink), 1).fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    root.add(bg);
    root.add(new Panel(scene, 0, 0, GAME_WIDTH, 11, { style: 'terminal', title: o.title, shadow: false }));
    const footer = txt(scene, 4, GAME_HEIGHT - 12, '', { ...TEXT.small, color: C.fog });
    const hint = o.forced ? 'A : envoyer' : 'A : choisir   B : retour';
    footer.setText(hint);
    const picker = new PartyPicker(scene, {
      x: 2,
      y: 16,
      party: o.party,
      columns: 2,
      cellW: 156,
      cellH: 36,
      spriteScale: 1,
      ...(o.activeIndex !== undefined ? { activeIndex: o.activeIndex } : {}),
      onSelect: (i) => {
        const p = o.party[i];
        if (!p) return;
        const err = o.validate ? o.validate(p, i) : null;
        if (err) {
          footer.setText(err).setColor(C.ember);
          scene.tweens.add({ targets: footer, x: 6, duration: 40, yoyo: true, repeat: 1, onComplete: () => footer.setX(4) });
          return;
        }
        close(i);
      },
      onCancel: () => {
        if (!o.forced) close(null);
      },
      onChange: () => footer.setText(hint).setColor(C.fog),
    });
    root.add([picker, footer]);
    const handler = (a: Action): void => {
      picker.handle(a);
    };
    router.push(handler);
    let closed = false;
    function close(v: number | null): void {
      if (closed) return;
      closed = true;
      router.pop(handler);
      root.destroy();
      resolve(v);
    }
  });
}
