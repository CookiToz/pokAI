// What a running story script may ask of the world (implemented by the Overworld scene).
import type { Direction } from '../data/types';

export interface WorldPort {
  warp(map: string, x: number, y: number, facing?: Direction): Promise<void>;
  moveNpc(npcId: string, path: Direction[]): Promise<void>;
  /** Re-evaluate NPC presence conditions after flags changed. */
  refreshNpcs(): void;
  // v0.5 cutscenes
  npcApproach(npcId: string): Promise<void>;
  npcLeave(npcId: string, to?: { x: number; y: number }, hide?: boolean): Promise<void>;
  camera(target: { x: number; y: number } | 'player', ms?: number): Promise<void>;
  emote(who: string, emote: string): Promise<void>;
  setCutscene(on: boolean): void;
}
