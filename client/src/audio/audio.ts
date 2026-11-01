// Audio API (v0.3): 100 % procedural WebAudio, no files. Callers fire and forget;
// everything is a safe no-op before the first user gesture unlocks audio, or when WebAudio is missing.
import { AudioEngine, type Channel } from './engine';
import { MusicDirector } from './director';
import { MIN_GAP, RECIPES } from './sfx';
import type { AmbientKind } from './playlist';
import { TRAILER_CUES, type TrailerCue } from './trailer-cues';

export type SfxName =
  | 'ui_move' | 'ui_confirm' | 'ui_back' | 'ui_open' | 'ui_close' | 'ui_error' | 'type_tick'
  | 'step' | 'door' | 'alert' | 'encounter'
  | 'hit' | 'hit_super' | 'hit_weak' | 'crit' | 'miss' | 'status' | 'heal' | 'buff' | 'debuff' | 'faint'
  | 'xp' | 'level_up' | 'evolve' | 'onboard_card' | 'onboard_success' | 'onboard_fail' | 'cookie' | 'coin' | 'badge';

export type TrackName =
  | 'city_day' | 'city_night' | 'route_a' | 'route_b' | 'interior' | 'prison' | 'hub'
  | 'battle_wild' | 'battle_trainer' | 'battle_aiact' | 'battle_leader'
  | 'victory' | 'evolution' | 'title' | 'trailer';

export interface AudioApi {
  sfx(name: SfxName): void;
  /** Crossfades to a track (null = silence). Ambient tracks for a map kind may rotate automatically. */
  music(track: TrackName | null): void;
  /** Ambient playlist for a map kind: rotates between suitable tracks. */
  ambient(kind: 'city' | 'route' | 'interior' | 'dungeon'): void;
  setVolume(channel: 'master' | 'music' | 'sfx', v: number): void; // 0..1, persisted
  getVolume(channel: 'master' | 'music' | 'sfx'): number;
  /** After a battle / jingle: returns to the ambient music that was playing before (no-op if a jingle is still running). */
  resume(): void;
  setMuted(muted: boolean): void;
  isMuted(): boolean;
  /** Track currently playing (debug / jukebox). */
  nowPlaying(): TrackName | null;
  /** True once the AudioContext exists and runs (the trailer only syncs to the music clock when this is true). */
  unlocked(): boolean;
  /** Hit times of the `trailer` track (title slams, drop, final), in seconds from its start. */
  trailerCues(): readonly TrailerCue[];
  /** Seconds heard of the `trailer` track (output-latency compensated), or null when it is not playing / audio is locked. */
  trailerClock(): number | null;
  /** Jumps the playing `trailer` track to `sec` seconds (used when the player skips to the next shot). */
  trailerSeek(sec: number): void;
}

const engine = new AudioEngine();
const director = new MusicDirector(engine);
const lastPlayed = new Map<SfxName, number>();
let rngSeed = 7;
const rand = (): number => {
  rngSeed = (rngSeed * 1664525 + 1013904223) >>> 0;
  return rngSeed / 4294967296;
};

export const audio: AudioApi = {
  sfx(name) {
    const c = engine.ctx;
    const bus = engine.sfxBus;
    if (!c || !bus || !engine.ready) return;
    try {
      const now = c.currentTime;
      const gap = MIN_GAP[name] ?? 0.02;
      const last = lastPlayed.get(name);
      if (last !== undefined && now - last < gap) return;
      lastPlayed.set(name, now);
      RECIPES[name](c, bus, now + 0.005, rand);
    } catch (err) {
      console.warn('[audio] sfx failed', name, err);
    }
  },
  music: (track) => director.music(track),
  ambient: (kind: AmbientKind) => director.ambient(kind),
  setVolume: (ch: Channel, v) => engine.setVolume(ch, v),
  getVolume: (ch: Channel) => engine.getVolume(ch),
  resume: () => director.resumeWorld(),
  setMuted: (m) => engine.setMuted(m),
  isMuted: () => engine.isMuted(),
  nowPlaying: () => director.current(),
  unlocked: () => !!engine.ctx && engine.ctx.state === 'running',
  trailerCues: () => TRAILER_CUES,
  trailerClock: () => director.elapsed('trailer'),
  trailerSeek: (sec) => director.seek('trailer', sec),
};

/** Internals for the dev jukebox / offline level checks only. */
export const audioInternals = { engine, director };

// Dev only: ?jukebox panel and offline level checks (tree-shaken out of production builds).
if (import.meta.env.DEV && typeof location !== 'undefined' && /[?&](jukebox|audiotest)\b/.test(location.search)) {
  void import('./preview');
}
