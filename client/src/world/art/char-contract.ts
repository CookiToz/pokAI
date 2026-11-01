// Character art contract (v0.3) between world/art/characters.ts (art) and world/textures.ts + overworld (engine).
//
// characters.ts must export:
//   CHARACTER_IDS: string[]
//   characterEntries(): ArtEntry[]   with one entry per key below, all CHAR_W x CHAR_H, anchorY = feet.
// Keys: `char:<id>:<view>:<frame>`
//   view  = 'front' (moving toward screen-down) | 'back' (screen-up) | 'side' (facing screen-right; engine mirrors for left)
//   frame = 0 idle, 1..4 walk cycle (contact, down, contact, up — engine loops 1→4 at ~8 fps while moving)
// Diagonal movement picks the view of the dominant axis (|dy| >= |dx| → front/back, else side).
export const CHAR_VIEWS = ['front', 'back', 'side'] as const;
export type CharView = (typeof CHAR_VIEWS)[number];
export const WALK_FRAMES = 4;
export const charKey = (id: string, view: CharView, frame: number): string => `char:${id}:${view}:${frame}`;

// v0.4 — customisable player. characters.ts must also export:
//   HAIR_STYLES: { id: string; label: string; body?: 'masc' | 'fem' }[]   ACCESSORIES: { id: string; label: string }[]
//   SKIN_TONES: string[]   HAIR_COLORS: string[]   OUTFIT_COLORS: string[]   DEFAULT_APPEARANCE: PlayerAppearance
//   playerEntries(a: PlayerAppearance): ArtEntry[]   // same keys as the 'player' id: char:player:<view>:<frame>
//   playerPortraitSvg(a: PlayerAppearance): string   // 128x128 bust, used by dialogue/menus when speaker is the player
// The engine rebuilds the player textures from game.state.appearance (fallback DEFAULT_APPEARANCE).
