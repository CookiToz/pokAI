// Small pixel effects: sparkles, floating text, shakes, glitch bands, scanlines.
import Phaser from 'phaser';
import { C, GAME_HEIGHT, GAME_WIDTH, TEXT, hex } from './theme';
import { wait } from './gfx';

export function sparkleBurst(
  scene: Phaser.Scene,
  x: number,
  y: number,
  opts: { count?: number; colours?: string[]; radius?: number; ms?: number; depth?: number } = {},
): void {
  const count = opts.count ?? 14;
  const colours = opts.colours ?? [C.gold, C.cream, C.sky];
  const radius = opts.radius ?? 28;
  const ms = opts.ms ?? 520;
  for (let i = 0; i < count; i++) {
    const ang = (i / count) * Math.PI * 2 + (i % 2) * 0.2;
    const dist = Math.round(radius * (0.55 + 0.45 * ((i * 7) % 5) / 4));
    const size = i % 3 === 0 ? 3 : 2;
    const r = scene.add.rectangle(Math.round(x), Math.round(y), size, size, hex(colours[i % colours.length] ?? C.gold));
    r.setDepth(opts.depth ?? 500);
    scene.tweens.add({
      targets: r,
      x: Math.round(x + Math.cos(ang) * dist),
      y: Math.round(y + Math.sin(ang) * dist) - 6,
      alpha: 0,
      duration: ms + (i % 4) * 40,
      ease: 'Quad.easeOut',
      onComplete: () => r.destroy(),
    });
  }
}

/** Floating pixel text that rises and fades (damage numbers, +alignment…). */
export function popText(scene: Phaser.Scene, x: number, y: number, s: string, colour: string = C.cream, depth = 500): void {
  const t = scene.add.text(Math.round(x), Math.round(y), s, { ...TEXT.small, color: colour }).setOrigin(0.5, 0.5).setDepth(depth);
  scene.tweens.add({
    targets: t,
    y: Math.round(y) - 10,
    alpha: 0,
    delay: 220,
    duration: 380,
    onComplete: () => t.destroy(),
  });
}

/** Stepped (integer) horizontal shake. */
export async function shakeX(
  scene: Phaser.Scene,
  obj: { x: number },
  amp = 2,
  steps = 6,
  stepMs = 28,
): Promise<void> {
  const x0 = obj.x;
  for (let i = 0; i < steps; i++) {
    obj.x = x0 + (i % 2 === 0 ? amp : -amp);
    await wait(scene, stepMs);
  }
  obj.x = x0;
}

/** Random horizontal colour bands for ~ms: a cheap "signal lost" glitch. */
export async function glitchBands(scene: Phaser.Scene, ms = 420, depth = 600): Promise<void> {
  const colours = [C.ember, C.sky, C.rose, C.cream];
  const end = scene.time.now + ms;
  const bands: Phaser.GameObjects.Rectangle[] = [];
  while (scene.time.now < end) {
    bands.forEach((b) => b.destroy());
    bands.length = 0;
    const n = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) {
      const y = Math.floor(Math.random() * (GAME_HEIGHT - 6));
      const h = 1 + Math.floor(Math.random() * 5);
      const w = 60 + Math.floor(Math.random() * 220);
      const x = Math.floor(Math.random() * (GAME_WIDTH - w));
      const r = scene.add.rectangle(x, y, w, h, hex(colours[i % colours.length] ?? C.ember), 0.55).setOrigin(0, 0).setDepth(depth);
      bands.push(r);
    }
    await wait(scene, 55);
  }
  bands.forEach((b) => b.destroy());
}

/** Chromatic-split text: three offset copies (sky, rose, cream) for the "429" look. */
export function glitchText(scene: Phaser.Scene, x: number, y: number, s: string, style: Phaser.Types.GameObjects.Text.TextStyle = TEXT.body): Phaser.GameObjects.Container {
  const mk = (dx: number, colour: string): Phaser.GameObjects.Text =>
    scene.add.text(dx, 0, s, { ...style, color: colour }).setOrigin(0.5, 0.5);
  const c = scene.add.container(Math.round(x), Math.round(y), [mk(-1, C.sky), mk(1, C.rose), mk(0, C.cream)]);
  return c;
}

/** Faint horizontal scan lines (every 4th row), drawn once. */
export function scanlines(scene: Phaser.Scene, alpha = 0.08): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  g.fillStyle(hex(C.cream), alpha);
  for (let y = 0; y < GAME_HEIGHT; y += 4) g.fillRect(0, y, GAME_WIDTH, 1);
  return g;
}
