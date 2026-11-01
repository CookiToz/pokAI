// Pure playlist logic for ambient music (kept free of WebAudio so it can be unit-tested).
import type { TrackName } from './audio';

export type AmbientKind = 'city' | 'route' | 'interior' | 'dungeon';

/** Daytime = 07:00 to 19:59 local time. */
export const isDaytime = (hour: number): boolean => hour >= 7 && hour < 20;

/** Ordered rotation for a map kind; the first entry is the one to start with. */
export function playlistFor(kind: AmbientKind, hour: number): TrackName[] {
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
