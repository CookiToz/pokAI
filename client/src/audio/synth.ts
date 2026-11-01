// Procedural instruments and shared DSP helpers. Everything takes a BaseAudioContext so the same code
// plays live (AudioContext) and renders offline (OfflineAudioContext) for level checks.

export interface VoiceEnv {
  ctx: BaseAudioContext;
  out: AudioNode;
  noise: AudioBuffer;
}

export type VoiceParams = Readonly<Record<string, number>>;
/** (env, start time, frequency, duration in s, velocity 0..1, params) */
export type Voice = (e: VoiceEnv, t: number, f: number, dur: number, vel: number, p: VoiceParams) => void;

const FLOOR = 0.0001;

// ------------------------------------------------------------------ helpers

const noiseCache = new WeakMap<BaseAudioContext, AudioBuffer>();
export function noiseBuffer(ctx: BaseAudioContext): AudioBuffer {
  let b = noiseCache.get(ctx);
  if (!b) {
    b = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 2), ctx.sampleRate);
    const d = b.getChannelData(0);
    let seed = 1234567;
    for (let i = 0; i < d.length; i++) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      d[i] = (seed / 0xffffffff) * 2 - 1;
    }
    noiseCache.set(ctx, b);
  }
  return b;
}

const irCache = new WeakMap<BaseAudioContext, Map<string, AudioBuffer>>();
/** Stereo exponentially-decaying noise impulse, darkened over time: a cheap, smooth room/plate. */
export function impulse(ctx: BaseAudioContext, seconds: number, decay = 3): AudioBuffer {
  let m = irCache.get(ctx);
  if (!m) irCache.set(ctx, (m = new Map()));
  const key = `${seconds}:${decay}`;
  let b = m.get(key);
  if (b) return b;
  const len = Math.floor(ctx.sampleRate * seconds);
  b = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = b.getChannelData(c);
    let seed = 987654 + c * 7919;
    let lp = 0;
    for (let i = 0; i < len; i++) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      const n = (seed / 0xffffffff) * 2 - 1;
      const k = i / len;
      lp += (n - lp) * (0.75 - 0.6 * k); // progressively darker tail
      d[i] = lp * Math.pow(1 - k, decay) * (i < 40 ? i / 40 : 1);
    }
  }
  m.set(key, b);
  return b;
}

export function gainNode(ctx: BaseAudioContext, v = 1): GainNode {
  const g = ctx.createGain();
  g.gain.value = v;
  return g;
}

function osc(ctx: BaseAudioContext, type: OscillatorType, f: number, t: number, end: number, detune = 0): OscillatorNode {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  if (detune) o.detune.value = detune;
  o.start(t);
  o.stop(end);
  return o;
}

function noiseSrc(e: VoiceEnv, t: number, end: number): AudioBufferSourceNode {
  const s = e.ctx.createBufferSource();
  s.buffer = e.noise;
  s.loop = true;
  s.start(t, (t * 0.37) % 1.5);
  s.stop(end);
  return s;
}

function filter(ctx: BaseAudioContext, type: BiquadFilterType, f: number, q = 0.7): BiquadFilterNode {
  const b = ctx.createBiquadFilter();
  b.type = type;
  b.frequency.value = f;
  b.Q.value = q;
  return b;
}

/** Attack / decay-to-sustain / release on a gain param. Returns the time the sound is fully silent. */
function adsr(g: AudioParam, t: number, dur: number, peak: number, a: number, d: number, s: number, r: number): number {
  const hold = Math.max(dur, a + 0.01);
  g.setValueAtTime(FLOOR, t);
  g.linearRampToValueAtTime(peak, t + a);
  g.exponentialRampToValueAtTime(Math.max(FLOOR, peak * s), t + a + d);
  g.setValueAtTime(Math.max(FLOOR, peak * s), Math.max(t + a + d, t + hold));
  g.exponentialRampToValueAtTime(FLOOR, t + hold + r);
  return t + hold + r + 0.02;
}

/** One-shot percussive envelope: instant-ish attack, exponential decay. */
function perc(g: AudioParam, t: number, peak: number, decay: number, attack = 0.002): number {
  g.setValueAtTime(FLOOR, t);
  g.linearRampToValueAtTime(peak, t + attack);
  g.exponentialRampToValueAtTime(FLOOR, t + attack + decay);
  return t + attack + decay + 0.02;
}

function chain(...nodes: AudioNode[]): void {
  for (let i = 0; i < nodes.length - 1; i++) nodes[i]!.connect(nodes[i + 1]!);
}

// ------------------------------------------------------------------ melodic voices

/** Warm detuned saw pad with a slowly opening low-pass. p: cut (Hz), a (attack s), r (release s) */
const pad: Voice = (e, t, f, dur, vel, p) => {
  const c = e.ctx;
  const a = p.a ?? 0.45;
  const r = p.r ?? 1.1;
  const end = t + Math.max(dur, 0.2) + r + 0.1;
  const g = gainNode(c, 0);
  const lp = filter(c, 'lowpass', p.cut ?? 900, 0.4);
  lp.frequency.setValueAtTime((p.cut ?? 900) * 0.55, t);
  lp.frequency.linearRampToValueAtTime(p.cut ?? 900, t + a + 0.6);
  for (const d of [-9, 0, 9]) chain(osc(c, 'sawtooth', f, t, end, d), g);
  chain(osc(c, 'sine', f / 2, t, end), gainNode(c, 0.6), g);
  adsr(g.gain, t, dur, 0.045 * vel, a, 0.4, 0.8, r);
  chain(g, lp, e.out);
};

/** Electric-piano: FM tine over a sine body. */
const epiano: Voice = (e, t, f, dur, vel, p) => {
  const c = e.ctx;
  const decay = (p.decay ?? 1.5) * (f < 200 ? 1.4 : 1);
  const end = t + decay + 0.3;
  const out = gainNode(c, 0);
  const lp = filter(c, 'lowpass', p.cut ?? 3200, 0.5);
  const carrier = osc(c, 'sine', f, t, end);
  const mod = osc(c, 'sine', f * 2, t, end);
  const idx = gainNode(c, 0);
  idx.gain.setValueAtTime(f * 1.4 * (0.5 + vel), t);
  idx.gain.exponentialRampToValueAtTime(Math.max(1, f * 0.08), t + 0.35);
  chain(mod, idx);
  idx.connect(carrier.frequency);
  const body = osc(c, 'triangle', f, t, end);
  const bg = gainNode(c, 0.35);
  chain(body, bg, out);
  chain(carrier, out);
  perc(out.gain, t, 0.15 * vel, decay, 0.004);
  chain(out, lp, e.out);
  void dur;
};

/** Soft glassy pluck (triangle + sine octave): good for melodies, ignores note length. */
const glass: Voice = (e, t, f, _dur, vel, p) => {
  const c = e.ctx;
  const decay = p.decay ?? 0.9;
  const end = t + decay + 0.2;
  const out = gainNode(c, 0);
  const lp = filter(c, 'lowpass', p.cut ?? 4200, 0.5);
  chain(osc(c, 'triangle', f, t, end), out);
  chain(osc(c, 'sine', f * 2, t, end), gainNode(c, 0.25), out);
  chain(osc(c, 'sine', f * 3.01, t, end), gainNode(c, 0.06), out);
  perc(out.gain, t, 0.12 * vel, decay, 0.006);
  chain(out, lp, e.out);
};

/** Bell / music box: inharmonic sine partials with separate decays. */
const bell: Voice = (e, t, f, _dur, vel, p) => {
  const c = e.ctx;
  const decay = p.decay ?? 1.8;
  const partials: [number, number, number][] = [[1, 1, 1], [2.76, 0.28, 0.45], [5.4, 0.1, 0.2], [8.9, 0.04, 0.1]];
  const out = gainNode(c, 1);
  for (const [ratio, amp, dk] of partials) {
    const g = gainNode(c, 0);
    const fr = f * ratio;
    if (fr > 11000) continue;
    chain(osc(c, 'sine', fr, t, t + decay * dk + 0.1), g, out);
    perc(g.gain, t, 0.09 * amp * vel, decay * dk, 0.002);
  }
  out.connect(e.out);
};

/** Plucked saw/square through a closing low-pass. p: wave (0 saw, 1 square), cut, decay */
const pluck: Voice = (e, t, f, _dur, vel, p) => {
  const c = e.ctx;
  const decay = p.decay ?? 0.28;
  const end = t + decay + 0.15;
  const out = gainNode(c, 0);
  const lp = filter(c, 'lowpass', 400, 2.2);
  const cut = (p.cut ?? 2600) * (0.55 + vel * 0.6);
  lp.frequency.setValueAtTime(cut, t);
  lp.frequency.exponentialRampToValueAtTime(Math.max(300, cut * 0.15), t + decay);
  chain(osc(c, p.wave === 1 ? 'square' : 'sawtooth', f, t, end), out);
  chain(osc(c, 'sawtooth', f, t, end, 7), gainNode(c, 0.5), out);
  perc(out.gain, t, 0.07 * vel, decay, 0.003);
  chain(out, lp, e.out);
};

/** Round bass: saw + triangle through a low-pass, sine sub. p: cut, sub */
const bass: Voice = (e, t, f, dur, vel, p) => {
  const c = e.ctx;
  const len = Math.min(Math.max(dur, 0.08), p.max ?? 1.6);
  const end = t + len + 0.2;
  const out = gainNode(c, 0);
  const lp = filter(c, 'lowpass', 300, 1.2);
  const cut = p.cut ?? 520;
  lp.frequency.setValueAtTime(cut * 1.8, t);
  lp.frequency.exponentialRampToValueAtTime(cut * 0.55, t + 0.2);
  chain(osc(c, 'sawtooth', f, t, end), gainNode(c, 0.45), lp);
  chain(osc(c, 'triangle', f, t, end), gainNode(c, 0.5), lp);
  chain(osc(c, 'sine', f, t, end), gainNode(c, p.sub ?? 0.6), out);
  lp.connect(out);
  adsr(out.gain, t, len * 0.92, 0.2 * vel, 0.01, 0.12, 0.65, 0.09);
  out.connect(e.out);
};

/** Sustained lead: triangle + saw, delayed vibrato. p: cut, vib (cents) */
const lead: Voice = (e, t, f, dur, vel, p) => {
  const c = e.ctx;
  const len = Math.max(dur, 0.08);
  const end = t + len + 0.3;
  const out = gainNode(c, 0);
  const lp = filter(c, 'lowpass', p.cut ?? 2400, 0.7);
  const o1 = osc(c, 'triangle', f, t, end);
  const o2 = osc(c, 'sawtooth', f, t, end, 5);
  const lfo = osc(c, 'sine', 5.2, t, end);
  const depth = gainNode(c, 0);
  depth.gain.setValueAtTime(0, t);
  depth.gain.linearRampToValueAtTime(p.vib ?? 7, t + Math.min(0.5, len));
  chain(lfo, depth);
  depth.connect(o1.detune);
  depth.connect(o2.detune);
  chain(o1, out);
  chain(o2, gainNode(c, 0.35), out);
  adsr(out.gain, t, len, 0.085 * vel, 0.02, 0.1, 0.75, 0.14);
  chain(out, lp, e.out);
};

/** Short brass-like stab: stacked saws, quick filter sweep. p: cut */
const stab: Voice = (e, t, f, dur, vel, p) => {
  const c = e.ctx;
  const len = Math.min(Math.max(dur, 0.1), 0.5);
  const end = t + len + 0.25;
  const out = gainNode(c, 0);
  const lp = filter(c, 'lowpass', 400, 1.1);
  const cut = (p.cut ?? 2200) * (0.6 + vel * 0.5);
  lp.frequency.setValueAtTime(cut, t);
  lp.frequency.exponentialRampToValueAtTime(Math.max(320, cut * 0.22), t + len);
  for (const d of [-12, 0, 12]) chain(osc(c, 'sawtooth', f, t, end, d), out);
  adsr(out.gain, t, len, 0.032 * vel, 0.008, 0.08, 0.5, 0.12);
  chain(out, lp, e.out);
};

/** Drone / rumble: low sines and a dark saw. p: cut */
const drone: Voice = (e, t, f, dur, vel, p) => {
  const c = e.ctx;
  const r = 1.6;
  const end = t + dur + r + 0.2;
  const out = gainNode(c, 0);
  const lp = filter(c, 'lowpass', p.cut ?? 260, 0.6);
  chain(osc(c, 'sawtooth', f, t, end, -6), lp);
  chain(osc(c, 'sawtooth', f * 1.005, t, end, 6), lp);
  chain(osc(c, 'sine', f, t, end), gainNode(c, 1.2), out);
  lp.connect(out);
  adsr(out.gain, t, dur, 0.06 * vel, 1.2, 0.5, 0.85, r);
  out.connect(e.out);
};

/** Filtered noise riser. dur sets the length of the sweep. */
const riser: Voice = (e, t, _f, dur, vel) => {
  const c = e.ctx;
  const end = t + dur + 0.3;
  const bp = filter(c, 'bandpass', 300, 1.5);
  bp.frequency.setValueAtTime(300, t);
  bp.frequency.exponentialRampToValueAtTime(5000, t + dur);
  const g = gainNode(c, 0);
  g.gain.setValueAtTime(FLOOR, t);
  g.gain.exponentialRampToValueAtTime(0.16 * vel, t + dur * 0.97);
  g.gain.exponentialRampToValueAtTime(FLOOR, t + dur + 0.25);
  chain(noiseSrc(e, t, end), bp, g, e.out);
};

// ------------------------------------------------------------------ percussion

const kick: Voice = (e, t, _f, _d, vel, p) => {
  const c = e.ctx;
  const body = osc(c, 'sine', 140, t, t + 0.5);
  body.frequency.exponentialRampToValueAtTime(p.low ?? 46, t + 0.13);
  const g = gainNode(c, 0);
  perc(g.gain, t, 0.5 * vel, p.decay ?? 0.3, 0.002);
  chain(body, g, e.out);
  const click = filter(c, 'highpass', 1800);
  const cg = gainNode(c, 0);
  perc(cg.gain, t, 0.05 * vel, 0.012, 0.001);
  chain(noiseSrc(e, t, t + 0.05), click, cg, e.out);
};

const snare: Voice = (e, t, _f, _d, vel, p) => {
  const c = e.ctx;
  const bp = filter(c, 'bandpass', p.tone ?? 1900, 0.7);
  const g = gainNode(c, 0);
  perc(g.gain, t, 0.2 * vel, p.decay ?? 0.17, 0.002);
  chain(noiseSrc(e, t, t + 0.3), bp, g, e.out);
  const body = osc(c, 'triangle', 190, t, t + 0.2);
  body.frequency.exponentialRampToValueAtTime(130, t + 0.1);
  const bg = gainNode(c, 0);
  perc(bg.gain, t, 0.16 * vel, 0.1, 0.002);
  chain(body, bg, e.out);
};

const clap: Voice = (e, t, _f, _d, vel) => {
  const c = e.ctx;
  const bp = filter(c, 'bandpass', 1300, 0.9);
  const g = gainNode(c, 0);
  g.gain.setValueAtTime(FLOOR, t);
  for (const off of [0, 0.012, 0.024]) {
    g.gain.linearRampToValueAtTime(0.16 * vel, t + off + 0.002);
    g.gain.exponentialRampToValueAtTime(0.03, t + off + 0.01);
  }
  g.gain.linearRampToValueAtTime(0.14 * vel, t + 0.03);
  g.gain.exponentialRampToValueAtTime(FLOOR, t + 0.2);
  chain(noiseSrc(e, t, t + 0.3), bp, g, e.out);
};

const hat: Voice = (e, t, _f, _d, vel, p) => {
  const c = e.ctx;
  const open = vel > 0.95 && (p.open ?? 1) > 0;
  const hp = filter(c, 'highpass', 6500, 0.6);
  const lp = filter(c, 'lowpass', 11000, 0.5);
  const g = gainNode(c, 0);
  perc(g.gain, t, 0.05 * vel, open ? 0.17 : 0.045, 0.001);
  chain(noiseSrc(e, t, t + 0.3), hp, lp, g, e.out);
};

const shaker: Voice = (e, t, _f, _d, vel) => {
  const c = e.ctx;
  const bp = filter(c, 'bandpass', 5800, 0.9);
  const g = gainNode(c, 0);
  perc(g.gain, t, 0.055 * vel, 0.07, 0.014);
  chain(noiseSrc(e, t, t + 0.2), bp, g, e.out);
};

const rim: Voice = (e, t, _f, _d, vel) => {
  const c = e.ctx;
  const g = gainNode(c, 0);
  perc(g.gain, t, 0.1 * vel, 0.03, 0.001);
  chain(osc(c, 'triangle', 1650, t, t + 0.08), g, e.out);
  const hp = filter(c, 'bandpass', 3800, 1);
  const ng = gainNode(c, 0);
  perc(ng.gain, t, 0.07 * vel, 0.02, 0.001);
  chain(noiseSrc(e, t, t + 0.06), hp, ng, e.out);
};

/** Typewriter key: tiny noise click; accents add a carriage-return ding. */
const typewriter: Voice = (e, t, _f, _d, vel) => {
  const c = e.ctx;
  const bp = filter(c, 'bandpass', 3200 + vel * 500, 2.5);
  const g = gainNode(c, 0);
  perc(g.gain, t, 0.12 * vel, 0.012, 0.0008);
  chain(noiseSrc(e, t, t + 0.05), bp, g, e.out);
  const thud = osc(c, 'sine', 210, t, t + 0.06);
  const tg = gainNode(c, 0);
  perc(tg.gain, t, 0.05 * vel, 0.03, 0.001);
  chain(thud, tg, e.out);
  if (vel > 0.95) bell(e, t + 0.04, 2637, 0.4, 0.8, { decay: 1.1 });
};

/** Rubber-stamp thud: low pitch drop + paper slap. */
const stamp: Voice = (e, t, _f, _d, vel) => {
  const c = e.ctx;
  const body = osc(c, 'sine', 120, t, t + 0.4);
  body.frequency.exponentialRampToValueAtTime(48, t + 0.1);
  const g = gainNode(c, 0);
  perc(g.gain, t, 0.45 * vel, 0.22, 0.002);
  chain(body, g, e.out);
  const lp = filter(c, 'lowpass', 1400, 0.6);
  const ng = gainNode(c, 0);
  perc(ng.gain, t, 0.16 * vel, 0.07, 0.001);
  chain(noiseSrc(e, t, t + 0.15), lp, ng, e.out);
};

/** Water drop / sonar blip. */
const drip: Voice = (e, t, f, _d, vel) => {
  const c = e.ctx;
  const o = osc(c, 'sine', f, t, t + 0.3);
  o.frequency.exponentialRampToValueAtTime(f * 1.6, t + 0.05);
  const g = gainNode(c, 0);
  perc(g.gain, t, 0.12 * vel, 0.16, 0.002);
  chain(o, g, e.out);
};

/** Cinematic BRAAM: detuned saw stack plus a square an octave up through a swelling low-pass, soft-clipped, over a sine sub (same pitch). p: cut */
const braam: Voice = (e, t, f, dur, vel, p) => {
  const c = e.ctx;
  const len = Math.max(dur, 0.4);
  const r = 1.0;
  const end = t + len + r + 0.2;
  const out = gainNode(c, 0);
  const lp = filter(c, 'lowpass', 300, 1.4);
  const cut = p.cut ?? 1500;
  lp.frequency.setValueAtTime(cut * 0.2, t);
  lp.frequency.exponentialRampToValueAtTime(cut, t + 0.09);
  lp.frequency.exponentialRampToValueAtTime(cut * 0.18, t + len);
  const clip = c.createWaveShaper();
  const curve = new Float32Array(512);
  for (let i = 0; i < curve.length; i++) curve[i] = Math.tanh((i / (curve.length - 1) * 2 - 1) * 2.2);
  clip.curve = curve;
  for (const d of [-18, -7, 0, 7, 18]) chain(osc(c, 'sawtooth', f, t, end, d), gainNode(c, 0.3), lp);
  chain(osc(c, 'square', f * 2, t, end, 4), gainNode(c, 0.1), lp);
  chain(lp, clip, out);
  chain(osc(c, 'sine', f, t, end), gainNode(c, 0.7), out);
  adsr(out.gain, t, len, 0.16 * vel, 0.025, 0.35, 0.5, r);
  out.connect(e.out);
};

/** Trailer impact: low boom, sub tail and a long filtered noise crash. p: len (s), amp */
const impact: Voice = (e, t, _f, _d, vel, p) => {
  const c = e.ctx;
  const L = p.len ?? 1.3;
  const k = (p.amp ?? 1) * vel;
  const boom = osc(c, 'sine', 120, t, t + L + 0.2);
  boom.frequency.exponentialRampToValueAtTime(34, t + 0.28);
  const bg = gainNode(c, 0);
  perc(bg.gain, t, 0.55 * k, L * 0.8, 0.002);
  chain(boom, bg, e.out);
  const sub = osc(c, 'sine', 40, t, t + L * 1.3 + 0.2);
  const sg = gainNode(c, 0);
  perc(sg.gain, t, 0.3 * k, L * 1.2, 0.012);
  chain(sub, sg, e.out);
  const bp = filter(c, 'bandpass', 2000, 0.8);
  bp.frequency.setValueAtTime(2000, t);
  bp.frequency.exponentialRampToValueAtTime(170, t + L * 0.8);
  const ng = gainNode(c, 0);
  perc(ng.gain, t, 0.22 * k, L * 0.9, 0.004);
  chain(noiseSrc(e, t, t + L + 0.2), bp, ng, e.out);
  const hp = filter(c, 'highpass', 3200, 0.6);
  const cg = gainNode(c, 0);
  perc(cg.gain, t, 0.07 * k, 0.14, 0.001);
  chain(noiseSrc(e, t, t + 0.3), hp, cg, e.out);
};

/** Watch tick: tiny band-passed click over a high blip; accents add a lower tock. */
const tick: Voice = (e, t, _f, _d, vel) => {
  const c = e.ctx;
  const bp = filter(c, 'bandpass', 4200, 3);
  const g = gainNode(c, 0);
  perc(g.gain, t, 0.1 * vel, 0.02, 0.0008);
  chain(noiseSrc(e, t, t + 0.06), bp, g, e.out);
  const o = osc(c, 'sine', vel > 0.95 ? 880 : 1650, t, t + 0.12);
  const og = gainNode(c, 0);
  perc(og.gain, t, (vel > 0.95 ? 0.09 : 0.045) * vel, vel > 0.95 ? 0.06 : 0.03, 0.001);
  chain(o, og, e.out);
};

export type InstName =
  | 'pad' | 'epiano' | 'glass' | 'bell' | 'pluck' | 'bass' | 'lead' | 'stab' | 'drone' | 'riser'
  | 'kick' | 'snare' | 'clap' | 'hat' | 'shaker' | 'rim' | 'typewriter' | 'stamp' | 'drip' | 'braam' | 'impact' | 'tick';

export const VOICES: Readonly<Record<InstName, Voice>> = {
  pad, epiano, glass, bell, pluck, bass, lead, stab, drone, riser,
  kick, snare, clap, hat, shaker, rim, typewriter, stamp, drip, braam, impact, tick,
};

/** Percussive instruments use the compact one-char-per-step pattern form. */
export const DRUM_INSTS: ReadonlySet<InstName> = new Set<InstName>(['kick', 'snare', 'clap', 'hat', 'shaker', 'rim', 'typewriter', 'stamp', 'impact', 'tick']);

// ------------------------------------------------------------------ sound effect primitives

export interface ToneOpts {
  type?: OscillatorType;
  f0: number;
  f1?: number;
  /** Time to reach f1 (default: dur). */
  glide?: number;
  dur: number;
  gain: number;
  attack?: number;
  cut?: number;
  q?: number;
  /** Vibrato: [Hz, cents]. */
  vib?: [number, number];
  detune?: number;
}

export function tone(c: BaseAudioContext, out: AudioNode, t: number, o: ToneOpts): void {
  const end = t + o.dur + 0.1;
  const osci = osc(c, o.type ?? 'sine', o.f0, t, end, o.detune ?? 0);
  if (o.f1 !== undefined) osci.frequency.exponentialRampToValueAtTime(Math.max(20, o.f1), t + (o.glide ?? o.dur));
  if (o.vib) {
    const l = osc(c, 'sine', o.vib[0], t, end);
    const d = gainNode(c, o.vib[1]);
    chain(l, d);
    d.connect(osci.detune);
  }
  const g = gainNode(c, 0);
  perc(g.gain, t, o.gain, o.dur, o.attack ?? 0.004);
  if (o.cut) chain(osci, filter(c, 'lowpass', o.cut, o.q ?? 0.7), g, out);
  else chain(osci, g, out);
}

export interface NoiseOpts {
  type?: BiquadFilterType;
  f0: number;
  f1?: number;
  q?: number;
  dur: number;
  gain: number;
  attack?: number;
}

export function noiseHit(c: BaseAudioContext, out: AudioNode, t: number, o: NoiseOpts): void {
  const e: VoiceEnv = { ctx: c, out, noise: noiseBuffer(c) };
  const f = filter(c, o.type ?? 'bandpass', o.f0, o.q ?? 1);
  f.frequency.setValueAtTime(o.f0, t);
  if (o.f1 !== undefined) f.frequency.exponentialRampToValueAtTime(Math.max(40, o.f1), t + o.dur);
  const g = gainNode(c, 0);
  perc(g.gain, t, o.gain, o.dur, o.attack ?? 0.003);
  chain(noiseSrc(e, t, t + o.dur + 0.1), f, g, out);
}
