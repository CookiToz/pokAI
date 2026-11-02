// Pure playlist logic for ambient music (kept free of WebAudio so it can be unit-tested).
import type { TrackName } from './audio';

export type AmbientKind = 'city' | 'route' | 'interior' | 'dungeon';

/** Daytime = 07:00 to 19:59 local time. */
export const isDaytime = (hour: number): boolean => hour >= 7 && hour < 20;

/** Dedicated themes by map id: [day, night]. Maps not listed fall back to their kind's playlist. */
export const MAP_THEMES: Readonly<Record<string, readonly [TrackName, TrackName]>> = {
  latentia_city: ['latentia_city_day', 'latentia_city_night'],
  hugging_grove: ['hugging_grove_day', 'hugging_grove_night'],
  port_8080: ['port_8080_day', 'port_8080_night'],
  dunes_datacenters: ['dunes_datacenters_day', 'dunes_datacenters_night'],
  conformite_capitale: ['conformite_capitale_day', 'conformite_capitale_night'],
};

/** Ordered rotation for a map; the first entry is the one to start with. `mapId` selects a dedicated theme when one exists. */
export function playlistFor(kind: AmbientKind, hour: number, mapId?: string): TrackName[] {
  const theme = mapId ? MAP_THEMES[mapId] : undefined;
  if (theme) return isDaytime(hour) ? [theme[0], theme[1]] : [theme[1], theme[0]];
  if (mapId === 'temple_attention') return ['temple_attention'];
  switch (kind) {
    case 'city':
      return isDaytime(hour) ? ['city_day', 'city_night'] : ['city_night', 'city_day'];
    case 'route':
      return hour % 2 === 0 ? ['route_a', 'route_b'] : ['route_b', 'route_a'];
    case 'interior':
      return ['interior', 'hub'];
    case 'dungeon':
      return ['prison'];
  }
}

/** Seconds a track plays before the playlist moves on (2 to 3 minutes). */
export const rotationSeconds = (rand: number): number => 120 + 60 * Math.min(1, Math.max(0, rand));

export const nextIndex = (i: number, len: number): number => (len <= 0 ? 0 : (i + 1) % len);

/** Tracks that interrupt the world's ambient music and hand control back afterwards. */
export const isInterrupt = (t: TrackName): boolean => t.startsWith('battle_') || t === 'victory' || t === 'evolution';

/** One-shot jingles: they end by themselves. */
export const isJingle = (t: TrackName): boolean => t === 'victory' || t === 'evolution';
