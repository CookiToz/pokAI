// Dev-only: ?jukebox opens a small panel to audition every track and effect.
// Also exposes window.__audioTest.render*() to measure levels offline (peak / RMS / NaN check).
import { audio, audioInternals, type SfxName, type TrackName } from './audio';
import { TrackRig } from './rig';
import { RECIPES } from './sfx';
import { TRACKS } from './tracks';

export interface Stats {
  name: string;
  seconds: number;
  peak: number;
  rmsDb: number;
  peakDb: number;
  nan: boolean;
  clipped: boolean;
}

function stats(name: string, buf: AudioBuffer): Stats {
  let peak = 0;
  let sum = 0;
  let n = 0;
  let nan = false;
  for (let c = 0; c < buf.numberOfChannels; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < d.length; i++) {
      const v = d[i]!;
      if (Number.isNaN(v) || !Number.isFinite(v)) {
        nan = true;
        continue;
      }
      peak = Math.max(peak, Math.abs(v));
      sum += v * v;
      n++;
    }
  }
  const rms = Math.sqrt(sum / Math.max(1, n));
  const db = (x: number): number => Math.round(20 * Math.log10(Math.max(1e-9, x)) * 10) / 10;
  return { name, seconds: buf.duration, peak, rmsDb: db(rms), peakDb: db(peak), nan, clipped: peak >= 0.999 };
}

export async function renderTrack(name: TrackName, passes = 1): Promise<Stats> {
  const def = TRACKS[name];
  const sr = 44100;
  const len = (def.bars * 16 * (60 / def.bpm / 4)) * passes + (def.loop ? 0 : 3);
  const ctx = new OfflineAudioContext(2, Math.ceil(len * sr), sr);
  const rig = new TrackRig(ctx as unknown as BaseAudioContext, ctx.destination, def, 0.05, 1);
  rig.scheduleUntil(len); // loops wrap the step index, so this covers `passes` passes
  const buf = await ctx.startRendering();
  return stats(name, buf);
}

export async function renderSfx(name: SfxName): Promise<Stats> {
  const sr = 44100;
  const ctx = new OfflineAudioContext(2, sr * 3, sr);
  RECIPES[name](ctx as unknown as BaseAudioContext, ctx.destination, 0.01, Math.random);
  return stats(name, await ctx.startRendering());
}

export async function renderAll(): Promise<Stats[]> {
  const out: Stats[] = [];
  for (const t of Object.keys(TRACKS) as TrackName[]) out.push(await renderTrack(t));
  for (const s of Object.keys(RECIPES) as SfxName[]) out.push(await renderSfx(s));
  return out;
}

function panel(): void {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#f4efe4;color:#1d1a2b;font:13px/1.4 monospace;overflow:auto;padding:16px';
  const now = document.createElement('div');
  now.style.cssText = 'font-weight:700;margin-bottom:8px';
  const mk = (title: string, items: string[], fn: (s: string) => void): void => {
    const h = document.createElement('h3');
    h.textContent = title;
    h.style.margin = '12px 0 6px';
    wrap.append(h);
    for (const it of items) {
      const b = document.createElement('button');
      b.textContent = it;
      b.style.cssText = 'margin:2px;padding:4px 8px;border:2px solid #1d1a2b;background:#fff;cursor:pointer;font:inherit';
      b.onclick = () => {
        fn(it);
        now.textContent = `now playing: ${audio.nowPlaying() ?? '-'}`;
      };
      wrap.append(b);
    }
  };
  const slider = (ch: 'master' | 'music' | 'sfx'): void => {
    const l = document.createElement('label');
    l.style.marginRight = '16px';
    l.textContent = `${ch} `;
    const i = document.createElement('input');
    i.type = 'range';
    i.min = '0';
    i.max = '1';
    i.step = '0.05';
    i.value = String(audio.getVolume(ch));
    i.oninput = () => audio.setVolume(ch, Number(i.value));
    l.append(i);
    wrap.append(l);
  };
  const title = document.createElement('h2');
  title.textContent = 'PokAI jukebox (dev)';
  wrap.append(title, now);
  (['master', 'music', 'sfx'] as const).forEach(slider);
  mk('Pistes', Object.keys(TRACKS), (s) => audio.music(s as TrackName));
  mk('Ambiances (playlists)', ['city', 'route', 'interior', 'dungeon'], (s) => audio.ambient(s as 'city'));
  mk('Silence / reprise', ['stop', 'resume'], (s) => (s === 'stop' ? audio.music(null) : audio.resume()));
  mk('Effets', Object.keys(RECIPES), (s) => audio.sfx(s as SfxName));
  const close = document.createElement('button');
  close.textContent = 'fermer';
  close.onclick = () => wrap.remove();
  wrap.prepend(close);
  document.body.append(wrap);
}

(window as unknown as { __audioTest: unknown }).__audioTest = { renderTrack, renderSfx, renderAll, internals: audioInternals };
if (/[?&]jukebox\b/.test(location.search)) {
  if (document.body) panel();
  else window.addEventListener('DOMContentLoaded', panel);
}
