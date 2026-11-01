// Vector art contract. Every sprite is a complete SVG string authored in code (no binary assets).
//
// Style rules (CLAUDE.md §5): flat fills only (no gradients, no filters, no blur),
// ink outline #1d1a2b with stroke-width 3 (at viewBox 128), at most 6 fills per sprite
// taken from the riso palette + the model's brand colour, ONE offset "misregistration"
// shadow layer (same silhouette, shifted +4,+4, in --pink or --blue at 100% opacity, behind).
// Light comes from the top-left. Shapes are geometric and bold — readable at 64px.

/** PokAI battle art: viewBox "0 0 128 128", creature centred, feet on y≈118. */
export type PokaiSvg = string;

/** Dialogue portrait (bust): viewBox "0 0 128 128". */
export type PortraitSvg = string;

export interface PokaiArtModule {
  POKAI: Record<string, PokaiSvg>; // formId -> svg
}

export interface PortraitArtModule {
  PORTRAITS: Record<string, PortraitSvg>; // character id -> svg
}
