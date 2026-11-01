import { describe, expect, it } from 'vitest';
import { barLength, chordToMidi, compileLayer, maskBar, midiToFreq, noteToMidi, parseBar, stepAtOrAfter, stepDuration, stepTime, sustain } from './sequencer';
import { isInterrupt, isJingle, nextIndex, playlistFor, rotationSeconds } from './playlist';
import { TRACKS } from './tracks';
import { DRUM_INSTS } from './synth';
import { RECIPES } from './sfx';
import { TRAILER_CUES, TRAILER_END, TRAILER_SHOT_STARTS, shotDuration } from './trailer-cues';

describe('sequencer', () => {
  it('maps notes and chords', () => {
    expect(noteToMidi('C4')).toBe(60);
    expect(noteToMidi('A4')).toBe(69);
    expect(noteToMidi('Bb2')).toBe(46);
    expect(midiToFreq(69)).toBeCloseTo(440);
    expect(chordToMidi('Am7/3')).toEqual([57, 60, 64, 67]);
    expect(chordToMidi('Cmaj7')).toEqual([48, 52, 55, 59]);
    expect(chordToMidi('Zz')).toBeNull();
  });
  it('parses cells, velocities and drum shorthand', () => {
    const c = parseBar('C4@0.5 . - E4+G4 Am7/3 . . . . . . . . . . .');
    expect(c).toHaveLength(16);
    expect(c[0]).toMatchObject({ kind: 'hit', midi: [60], vel: 0.5 });
    expect(c[1]!.kind).toBe('rest');
    expect(c[2]!.kind).toBe('hold');
    expect(c[3]!.midi).toEqual([64, 67]);
    const d = parseBar('x..X|g...|....|....', true);
    expect(d.map((x) => x.vel).slice(0, 5)).toEqual([0.75, 0, 0, 1, 0.35]);
    expect(() => parseBar('H9 . . .')).toThrow();
  });
  it('compiles holds, including the wrap-around of loops', () => {
    const t = compileLayer([sustain('C4')], 2, false, true);
    expect(t[0]).toMatchObject({ len: 16 });
    expect(t[16]).toMatchObject({ len: 16 });
    const w = compileLayer(['. - - - . . . . . . . . . . . .'.replace('.', 'C4')], 1, false, true);
    expect(w[0]!.len).toBe(4);
    const wrap = compileLayer(['C4 . . . . . . . . . . . . . . -'], 1, false, true);
    expect(wrap[0]!.len).toBe(1);
    const tail = compileLayer(['- - - - - - - - - - - - - - - -', 'C4 - . . . . . . . . . . . . . -'], 2, false, true);
    expect(tail[16]!.len).toBe(2);
  });
  it('computes step timing with swing', () => {
    const sd = stepDuration(120);
    expect(sd).toBeCloseTo(0.125);
    expect(stepTime(2, sd, 0.2)).toBeCloseTo(0.25);
    expect(stepTime(3, sd, 0.2)).toBeCloseTo(0.375 + 0.025);
    expect(stepAtOrAfter(0.26, sd)).toBe(3);
  });
  it('builds masks', () => {
    expect(maskBar('x.-x', 'C4')).toBe('C4 . - C4');
  });
});

describe('playlists', () => {
  it('picks city tracks by hour and rotates', () => {
    expect(playlistFor('city', 12)[0]).toBe('city_day');
    expect(playlistFor('city', 23)[0]).toBe('city_night');
    expect(playlistFor('route', 10)).toContain('route_b');
    expect(playlistFor('dungeon', 1)).toEqual(['prison']);
    expect(nextIndex(1, 2)).toBe(0);
    expect(rotationSeconds(0)).toBe(120);
    expect(rotationSeconds(1)).toBe(180);
    expect(isInterrupt('battle_wild') && isInterrupt('victory') && !isInterrupt('city_day')).toBe(true);
    expect(isJingle('evolution') && !isJingle('title')).toBe(true);
  });
});

describe('track data', () => {
  for (const [name, def] of Object.entries(TRACKS)) {
    it(`${name}: every bar has 16 valid steps`, () => {
      expect(def.bars).toBeGreaterThan(0);
      for (const l of def.layers) {
        const compact = DRUM_INSTS.has(l.inst);
        for (const p of l.pat) {
          expect(barLength(p, compact), `${name}/${l.inst}: "${p}"`).toBe(16);
          expect(() => parseBar(p, compact)).not.toThrow();
        }
        if (l.on) expect(l.on.length, `${name}/${l.inst} on`).toBe(def.bars);
      }
    });
  }
  it('has a recipe for every sfx name used by the type', () => {
    expect(Object.keys(RECIPES).length).toBe(30);
  });
});

describe('trailer timeline', () => {
  it('has sorted cues and beat-aligned shot starts inside the track', () => {
    const cues = TRAILER_CUES.map((c) => c.t);
    expect([...cues].sort((a, b) => a - b)).toEqual(cues);
    expect(cues[cues.length - 1]).toBeLessThan(TRAILER_END);
    for (const t of [...cues, ...TRAILER_SHOT_STARTS]) expect((t / 0.125) % 1).toBe(0);
    expect(TRAILER_SHOT_STARTS).toHaveLength(19);
    const sum = TRAILER_SHOT_STARTS.reduce((a, _, i) => a + shotDuration(i), 0);
    expect(sum).toBeCloseTo(TRAILER_END);
    expect(TRACKS.trailer.loop).toBe(false);
  });
});
