// Pure grid path-finding for scripted NPC movement (approach the player, leave the scene). No Phaser.
import type { V2 } from './movement';

export interface Grid {
  width: number;
  height: number;
  /** True when a character may stand on / walk through the tile. */
  walkable: (x: number, y: number) => boolean;
}

const STEPS: readonly V2[] = [
  { x: 0, y: 1 },
  { x: 1, y: 0 },
  { x: 0, y: -1 },
  { x: -1, y: 0 },
];

const inside = (g: Grid, x: number, y: number): boolean => x >= 0 && y >= 0 && x < g.width && y < g.height;

/** Flag set when an NPC left for good (`npc_leave … hide`): presence logic must keep it hidden. */
export const npcGoneFlag = (mapId: string, npcId: string): string => `npc_gone_${mapId}_${npcId}`;

/**
 * Breadth-first search from `from` to the nearest tile satisfying `isGoal` (4-way moves over walkable tiles; the start
 * tile is always allowed). Returns the tiles to step on, excluding the start, or null when unreachable.
 */
export function bfsPath(g: Grid, from: V2, isGoal: (x: number, y: number) => boolean): V2[] | null {
  if (isGoal(from.x, from.y)) return [];
  const key = (x: number, y: number): number => y * g.width + x;
  const prev = new Map<number, number>();
  prev.set(key(from.x, from.y), -1);
  const queue: V2[] = [from];
  for (let head = 0; head < queue.length; head++) {
    const cur = queue[head] as V2;
    for (const s of STEPS) {
      const nx = cur.x + s.x;
      const ny = cur.y + s.y;
      if (!inside(g, nx, ny) || prev.has(key(nx, ny)) || !g.walkable(nx, ny)) continue;
      prev.set(key(nx, ny), key(cur.x, cur.y));
      if (isGoal(nx, ny)) {
        const out: V2[] = [];
        for (let k = key(nx, ny); k !== -1 && k !== key(from.x, from.y); k = prev.get(k) as number) out.push({ x: k % g.width, y: Math.floor(k / g.width) });
        return out.reverse();
      }
      queue.push({ x: nx, y: ny });
    }
  }
  return null;
}

/** Path to the tile next to `target` (4-way adjacent, walkable) that is closest to `from`. Empty when already adjacent. */
export function approachPath(g: Grid, from: V2, target: V2): V2[] | null {
  const adjacent = (x: number, y: number): boolean => Math.abs(x - target.x) + Math.abs(y - target.y) === 1;
  return bfsPath(g, from, (x, y) => adjacent(x, y));
}

/** Path to the nearest tile that is a door/exit (`isExit`) or lies on the map edge, never the tile `avoid`. */
export function exitPath(g: Grid, from: V2, isExit: (x: number, y: number) => boolean, avoid?: V2): V2[] | null {
  const edge = (x: number, y: number): boolean => x === 0 || y === 0 || x === g.width - 1 || y === g.height - 1;
  return bfsPath(g, from, (x, y) => (x !== from.x || y !== from.y) && !(avoid && avoid.x === x && avoid.y === y) && (edge(x, y) || isExit(x, y)));
}
