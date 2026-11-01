import type { ArtEntry } from './kit';
import { characterEntries } from './characters';
import { buildTileArt } from './tiles';
import { packetEntries } from './landmarks';

export function allArtEntries(): ArtEntry[] {
  return [...buildTileArt(), ...packetEntries(), ...characterEntries()];
}
export { TILE_TEX_W } from './kit';
export type { ArtEntry } from './kit';
export { packetEntries } from './landmarks';
export { CITY_VARIANTS } from './city';
export { ENTRANCE_OFFSET, entranceOffset, entranceTile } from './entrances';
export { CHAR_H, STOREY_PX, DOOR_H, DOOR_W } from './kit';
