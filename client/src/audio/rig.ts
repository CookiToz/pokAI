// TrackRig: plays one TrackDef on any BaseAudioContext (live or offline).
// Owns the per-track effects (reverb + dotted echo), schedules notes ahead of time and fades out on request.
import { compileLayer, midiToFreq, stepDuration, stepTime, STEPS_PER_BAR, type StepEvent } from './sequencer';
import { DRUM_INSTS, VOICES, gainNode, impulse, noiseBuffer, type InstName, type VoiceEnv } from './synth';

export interface LayerDef {
  inst: InstName;
  /** One string per bar (cycled over the track length). */
  pat: readonly string[];
  gain?: number;
  /** Reverb send 0..1 */
  rev?: number;
  /** Echo send 0..1 */
  dly?: number;
  pan?: number;
  /** One char per track bar: 'x' = layer plays, anything else = silent. */
  on?: string;
  p?: Readonly<Record<string, number>>;
}

export interface TrackDef {
  bpm: number;
  swing?: number;
  bars: number;
  loop: boolean;
  /** Overall level trim. */
  gain: number;
  /** Echo delay in steps (default 3 = dotted eighth). */
  echo?: number;
  echoFeedback?: number;
  reverb?: { seconds: number; mix: number };
  layers: readonly LayerDef[];
}

interface CompiledLayer {
  def: LayerDef;
  table: (StepEvent | null)[];
  input: GainNode;
  env: VoiceEnv;
}

/** Small deterministic PRNG so renders are reproducible. */
function mulberry(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class TrackRig {
  /** Fade this to crossfade; connect to the destination. */
  readonly out: GainNode;
  readonly stepDur: number;
  readonly totalSteps: number;
  private nodes: AudioNode[] = [];
  private layers: CompiledLayer[] = [];
  private next = 0;
  private rand: () => number;
  private stopped = false;

  constructor(private ctx: BaseAudioContext, dest: AudioNode, readonly def: TrackDef, readonly startTime: number, seed = 1) {
    this.rand = mulberry(seed);
    this.stepDur = stepDuration(def.bpm);
    this.totalSteps = def.bars * STEPS_PER_BAR;
    this.out = gainNode(ctx, 1);
    this.out.connect(dest);

    const mix = gainNode(ctx, def.gain);
    mix.connect(this.out);
    const rv = def.reverb ?? { seconds: 2.4, mix: 0.45 };
    const conv = ctx.createConvolver();
    conv.buffer = impulse(ctx, rv.seconds, 3);
    const revIn = gainNode(ctx, 1);
    const revHp = ctx.createBiquadFilter();
    revHp.type = 'highpass';
    revHp.frequency.value = 220;
    const revOut = gainNode(ctx, rv.mix);
    revIn.connect(revHp);
    revHp.connect(conv);
    conv.connect(revOut);
    revOut.connect(mix);

    const delay = ctx.createDelay(2);
    delay.delayTime.value = this.stepDur * (def.echo ?? 3);
    const fb = gainNode(ctx, def.echoFeedback ?? 0.34);
    const dlp = ctx.createBiquadFilter();
    dlp.type = 'lowpass';
    dlp.frequency.value = 2600;
    const dlyIn = gainNode(ctx, 1);
    const dlyOut = gainNode(ctx, 0.5);
    dlyIn.connect(delay);
    delay.connect(dlp);
    dlp.connect(fb);
    fb.connect(delay);
    dlp.connect(dlyOut);
    dlyOut.connect(mix);
    dlyOut.connect(revIn); // echoes bloom into the reverb
    this.nodes.push(mix, conv, revIn, revHp, revOut, delay, fb, dlp, dlyIn, dlyOut);

    const noise = noiseBuffer(ctx);
    for (const l of def.layers) {
      const input = gainNode(ctx, l.gain ?? 1);
      let tail: AudioNode = input;
      if (l.pan && ctx.createStereoPanner) {
        const pn = ctx.createStereoPanner();
        pn.pan.value = l.pan;
        input.connect(pn);
        tail = pn;
        this.nodes.push(pn);
      }
      tail.connect(mix);
      if (l.rev) {
        const s = gainNode(ctx, l.rev);
        tail.connect(s);
        s.connect(revIn);
        this.nodes.push(s);
      }
      if (l.dly) {
        const s = gainNode(ctx, l.dly);
        tail.connect(s);
        s.connect(dlyIn);
        this.nodes.push(s);
      }
      this.nodes.push(input);
      const compact = DRUM_INSTS.has(l.inst);
      this.layers.push({ def: l, table: compileLayer(l.pat, def.bars, compact, def.loop), input, env: { ctx, out: input, noise } });
    }
  }

  /** Jumps the scheduler to `sec` seconds into the track (use with startTime = now - sec). Notes already holding are skipped. */
  seek(sec: number): void {
    this.next = Math.max(0, Math.ceil(sec / this.stepDur - 1e-9));
  }

  /** Seconds covered by one pass of the track. */
  get length(): number {
    return this.totalSteps * this.stepDur;
  }

  get finished(): boolean {
    return !this.def.loop && this.next >= this.totalSteps;
  }

  /** Schedules every step starting before `until` (context time). */
  scheduleUntil(until: number): void {
    if (this.stopped) return;
    const swing = this.def.swing ?? 0;
    for (;;) {
      const n = this.next;
      if (!this.def.loop && n >= this.totalSteps) return;
      const t = this.startTime + stepTime(n, this.stepDur, swing);
      if (t >= until) return;
      this.next++;
      const idx = n % this.totalSteps;
      const bar = Math.floor(idx / STEPS_PER_BAR);
      for (const l of this.layers) {
        if (l.def.on && l.def.on[bar % l.def.on.length] !== 'x') continue;
        const ev = l.table[idx];
        if (!ev) continue;
        this.trigger(l, ev, t);
      }
    }
  }

  private trigger(l: CompiledLayer, ev: StepEvent, t: number): void {
    const voice = VOICES[l.def.inst];
    const drum = DRUM_INSTS.has(l.def.inst);
    const jitter = drum ? 0 : (this.rand() - 0.5) * 0.008;
    const vel = Math.min(1, ev.vel * (0.92 + this.rand() * 0.16));
    const dur = ev.len * this.stepDur;
    const when = Math.max(t + jitter, this.ctx.currentTime);
    if (drum || ev.midi.length === 0) {
      voice(l.env, when, 0, dur, vel, l.def.p ?? {});
      return;
    }
    for (const m of ev.midi) voice(l.env, when, midiToFreq(m), dur, vel, l.def.p ?? {});
  }

  /** Fades out over `sec` then disconnects. */
  fadeOut(sec: number, onDone?: () => void): void {
    this.stopped = true;
    const now = this.ctx.currentTime;
    const g = this.out.gain;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(0, now + sec);
    setTimeout(() => {
      this.dispose();
      onDone?.();
    }, (sec + 0.15) * 1000);
  }

  dispose(): void {
    this.stopped = true;
    try {
      this.out.disconnect();
    } catch {
      /* already disconnected */
    }
  }
}
