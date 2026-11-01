import { describe, expect, it } from 'vitest';
import { createRng } from '../../systems/rng';
import { isContactFrame, leanAngle, pickView, walkFrame } from './anim';
import { laneRuns, packetPos } from './lanes';
import {
  RUN_SPEED, WALK_SPEED, boxBlocked, dirOfVector, gridToScreen, len, moveAndSlide, pickInFront, screenToGrid, stepVelocity, tileOf,
} from './movement';
import { newPatrol, newWander, stepPatrol, stepWander, type WanderCtx } from './npc-ai';
import { coneOutline, inVisionCone, rayClear } from './vision';

describe('screen-aligned input', () => {
  it('up goes up on screen, right goes right, diagonals are unit length', () => {
    for (const [ix, iy] of [[0, -1], [1, 0], [0, 1], [-1, 0], [1, -1], [-1, 1], [1, 1], [-1, -1]] as const) {
      const g = screenToGrid(ix, iy);
      expect(len(g)).toBeCloseTo(1);
      const s = gridToScreen(g);
      expect(Math.sign(Math.round(s.x * 100) / 100)).toBe(Math.sign(ix));
      expect(Math.sign(Math.round(s.y * 100) / 100)).toBe(Math.sign(iy));
    }
  });
  it('screen up is grid (-1,-1) and screen up-right is grid -y', () => {
    const up = screenToGrid(0, -1);
    expect(up.x).toBeCloseTo(-Math.SQRT1_2);
    expect(up.y).toBeCloseTo(-Math.SQRT1_2);
    const ur = screenToGrid(1, -1);
    expect(ur.x).toBeCloseTo(0);
    expect(ur.y).toBeCloseTo(-1);
  });
  it('no input -> zero vector', () => expect(screenToGrid(0, 0)).toEqual({ x: 0, y: 0 }));
});

describe('velocity', () => {
  it('accelerates smoothly to the target and stops with deceleration', () => {
    let v = { x: 0, y: 0 };
    v = stepVelocity(v, { x: 1, y: 0 }, WALK_SPEED, 0.016);
    expect(v.x).toBeGreaterThan(0);
    expect(v.x).toBeLessThan(WALK_SPEED);
    for (let i = 0; i < 60; i++) v = stepVelocity(v, { x: 1, y: 0 }, RUN_SPEED, 0.016);
    expect(v.x).toBeCloseTo(RUN_SPEED);
    for (let i = 0; i < 60; i++) v = stepVelocity(v, { x: 0, y: 0 }, RUN_SPEED, 0.016);
    expect(len(v)).toBe(0);
  });
});

// 5x5 room: solid ring, with a wall block at (3,2)
const solid = (tx: number, ty: number): boolean => tx < 0 || ty < 0 || tx > 4 || ty > 4 || (tx === 3 && ty === 2);

describe('collision', () => {
  it('stops at a wall and slides along it', () => {
    const r = moveAndSlide({ x: 1, y: 1 }, { x: -2, y: 0.3 }, 0.2, solid);
    expect(r.hitX).toBe(true);
    expect(r.pos.x).toBeGreaterThanOrEqual(-0.3 - 1e-6);
    expect(r.pos.y).toBeCloseTo(1.3);
    expect(boxBlocked(r.pos.x, r.pos.y, 0.2, solid)).toBe(false);
  });
  it('never tunnels through with a large delta', () => {
    const r = moveAndSlide({ x: 1, y: 2 }, { x: 5, y: 0 }, 0.2, solid);
    expect(r.pos.x).toBeLessThan(2.5);
    expect(r.hitX).toBe(true);
  });
  it('blocks on extra obstacles (actors) but lets the player slide on the other axis', () => {
    const r = moveAndSlide({ x: 1, y: 1 }, { x: 1, y: 0.1 }, 0.2, solid, (nx, ny) => Math.hypot(nx - 2, ny - 1) < 0.6);
    expect(r.hitX).toBe(true);
    expect(r.pos.y).toBeCloseTo(1.1);
  });
  it('fits through a one-tile gap', () => {
    const gap = (tx: number, ty: number): boolean => tx === 2 && ty !== 2;
    const r = moveAndSlide({ x: 1, y: 2 }, { x: 2, y: 0 }, 0.2, gap);
    expect(r.hitX).toBe(false);
    expect(r.pos.x).toBeCloseTo(3);
  });
  it('tile centres are integers', () => expect(tileOf({ x: 2.49, y: -0.4 })).toEqual({ x: 2, y: 0 }));
});

describe('facing and interaction', () => {
  it('maps vectors to the nearest grid direction', () => {
    expect(dirOfVector({ x: 0.2, y: -1 })).toBe('up');
    expect(dirOfVector({ x: 1, y: 0.3 })).toBe('right');
    expect(dirOfVector({ x: -1, y: -0.2 })).toBe('left');
    expect(dirOfVector({ x: 0, y: 0 }, 'left')).toBe('left');
  });
  it('picks the nearest candidate in front, ignoring the ones behind', () => {
    const origin = { x: 5, y: 5 };
    const cands = [{ x: 5, y: 7 }, { x: 5, y: 6 }, { x: 5, y: 3.9 }, { x: 7, y: 5 }];
    expect(pickInFront(origin, { x: 0, y: 1 }, cands)).toBe(1);
    expect(pickInFront(origin, { x: 0, y: -1 }, cands)).toBe(2);
    expect(pickInFront(origin, { x: -1, y: 0 }, cands)).toBe(-1);
  });
});

describe('view selection', () => {
  it('uses front/back for the vertical screen axis and mirrored side otherwise', () => {
    expect(pickView(screenToGrid(0, 1))).toEqual({ view: 'front', flip: false });
    expect(pickView(screenToGrid(0, -1))).toEqual({ view: 'back', flip: false });
    expect(pickView(screenToGrid(1, 0))).toEqual({ view: 'side', flip: false });
    expect(pickView(screenToGrid(-1, 0))).toEqual({ view: 'side', flip: true });
  });
  it('|dy| >= |dx| wins on the pure diagonals', () => {
    expect(pickView(screenToGrid(1, 1)).view).toBe('front');
    expect(pickView(screenToGrid(-1, -1)).view).toBe('back');
  });
  it('cycles frames 1..4 and idles at 0', () => {
    expect([0, 1, 2, 3, 4, 5].map((c) => walkFrame(c, true))).toEqual([1, 2, 3, 4, 1, 2]);
    expect(walkFrame(3.7, false)).toBe(0);
    expect(isContactFrame(1) && isContactFrame(3) && !isContactFrame(2)).toBe(true);
  });
  it('leans toward the travel side', () => {
    expect(leanAngle(screenToGrid(1, 0), 3, false)).toBeGreaterThan(0);
    expect(leanAngle(screenToGrid(-1, 0), 3, false)).toBeLessThan(0);
  });
});

describe('vision cone', () => {
  const half = Math.PI / 6;
  it('sees ahead within range, not behind or beyond', () => {
    const o = { x: 5, y: 5 };
    const f = { x: 0, y: 1 };
    expect(inVisionCone(o, f, { x: 5, y: 8 }, 4, half)).toBe(true);
    expect(inVisionCone(o, f, { x: 5, y: 10 }, 4, half)).toBe(false);
    expect(inVisionCone(o, f, { x: 5, y: 2 }, 4, half)).toBe(false);
    expect(inVisionCone(o, f, { x: 8, y: 6 }, 4, half)).toBe(false);
    expect(inVisionCone(o, f, { x: 5.6, y: 7 }, 4, half)).toBe(true);
  });
  it('walls block the ray and clip the outline', () => {
    const wall = (tx: number, ty: number): boolean => tx === 5 && ty === 7;
    expect(rayClear({ x: 5, y: 5 }, { x: 5, y: 9 }, wall)).toBe(false);
    expect(rayClear({ x: 5, y: 5 }, { x: 8, y: 5 }, wall)).toBe(true);
    const poly = coneOutline({ x: 5, y: 5 }, { x: 0, y: 1 }, 4, half, wall);
    expect(poly.length).toBe(10);
    const mid = poly[5] as { x: number; y: number };
    expect(mid.y).toBeLessThan(6.6);
  });
});

describe('npc ai', () => {
  const open = (tx: number, ty: number): boolean => tx >= 0 && ty >= 0 && tx < 10 && ty < 10;
  const ctx: WanderCtx = { home: { x: 5, y: 5 }, radius: 2, canStand: open, lineClear: () => true };

  it('wanders: pauses, then walks to a tile within the radius, then pauses again', () => {
    const rng = createRng(7);
    const st = newWander({ x: 5, y: 5 }, rng);
    let pos = { x: 5, y: 5 };
    let walked = false;
    let paused = 0;
    for (let i = 0; i < 4000; i++) {
      const before = pos;
      const step = stepWander(st, pos, 0.02, ctx, rng, true);
      if (step.wish.x !== 0 || step.wish.y !== 0) {
        walked = true;
        pos = { x: pos.x + step.wish.x * 1.5 * 0.02, y: pos.y + step.wish.y * 1.5 * 0.02 };
      }
      if (step.justPaused) paused++;
      expect(Math.hypot(pos.x - 5, pos.y - 5)).toBeLessThanOrEqual(2.2);
      void before;
    }
    expect(walked).toBe(true);
    expect(paused).toBeGreaterThan(1);
  });
  it('gives up when stuck', () => {
    const rng = createRng(3);
    const st = newWander({ x: 5, y: 5 }, rng);
    st.mode = 'walk';
    st.target = { x: 7, y: 5 };
    st.timer = 0;
    let step = stepWander(st, { x: 5, y: 5 }, 0.4, ctx, rng, false);
    step = stepWander(st, { x: 5, y: 5 }, 0.4, ctx, rng, false);
    expect(step.justPaused).toBe(true);
    expect(st.mode).toBe('pause');
  });
  it('patrols waypoints in a loop', () => {
    const wps = [{ x: 0, y: 0 }, { x: 3, y: 0 }, { x: 3, y: 3 }];
    const st = newPatrol();
    let pos = { x: 0, y: 0 };
    const visited: number[] = [];
    for (let i = 0; i < 4000; i++) {
      const before = st.index;
      const step = stepPatrol(st, pos, 0.02, wps, true, 0.1);
      if (st.index !== before) visited.push(before);
      pos = { x: pos.x + step.wish.x * 2 * 0.02, y: pos.y + step.wish.y * 2 * 0.02 };
    }
    expect(visited.slice(0, 6)).toEqual([0, 1, 2, 0, 1, 2]);
  });
});

describe('data lanes', () => {
  it('finds straight runs on the longer axis', () => {
    const lanes = new Set(['1,2', '2,2', '3,2', '4,2', '2,3', '2,4']);
    const runs = laneRuns((x, y) => lanes.has(`${x},${y}`), 8, 8);
    expect(runs).toContainEqual({ axis: 'x', fixed: 2, from: 1, to: 4 });
  });
  it('packets wrap around the run', () => {
    const run = { axis: 'x', fixed: 2, from: 1, to: 4 } as const;
    for (let t = 0; t < 10; t += 0.37) {
      const p = packetPos(run, 0.5, 2, -1, t);
      expect(p.y).toBe(2);
      expect(p.x).toBeGreaterThanOrEqual(0.5);
      expect(p.x).toBeLessThan(4.5);
    }
  });
});
