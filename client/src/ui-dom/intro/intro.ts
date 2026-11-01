// Intro = movie trailer (~56 s, skippable): black title cards that slam on the music hits, riso flash cuts, eased parallax camera,
// drifting particles and subtitles typed token by token.
// The score (audio 'trailer' track) and the cuts share one timeline (audio/trailer-cues.ts). While audio runs, every cut, caption and hit
// is driven by the music clock; otherwise a frame-timer clock replays the same timeline silently.
// confirm / click = next shot; hold back (or "Passer") = skip everything.
import './intro.css';
import { audio } from '../../audio/audio';
import { TRAILER_END, TRAILER_MARKS, type TrailerCue } from '../../audio/trailer-cues';
import { input, type Action } from '../../input/input';
import { h, uiRoot } from '../dom';
import { pushHints } from '../shell/hints';
import { buildShots, type Shot } from './shots';

const HOLD_MS = 600;
const PRE_DEFAULT = 0.2; // shots are mounted this long before their nominal start so entrances land on the hit
const CAP_DELAY = 0.35;
const CAP_CPS = 42;
const PAN = 26; // camera truck, in svg units (parallax layers move by pan * depth)
const SCENE_OPEN = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 700" preserveAspectRatio="xMidYMid slice" aria-hidden="true">';

const clamp01 = (x: number): number => Math.min(1, Math.max(0, x));
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
const easeInOut = (x: number): number => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

/** How hard each kind of hit punches the camera / frame. */
const PUNCH: Record<TrailerCue['kind'], { zoom: number; shake: number; rg: number; lid: number; sweep: boolean; flash: boolean }> = {
  soft: { zoom: 0.012, shake: 0, rg: 0, lid: 0.15, sweep: false, flash: false },
  hit: { zoom: 0.022, shake: 4, rg: 1, lid: 0.3, sweep: false, flash: false },
  braam: { zoom: 0.045, shake: 8, rg: 1, lid: 0.5, sweep: true, flash: false },
  drop: { zoom: 0.08, shake: 14, rg: 1, lid: 0.7, sweep: true, flash: true },
  eye: { zoom: 0.07, shake: 12, rg: 1, lid: 0.6, sweep: false, flash: true },
  final: { zoom: 0.09, shake: 10, rg: 1, lid: 0.5, sweep: false, flash: false },
};

export function runIntro(): Promise<void> {
  return new Promise<void>((resolve) => {
    const shots = buildShots();
    const cues = audio.trailerCues();
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let done = false;
    let holdSince = 0;
    let raf = 0;

    // ---- clock: music time when audio runs, else a frame timer playing the same timeline
    const synced = audio.unlocked();
    if (synced) audio.music('trailer');
    let T = -0.12;
    let lastFrame = performance.now();

    // ---- dom
    const scene = h('div.in-scene');
    const fx = h('div.in-fx');
    const lidT = h('div.in-lid.in-lid-t');
    const lidB = h('div.in-lid.in-lid-b');
    const rgA = h('div.in-rg.in-rg-a');
    const rgB = h('div.in-rg.in-rg-b');
    const sweep = h('div.in-sweep');
    const flash = h('div.in-flash');
    const stage = h('div.in-stage', null, scene, fx, h('div.in-vig'), lidT, lidB, rgA, rgB, sweep, flash);
    const cap = h('p.in-cap', { 'aria-live': 'polite' });
    const ticks = shots.map(() => h('i'));
    const skipFill = h('i');
    const skip = h('button.in-skip', { type: 'button', onclick: (e: Event) => { e.stopPropagation(); finish(); } }, 'Passer ▸▸', skipFill);
    const root = h('div.intro', { role: 'img', 'aria-label': 'Bande-annonce : les IA étaient partout, puis l\'AIACT est arrivée. Les modèles sont scellés, tu es arrêté le jour de ton diplôme.' },
      stage,
      h('div.in-bar-top'),
      h('div.in-bar-bot', null, cap, h('div.in-meta', null, h('div.in-ticks', null, ...ticks), h('span.in-hint', null, 'Maintiens Retour pour tout passer'))),
      skip,
    );
    uiRoot().append(root);
    requestAnimationFrame(() => root.classList.add('is-open'));
    const hints = pushHints([['confirm', 'Plan suivant'], ['back', 'Passer (maintenir)']]);
    if (!synced) audio.music('title');

    // ---- state
    let idx = -1;
    let flashed = -1; // last shot whose cut flash has been fired
    let cueI = 0;
    let layers: { el: SVGElement; d: number }[] = [];
    let typed: { el: SVGElement; full: string; at: number; cps: number; n: number }[] = [];
    let sfxQ: [number, () => void][] = [];
    let sweepQ: number[] = [];
    let capText = '';
    let capN = -1;
    let hitT = -10;
    let hitK = 0; // strength of the last hit
    let lidV = -1;
    let sceneStyle = '';

    const restart = (el: HTMLElement): void => {
      el.classList.remove('go');
      void el.offsetWidth;
      el.classList.add('go');
    };
    const doFlash = (color: string): void => {
      flash.style.background = color;
      restart(flash);
    };

    function mount(n: number): void {
      const s = shots[n]!;
      idx = n;
      scene.innerHTML = SCENE_OPEN + s.scene + '</svg>';
      fx.innerHTML = calm || !s.fx ? '' : SCENE_OPEN + s.fx + '</svg>';
      stage.style.background = s.bg;
      scene.style.transformOrigin = s.focus ?? '50% 50%';
      layers = [...scene.querySelectorAll<SVGElement>('.plx')].map((el) => ({ el, d: Number(el.dataset.d ?? 1) }));
      typed = [...scene.querySelectorAll<SVGElement>('[data-type]')].map((el) => ({ el, full: el.dataset.type ?? '', at: Number(el.dataset.at ?? 0), cps: Number(el.dataset.cps ?? 30), n: -1 }));
      ticks.forEach((t, k) => {
        t.className = k < n ? 'is-done' : k === n ? 'is-now' : '';
      });
      capText = s.caption;
      capN = -1;
      cap.textContent = '';
      sfxQ = (s.sfx ?? []).map(([at, name]) => [s.at + at, () => audio.sfx(name)] as [number, () => void]);
      sweepQ = calm ? [] : (s.sweeps ?? []).map((t) => s.at + t);
    }

    function cut(n: number): void {
      mount(n);
    }

    /** Jumps to shot n now (confirm key / click): the music is moved along so the next hit still lands with its title card. */
    function jump(n: number): void {
      if (n >= shots.length) return finish();
      const s = shots[n]!;
      const tt = s.at - (s.pre ?? PRE_DEFAULT);
      if (synced && audio.trailerClock() !== null) audio.trailerSeek(tt + 0.06);
      T = tt;
      cueI = cues.findIndex((c) => c.t >= tt);
      if (cueI < 0) cueI = cues.length;
      flashed = n;
      doFlash(s.flash);
      cut(n);
    }

    function finish(): void {
      if (done) return;
      done = true;
      cancelAnimationFrame(raf);
      popLayer();
      hints.pop();
      if (synced) audio.music('title'); // crossfade the trailer score into the title theme (creator screen)
      root.classList.remove('is-open');
      window.setTimeout(() => {
        root.remove();
        resolve();
      }, 280);
    }

    function fireCue(c: TrailerCue): void {
      hitT = T;
      const p = PUNCH[c.kind];
      hitK = p.zoom / 0.045 + p.shake / 8; // unitless strength used for the shake envelope
      if (calm) {
        if (p.flash) doFlash('#fff');
        return;
      }
      if (p.rg) {
        restart(rgA);
        restart(rgB);
      }
      if (p.sweep) restart(sweep);
      if (p.flash) doFlash(c.kind === 'drop' ? '#fff' : '#ffe9b0');
    }

    function frame(now: number): void {
      if (done) return;
      const dt = Math.min(0.1, (now - lastFrame) / 1000);
      lastFrame = now;
      const clk = synced ? audio.trailerClock() : null;
      T = clk ?? T + dt;
      if (T >= TRAILER_END) return finish();

      // cuts: flash a hair before the next shot is mounted, mount it `pre` before its nominal start
      const nxt = shots[idx + 1];
      if (nxt) {
        const pre = nxt.pre ?? PRE_DEFAULT;
        const lead = calm ? 0.32 : 0.075;
        if (idx >= 0 && flashed < idx + 1 && T >= nxt.at - pre - lead) {
          flashed = idx + 1;
          doFlash(nxt.flash);
        }
        if (T >= nxt.at - pre) cut(idx + 1);
      }
      while (cueI < cues.length && T >= cues[cueI]!.t) fireCue(cues[cueI++]!);
      if (idx >= 0) update(shots[idx]!);
      pollSkip(now);
      if (!done) raf = requestAnimationFrame(frame);
    }

    function update(s: Shot): void {
      // foley and light sweeps
      while (sfxQ.length && T >= sfxQ[0]![0]) sfxQ.shift()![1]();
      while (sweepQ.length && T >= sweepQ[0]!) {
        sweepQ.shift();
        restart(sweep);
      }
      // caption, typed token by token
      if (capText) {
        const n = Math.min(capText.length, Math.max(0, Math.floor((T - s.at - CAP_DELAY) * CAP_CPS)));
        if (n !== capN) {
          capN = n;
          cap.textContent = capText.slice(0, n);
        }
      }
      for (const t of typed) {
        const n = Math.min(t.full.length, Math.max(0, Math.floor((T - s.at - t.at) * t.cps)));
        if (n !== t.n) {
          t.n = n;
          t.el.textContent = t.full.slice(0, n) + (n > 0 && n < t.full.length ? '▌' : '');
        }
      }
      if (calm) return;

      // camera: eased push-in / pull-out + slow truck (parallax), a breath of handheld sway, beat pulse and hit punch
      const p = clamp01((T - s.at + (s.pre ?? PRE_DEFAULT)) / (s.dur + (s.pre ?? PRE_DEFAULT)));
      const e = easeInOut(p);
      const z0 = s.title ? 1 : s.cam === 'out' ? 1.15 : 1.07;
      const z1 = s.title ? 1.07 : s.cam === 'out' ? 1.07 : 1.15;
      const dir = idx % 2 ? 1 : -1;
      const camX = lerp(-dir * PAN, dir * PAN, e) + Math.sin(T * 0.9) * 2;
      const camY = lerp(6, -6, e) + Math.cos(T * 0.7) * 1.5;
      const since = T - hitT;
      const env = since >= 0 ? Math.exp(-since * 7) : 0;
      const kind = since >= 0 && since < 1 ? env : 0;
      const beat = T >= TRAILER_MARKS.arp + 3 && T < TRAILER_MARKS.silence ? 0.006 * (T >= TRAILER_MARKS.drop ? 2 : 1) * Math.exp(-(((T / 0.5) % 1) * 5)) : 0;
      const zoom = lerp(z0, z1, e) + beat + kind * 0.03 * hitK;
      const shake = kind * 5 * hitK;
      const sx = shake * Math.sin(T * 95);
      const sy = shake * 0.6 * Math.cos(T * 83);
      const css = `translate3d(${sx.toFixed(1)}px,${sy.toFixed(1)}px,0) scale(${zoom.toFixed(4)})`;
      if (css !== sceneStyle) {
        sceneStyle = css;
        scene.style.transform = css;
      }
      for (const l of layers) l.el.style.transform = `translate3d(${(camX * l.d).toFixed(1)}px,${(camY * l.d).toFixed(1)}px,0)`;

      // letterbox lids close with the tension (30 s to the drop), snap open on the drop, flinch on hits
      const tension = T < TRAILER_MARKS.riser ? 0 : T < TRAILER_MARKS.drop ? easeInOut((T - TRAILER_MARKS.riser) / (TRAILER_MARKS.drop - TRAILER_MARKS.riser)) * 0.85 : 0;
      const lid = clamp01(tension + kind * 0.5);
      if (Math.abs(lid - lidV) > 0.003) {
        lidV = lid;
        const v = `scaleY(${lid.toFixed(3)})`;
        lidT.style.transform = v;
        lidB.style.transform = v;
      }
    }

    function pollSkip(now: number): void {
      // hold "back" to skip everything
      if (input.held('back', 'intro')) {
        if (!holdSince) holdSince = now;
        const p = Math.min(1, (now - holdSince) / HOLD_MS);
        skipFill.style.setProperty('--p', String(p));
        skip.classList.add('is-hold');
        if (p >= 1) finish();
      } else if (holdSince) {
        holdSince = 0;
        skipFill.style.setProperty('--p', '0');
        skip.classList.remove('is-hold');
      }
    }

    const popLayer = input.push('intro', (a: Action) => {
      if (done) return true;
      if (a === 'confirm') {
        audio.sfx('ui_move');
        jump(idx + 1);
      } else if (a === 'menu') finish();
      return true;
    });
    root.addEventListener('click', () => {
      audio.sfx('ui_move');
      jump(idx + 1);
    });

    raf = requestAnimationFrame(frame);
  });
}
