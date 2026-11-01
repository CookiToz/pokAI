// Pure NPC behaviour: wandering citizens and patrolling guards. The scene feeds positions in and applies the wish vector.
import type { Rng } from '../../systems/rng';
import { len, type V2 } from './movement';

export type WanderMode = 'pause' | 'walk';

export interface WanderState {
  mode: WanderMode;
  /** Seconds left in the current pause (mode 'pause') or time stuck while walking (mode 'walk'). */
  timer: number;
  target: V2;
}

export interface WanderCtx {
  home: V2;
  radius: number;
  /** Can the NPC stand on this tile? (walkable, not a warp/trigger) */
  canStand: (tx: number, ty: number) => boolean;
  /** Straight line from a to b is walkable. */
  lineClear: (a: V2, b: V2) => boolean;
}

export interface AiStep {
  wish: V2;
  /** Set when the NPC just came to rest: the scene may turn it toward the player. */
  justPaused?: boolean;
}

export const ARRIVE_DIST = 0.08;
const STUCK_LIMIT = 0.7;

export function newWander(home: V2, rng: Rng): WanderState {
  return { mode: 'pause', timer: 0.5 + rng.next() * 2.5, target: { x: home.x, y: home.y } };
}

/** Random walkable tile centre within `radius` of home (and not the current tile), or null. */
export function pickWanderTarget(pos: V2, ctx: WanderCtx, rng: Rng): V2 | null {
  for (let tries = 0; tries < 8; tries++) {
    const r = Math.ceil(ctx.radius);
    const tx = Math.round(ctx.home.x) + rng.int(-r, r);
    const ty = Math.round(ctx.home.y) + rng.int(-r, r);
    if (Math.hypot(tx - ctx.home.x, ty - ctx.home.y) > ctx.radius) continue;
    if (tx === Math.round(pos.x) && ty === Math.round(pos.y)) continue;
    if (!ctx.canStand(tx, ty)) continue;
    const t = { x: tx, y: ty };
    if (!ctx.lineClear(pos, t)) continue;
    return t;
  }
  return null;
}

/** Advance the wander state machine by `dt`. Mutates `st`; returns the wish direction (unit vector or zero). */
export function stepWander(st: WanderState, pos: V2, dt: number, ctx: WanderCtx, rng: Rng, progressed: boolean): AiStep {
  if (st.mode === 'pause') {
    st.timer -= dt;
    if (st.timer > 0) return { wish: { x: 0, y: 0 } };
    const t = pickWanderTarget(pos, ctx, rng);
    if (!t) {
      st.timer = 1 + rng.next() * 2;
      return { wish: { x: 0, y: 0 } };
    }
    st.mode = 'walk';
    st.target = t;
    st.timer = 0;
    return { wish: unitToward(pos, t) };
  }
  const d = Math.hypot(st.target.x - pos.x, st.target.y - pos.y);
  st.timer = progressed ? 0 : st.timer + dt;
  if (d < ARRIVE_DIST || st.timer > STUCK_LIMIT) {
    st.mode = 'pause';
    st.timer = 1 + rng.next() * 3.5;
    return { wish: { x: 0, y: 0 }, justPaused: true };
  }
  return { wish: unitToward(pos, st.target) };
}

export function unitToward(from: V2, to: V2): V2 {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const d = Math.hypot(dx, dy);
  return d < 1e-9 ? { x: 0, y: 0 } : { x: dx / d, y: dy / d };
}

export interface PatrolState {
  index: number;
  /** Seconds left in the pause at a waypoint. */
  wait: number;
  stuck: number;
}

export const newPatrol = (): PatrolState => ({ index: 0, wait: 0, stuck: 0 });

/** Advance a patrol: walk to waypoint `index`, pause briefly, then go to the next one (loop). Mutates `st`. */
export function stepPatrol(st: PatrolState, pos: V2, dt: number, waypoints: readonly V2[], progressed: boolean, pause = 0.7): AiStep {
  if (waypoints.length === 0) return { wish: { x: 0, y: 0 } };
  if (st.wait > 0) {
    st.wait -= dt;
    return { wish: { x: 0, y: 0 } };
  }
  const wp = waypoints[st.index % waypoints.length] as V2;
  const d = len({ x: wp.x - pos.x, y: wp.y - pos.y });
  st.stuck = progressed ? 0 : st.stuck + dt;
  if (d < ARRIVE_DIST || st.stuck > 1.2) {
    st.index = (st.index + 1) % waypoints.length;
    st.wait = pause;
    st.stuck = 0;
    return { wish: { x: 0, y: 0 }, justPaused: true };
  }
  return { wish: unitToward(pos, wp) };
}
