// AudioEngine: the live AudioContext, gain buses, persisted volumes and first-gesture unlock.
// Everything is a safe no-op before unlock, in non-browser environments and when WebAudio is missing.

export type Channel = 'master' | 'music' | 'sfx';

const STORE_KEY = 'pokai.audio.v1';
/** Effects are synthesized quietly; this lifts the whole bus relative to the music. */
const SFX_TRIM = 2.2;
export const DEFAULT_VOLUMES: Readonly<Record<Channel, number>> = { master: 0.8, music: 0.5, sfx: 0.7 };

interface Persisted {
  master?: number;
  music?: number;
  sfx?: number;
  muted?: boolean;
}

const clamp01 = (v: number): number => (Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0);

export class AudioEngine {
  ctx: AudioContext | null = null;
  musicBus: GainNode | null = null;
  sfxBus: GainNode | null = null;
  private master: GainNode | null = null;
  private vol: Record<Channel, number> = { ...DEFAULT_VOLUMES };
  private muted = false;
  private createdAt = 0;
  private unlockCbs: (() => void)[] = [];
  private padTimer = 0;

  constructor() {
    this.load();
    if (typeof window === 'undefined') return;
    const go = (): void => this.unlock();
    const opts = { capture: true } as const;
    const events = ['keydown', 'pointerdown', 'mousedown', 'touchstart', 'click'] as const;
    this.detach = (): void => events.forEach((e) => window.removeEventListener(e, go, opts));
    events.forEach((e) => window.addEventListener(e, go, opts));
    // Controllers: poll for a pressed button (no DOM event fires for the first press in every browser).
    this.padTimer = window.setInterval(() => {
      if (this.ctx) return window.clearInterval(this.padTimer);
      const pads = navigator.getGamepads?.() ?? [];
      for (const p of pads) if (p?.buttons.some((b) => b.pressed)) return go();
    }, 300);
    document.addEventListener('visibilitychange', () => {
      const c = this.ctx;
      if (!c) return;
      if (document.hidden) void c.suspend().catch(() => undefined);
      else void c.resume().catch(() => undefined);
    });
  }

  private detach: () => void = () => undefined;

  /** True once the context exists and is (about to be) producing sound. */
  get ready(): boolean {
    const c = this.ctx;
    return !!c && (c.state === 'running' || performance.now() - this.createdAt < 500);
  }

  /** Called by the first user gesture. */
  unlock(): void {
    if (typeof window === 'undefined') return;
    try {
      if (!this.ctx) this.build();
      const c = this.ctx;
      if (!c) return;
      void c.resume().then(() => {
        if (c.state === 'running') {
          this.detach();
          window.clearInterval(this.padTimer);
        }
      }).catch(() => undefined);
    } catch {
      /* WebAudio unavailable or blocked */
    }
  }

  onUnlock(cb: () => void): void {
    if (this.ctx) cb();
    else this.unlockCbs.push(cb);
  }

  private build(): void {
    const Ctor: typeof AudioContext | undefined = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    const c = new Ctor({ latencyHint: 'interactive' });
    this.createdAt = performance.now();
    const master = c.createGain();
    const music = c.createGain();
    const sfx = c.createGain();
    // Soft glue compressor, then a brick-wall-ish safety limiter.
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.knee.value = 24;
    comp.ratio.value = 3;
    comp.attack.value = 0.012;
    comp.release.value = 0.25;
    const limiter = c.createDynamicsCompressor();
    limiter.threshold.value = -3;
    limiter.knee.value = 0;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.002;
    limiter.release.value = 0.08;
    music.connect(comp);
    sfx.connect(comp);
    comp.connect(master);
    master.connect(limiter);
    limiter.connect(c.destination);
    this.ctx = c;
    this.master = master;
    this.musicBus = music;
    this.sfxBus = sfx;
    this.applyVolumes(true);
    const cbs = this.unlockCbs.splice(0);
    cbs.forEach((cb) => cb());
  }

  // ------------------------------------------------------------------ volumes

  getVolume(ch: Channel): number {
    return this.vol[ch];
  }

  setVolume(ch: Channel, v: number): void {
    this.vol[ch] = clamp01(v);
    this.applyVolumes(false);
    this.save();
  }

  isMuted(): boolean {
    return this.muted;
  }

  setMuted(m: boolean): void {
    this.muted = m;
    this.applyVolumes(false);
    this.save();
  }

  private applyVolumes(instant: boolean): void {
    const c = this.ctx;
    if (!c || !this.master || !this.musicBus || !this.sfxBus) return;
    const set = (n: GainNode, v: number): void => {
      if (instant) n.gain.value = v;
      else n.gain.setTargetAtTime(v, c.currentTime, 0.03);
    };
    set(this.master, this.muted ? 0 : this.vol.master);
    set(this.musicBus, this.vol.music);
    set(this.sfxBus, this.vol.sfx * SFX_TRIM);
  }

  private load(): void {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return;
      const d = JSON.parse(raw) as Persisted;
      for (const ch of ['master', 'music', 'sfx'] as const) if (typeof d[ch] === 'number') this.vol[ch] = clamp01(d[ch]);
      this.muted = d.muted === true;
    } catch {
      /* storage blocked or corrupt: keep defaults */
    }
  }

  private save(): void {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({ ...this.vol, muted: this.muted }));
    } catch {
      /* ignore */
    }
  }
}
