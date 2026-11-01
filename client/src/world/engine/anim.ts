// Pure animation selection: which character view/frame to show for a movement/facing vector.
import { gridToScreen, type V2 } from './movement';

export type View = 'front' | 'back' | 'side';

export interface ViewPick {
  view: View;
  /** Mirror horizontally (side view is drawn facing screen-right). */
  flip: boolean;
}

/** View for a GRID facing/velocity vector: dominant screen axis wins (|dy| >= |dx| -> front/back, else side). */
export function pickView(face: V2): ViewPick {
  const s = gridToScreen(face);
  if (Math.abs(s.y) >= Math.abs(s.x)) return { view: s.y >= 0 ? 'front' : 'back', flip: false };
  return { view: 'side', flip: s.x < 0 };
}

export const WALK_FPS = 8;
export const RUN_FPS = 12;

/** Frame index for an accumulated animation clock (in frames). 0 = idle, 1..4 walk cycle. */
export function walkFrame(clock: number, moving: boolean): number {
  if (!moving) return 0;
  return 1 + (Math.floor(clock) % 4);
}

/** Contact frames (1 and 3) are where a footstep sound lands. */
export const isContactFrame = (frame: number): boolean => frame === 1 || frame === 3;

/** Small lean (degrees) in the screen direction of travel. */
export function leanAngle(vel: V2, maxSpeed: number, running: boolean): number {
  const s = gridToScreen(vel);
  const k = Math.max(-1, Math.min(1, s.x / (2 * maxSpeed)));
  return k * (running ? 6 : 3.5);
}
