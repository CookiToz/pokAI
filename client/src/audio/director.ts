// MusicDirector: decides which track plays, crossfades between rigs, rotates ambient playlists
// and hands control back to the world's ambient music after battles and jingles.
import type { TrackName } from './audio';
import type { AudioEngine } from './engine';
import { isInterrupt, isJingle, nextIndex, playlistFor, rotationSeconds, type AmbientKind } from './playlist';
import { TrackRig } from './rig';
import { TRACKS } from './tracks';

type Request = { type: 'track'; track: TrackName } | { type: 'ambient'; kind: AmbientKind } | null;

interface Playing {
  rig: TrackRig;
  name: TrackName;
  rotateAt: number; // context time; Infinity = never
  list: TrackName[];
  index: number;
}

const LOOKAHEAD = 0.6;
const TICK_MS = 120;

export class MusicDirector {
  private cur: Playing | null = null;
  private request: Request = null;
  private resume: Request = null;
  private timer = 0;

  constructor(private engine: AudioEngine, private hour: () => number = () => new Date().getHours()) {
    engine.onUnlock(() => {
      // Whatever was requested before the first gesture starts now (a stale jingle is skipped).
      const r = this.request;
      if (r?.type === 'track' && isJingle(r.track)) this.request = this.resume;
      this.apply(0.2);
    });
  }

  current(): TrackName | null {
    return this.cur?.name ?? null;
  }

  music(track: TrackName | null): void {
    if (track === null) {
      this.request = null;
      this.resume = null;
      this.stopCurrent(0.8);
      return;
    }
    const wasInterrupt = this.request?.type === 'track' && isInterrupt(this.request.track);
    if (isInterrupt(track)) {
      if (!wasInterrupt) this.resume = this.request;
    } else this.resume = null;
    if (!isJingle(track) && this.cur?.name === track && this.request?.type === 'track' && this.request.track === track) return;
    this.request = { type: 'track', track };
    this.apply(track === 'trailer' ? 0.3 : isInterrupt(track) ? 0.45 : 0.8);
  }

  ambient(kind: AmbientKind): void {
    this.resume = null;
    if (this.request?.type === 'ambient' && this.request.kind === kind && this.cur) return;
    this.request = { type: 'ambient', kind };
    this.apply(0.8);
  }

  /** Back to what the world was playing before a battle / jingle (no-op while a jingle is still playing). */
  resumeWorld(): void {
    const c = this.engine.ctx;
    if (c && this.cur && isJingle(this.cur.name) && c.currentTime < this.cur.rig.startTime + this.cur.rig.length + 0.4) return;
    const r = this.request;
    if (r?.type === 'track' && isInterrupt(r.track)) {
      this.request = this.resume;
      this.resume = null;
      this.apply(1.2);
    }
  }

  private apply(fade: number): void {
    const c = this.engine.ctx;
    if (!c) return; // not unlocked yet: the request is replayed on unlock
    const r = this.request;
    if (!r) return this.stopCurrent(fade);
    let list: TrackName[];
    let index = 0;
    if (r.type === 'track') list = [r.track];
    else {
      list = playlistFor(r.kind, this.hour());
      index = 0;
    }
    this.start(list, index, fade, r.type === 'ambient');
  }

  /** Seconds heard so far of the current track if it is `name` (output latency compensated), else null. Drives visual sync. */
  elapsed(name: TrackName): number | null {
    const c = this.engine.ctx;
    const cur = this.cur;
    if (!c || !cur || cur.name !== name || c.state !== 'running') return null;
    const latency = (c as AudioContext).outputLatency || c.baseLatency || 0;
    return c.currentTime - latency - cur.rig.startTime;
  }

  /** Restarts the current track `sec` seconds in (quick crossfade). No-op when `name` is not playing. */
  seek(name: TrackName, sec: number): void {
    if (this.cur?.name !== name || !this.engine.ctx) return;
    this.start([name], 0, 0.08, false, sec);
  }

  private start(list: TrackName[], index: number, fade: number, rotates: boolean, offset = 0): void {
    const c = this.engine.ctx;
    const bus = this.engine.musicBus;
    if (!c || !bus) return;
    const name = list[index]!;
    const old = this.cur;
    const t0 = c.currentTime + 0.06;
    const rig = new TrackRig(c, bus, TRACKS[name], t0 - offset, 1 + index);
    if (offset > 0) rig.seek(offset);
    rig.out.gain.setValueAtTime(0, c.currentTime);
    rig.out.gain.linearRampToValueAtTime(1, c.currentTime + Math.max(0.05, fade));
    this.cur = { rig, name, list, index, rotateAt: rotates && list.length > 0 ? t0 + rotationSeconds(Math.random()) : Infinity };
    rig.scheduleUntil(c.currentTime + LOOKAHEAD);
    old?.rig.fadeOut(Math.max(0.05, fade));
    this.ensureTimer();
  }

  private stopCurrent(fade: number): void {
    this.cur?.rig.fadeOut(fade);
    this.cur = null;
  }

  private ensureTimer(): void {
    if (this.timer || typeof window === 'undefined') return;
    this.timer = window.setInterval(() => this.tick(), TICK_MS);
  }

  private tick(): void {
    const c = this.engine.ctx;
    const cur = this.cur;
    if (!c || !cur || c.state !== 'running') return;
    try {
      cur.rig.scheduleUntil(c.currentTime + LOOKAHEAD);
      if (cur.rig.finished && c.currentTime > cur.rig.startTime + cur.rig.length + 0.4) {
        this.onJingleEnd();
      } else if (c.currentTime >= cur.rotateAt && cur.list.length > 1) {
        this.start(cur.list, nextIndex(cur.index, cur.list.length), 3, true);
      } else if (c.currentTime >= cur.rotateAt) {
        cur.rotateAt = c.currentTime + rotationSeconds(Math.random()); // single-track playlist keeps looping
      }
    } catch (err) {
      console.warn('[audio] tick failed', err);
    }
  }

  private onJingleEnd(): void {
    const next = this.resume;
    this.resume = null;
    this.request = next;
    if (next) this.apply(1.5);
    else this.stopCurrent(1.5);
  }
}
