// AIACT mini-game: "Bannière de cookies". 2 s to find the tiny, hopping "Tout refuser".
// Arrow key toward the small button focuses it, A confirms. Timeout = consent.
import Phaser from 'phaser';
import { C, TEXT, hex } from './theme';
import { Panel } from './panel';
import { drawBox, drawFrame } from './gfx';
import { txt } from './text';
import type { Action, InputRouter } from './input';
import { wrapText } from './format';

type Dir = 'left' | 'right' | 'down';
const SPOTS: Record<Dir, { x: number; y: number }> = {
  left: { x: 8, y: 52 },
  right: { x: 158, y: 52 },
  down: { x: 82, y: 74 },
};
const DURATION = 2000;

/** Resolves true when the player consented (clicked accept or ran out of time). */
export function cookieBanner(scene: Phaser.Scene, router: InputRouter): Promise<boolean> {
  return new Promise((resolve) => {
    const PX = 50;
    const PY = 34;
    const PW = 220;
    const PH = 92;
    const root = scene.add.container(PX, PY).setDepth(450);
    root.add(new Panel(scene, 0, 0, PW, PH, { style: 'paper', title: 'Cookies' }));
    root.add(
      txt(scene, 8, 12, wrapText('Ce combat utilise des cookies pour améliorer votre expérience de conformité.', 44).join('\n'), {
        ...TEXT.small,
        lineSpacing: 1,
      }),
    );
    // big accept button
    const accept = scene.add.container(48, 38);
    const ag = scene.add.graphics();
    drawBox(ag, 0, 0, 124, 20, C.gold, C.ink, C.ink);
    accept.add([ag, txt(scene, 62, 4, 'Tout accepter', TEXT.body).setOrigin(0.5, 0)]);
    root.add(accept);
    // tiny refuse button
    const refuse = scene.add.container(SPOTS.left.x, SPOTS.left.y);
    const rg = scene.add.graphics();
    drawBox(rg, 0, 0, 54, 10, C.paper, C.steel);
    refuse.add([rg, txt(scene, 27, 1, 'Tout refuser', { ...TEXT.log, color: C.steel }).setOrigin(0.5, 0)]);
    root.add(refuse);
    const focusG = scene.add.graphics();
    root.add(focusG);
    // countdown bar
    const bar = scene.add.graphics();
    root.add(bar);

    let dir: Dir = 'left';
    let focus: 'accept' | 'refuse' = 'accept';
    const redraw = (): void => {
      focusG.clear();
      if (focus === 'accept') drawFrame(focusG, accept.x - 2, accept.y - 2, 128, 24, C.ember);
      else drawFrame(focusG, refuse.x - 2, refuse.y - 2, 58, 14, C.ember);
    };
    redraw();

    const t0 = scene.time.now;
    let done = false;
    const finish = (consent: boolean): void => {
      if (done) return;
      done = true;
      hop.remove();
      tick.remove();
      router.pop(handler);
      root.destroy();
      resolve(consent);
    };
    const hop = scene.time.addEvent({
      delay: 480,
      loop: true,
      callback: () => {
        const all: Dir[] = ['left', 'right', 'down'];
        const next = all.filter((d) => d !== dir);
        dir = next[Math.floor(Math.random() * next.length)] ?? 'left';
        refuse.setPosition(SPOTS[dir].x, SPOTS[dir].y);
        redraw();
      },
    });
    const tick = scene.time.addEvent({
      delay: 50,
      loop: true,
      callback: () => {
        const r = Math.max(0, 1 - (scene.time.now - t0) / DURATION);
        bar.clear();
        bar.fillStyle(hex(C.plum), 1).fillRect(8, PH - 7, PW - 16, 3);
        bar.fillStyle(hex(C.ember), 1).fillRect(8, PH - 7, Math.round((PW - 16) * r), 3);
        if (r <= 0) finish(true);
      },
    });
    const handler = (a: Action): void => {
      if (a === 'a') {
        finish(focus === 'accept');
        return;
      }
      if (a === 'left' || a === 'right' || a === 'down') {
        focus = a === dir ? 'refuse' : 'accept';
        redraw();
      } else if (a === 'up') {
        focus = 'accept';
        redraw();
      }
    };
    router.push(handler);
  });
}
