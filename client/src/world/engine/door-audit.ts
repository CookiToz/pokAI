// Pure audit of door <-> warp alignment (no Phaser). Every door drawn on a building must be exactly where the warp is,
// and every warp into a building must show a visible door at that spot.
//
// Visible door tiles: *_door tiles, exit_mat, landmark entrance tiles (anchor + ENTRANCE_OFFSET) and map-edge exits.
import { LANDMARK_FOOTPRINT, SOLID_TILES, type TileName } from '../../data/tiles';
import type { Direction, MapDef } from '../../data/types';
import { entranceOffset, entranceTile } from '../art/entrances';
import { tileAt } from '../../story/map-validate';

export type DoorIssueKind =
  | 'warp_not_on_door' // a warp sits on a tile that shows no door
  | 'door_without_warp' // a visible door tile has neither a warp nor a trigger
  | 'warp_beside_entrance' // a warp in front of a landmark, but not on its drawn door
  | 'entrance_without_warp' // the drawn landmark door has no warp
  | 'door_blocked' // nothing walkable in front of the door
  | 'bad_landing' // the landing tile is not right in front of / inside the matching door
  | 'bad_facing'; // landing facing does not point away from the door

export interface DoorIssue {
  map: string;
  x: number;
  y: number;
  kind: DoorIssueKind;
  message: string;
}

const isDoorName = (n: TileName | null): boolean => !!n && (n.endsWith('_door') || n === 'exit_mat');
const isEdge = (m: MapDef, x: number, y: number): boolean => x === 0 || y === 0 || x === m.width - 1 || y === m.height - 1;

interface Landmark {
  name: TileName;
  ax: number;
  ay: number;
}

export function landmarksOf(map: MapDef): Landmark[] {
  const out: Landmark[] = [];
  for (let y = 0; y < map.height; y++)
    for (let x = 0; x < map.width; x++) {
      const t = tileAt(map, x, y);
      if (t && LANDMARK_FOOTPRINT[t]) out.push({ name: t, ax: x, ay: y });
    }
  return out;
}

/** Set of "x,y" keys of every visible door tile of a map (without map-edge exits). */
export function doorTiles(map: MapDef): Set<string> {
  const out = new Set<string>();
  for (let y = 0; y < map.height; y++) for (let x = 0; x < map.width; x++) if (isDoorName(tileAt(map, x, y))) out.add(`${x},${y}`);
  for (const l of landmarksOf(map)) {
    const e = entranceTile(l.name, l.ax, l.ay);
    if (e) out.add(`${e.x},${e.y}`);
  }
  return out;
}

const DIRS: [Direction, number, number][] = [['up', 0, -1], ['down', 0, 1], ['left', -1, 0], ['right', 1, 0]];

const walkable = (m: MapDef, x: number, y: number): boolean => {
  const t = tileAt(m, x, y);
  return t !== null && !SOLID_TILES.has(t);
};

export function auditMap(map: MapDef, maps: ReadonlyMap<string, MapDef>): DoorIssue[] {
  const out: DoorIssue[] = [];
  const add = (x: number, y: number, kind: DoorIssueKind, message: string): void => void out.push({ map: map.id, x, y, kind, message });
  const doors = doorTiles(map);
  const warpAt = (x: number, y: number): boolean => map.warps.some((w) => w.x === x && w.y === y);
  const triggerAt = (x: number, y: number): boolean => map.triggers.some((t) => x >= t.x && x < t.x + (t.w ?? 1) && y >= t.y && y < t.y + (t.h ?? 1));
  const lms = landmarksOf(map);

  // (a) every warp must be on a visible door tile (or the map edge)
  for (const w of map.warps) {
    if (!doors.has(`${w.x},${w.y}`) && !isEdge(map, w.x, w.y)) add(w.x, w.y, 'warp_not_on_door', `warp -> ${w.to} on '${tileAt(map, w.x, w.y) ?? 'void'}' shows no door`);
  }
  // (b) every visible door tile must do something
  for (const key of doors) {
    const [x, y] = key.split(',').map(Number) as [number, number];
    if (!warpAt(x, y) && !triggerAt(x, y)) add(x, y, 'door_without_warp', `door '${tileAt(map, x, y) ?? 'entrance'}' has no warp and no "porte fermée" trigger`);
    if (tileAt(map, x, y) !== 'exit_mat' && !walkable(map, x, y + 1) && !walkable(map, x - 1, y) && !walkable(map, x + 1, y)) add(x, y, 'door_blocked', 'nothing walkable in front of the door');
  }
  // landmark doors: warps in front of the face must sit exactly on the drawn door
  for (const l of lms) {
    const fp = LANDMARK_FOOTPRINT[l.name]!;
    const ent = entranceTile(l.name, l.ax, l.ay);
    if (!ent) continue;
    if (!warpAt(ent.x, ent.y)) add(ent.x, ent.y, 'entrance_without_warp', `${l.name} draws its door here but no warp is on this tile`);
    for (const w of map.warps)
      if (w.y === l.ay + 1 && w.x >= l.ax - fp.w + 1 && w.x <= l.ax && !(w.x === ent.x && w.y === ent.y))
        add(w.x, w.y, 'warp_beside_entrance', `${l.name} door is at (${ent.x},${ent.y}), warp is at (${w.x},${w.y})`);
  }

  // (c) landings: right in front of the door we come out of (or right inside the door we came in through), facing away from it
  for (const w of map.warps) {
    const target = maps.get(w.to);
    if (!target) continue;
    const tDoors = doorTiles(target);
    const cands = DIRS.filter(([, dx, dy]) => {
      const dxk = w.toX + dx;
      const dyk = w.toY + dy;
      const isD = tDoors.has(`${dxk},${dyk}`) || (isEdge(target, dxk, dyk) && target.warps.some((tw) => tw.x === dxk && tw.y === dyk));
      return isD && target.warps.some((tw) => tw.x === dxk && tw.y === dyk && tw.to === map.id);
    });
    if (cands.length === 0) {
      add(w.x, w.y, 'bad_landing', `lands at ${w.to} (${w.toX},${w.toY}) which is not next to a door leading back to ${map.id}`);
      continue;
    }
    // facing = direction from the door to the landing tile
    const want = cands.map(([, dx, dy]) => DIRS.find(([, ddx, ddy]) => ddx === -dx && ddy === -dy)![0]);
    if (w.facing && !want.includes(w.facing)) add(w.x, w.y, 'bad_facing', `lands at ${w.to} (${w.toX},${w.toY}) facing '${w.facing}', expected ${want.join('/')}`);
    if (!w.facing && (map.kind === 'interior' || target.kind === 'interior')) add(w.x, w.y, 'bad_facing', `warp to ${w.to} has no facing (expected ${want.join('/')})`);
  }
  return out;
}

export function auditDoors(maps: readonly MapDef[]): DoorIssue[] {
  const by = new Map(maps.map((m) => [m.id, m] as const));
  return maps.flatMap((m) => auditMap(m, by));
}

export { entranceOffset };
