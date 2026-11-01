import { describe, expect, it } from 'vitest';
import {
  ACCESSORIES, BAGS, BROWS, CHAR_FEET_Y, CHAR_H, CHAR_W, DEFAULT_APPEARANCE, EYES, FACIALS, GLASSES, HAIR_COLORS, HAIR_STYLES, HEADWEARS, LOWERS,
  MOUTHS, OUTFITS, OUTFIT_COLORS, PATTERNS, SHOE_COLORS, SKIN_TONES, graduateSvg, normalizeAppearance, playerEntries, playerPortraitSvg, playerSpriteSvg,
} from './characters';
import { CHAR_VIEWS, WALK_FRAMES, charKey } from './char-contract';
import { PRESETS, LookHistory, randomAppearance } from '../../ui-dom/intro/appearance';
import type { PlayerAppearance } from '../../state/types';

const BAD = /NaN|undefined|Gradient|<filter/;
function expectComplete(a: PlayerAppearance): void {
  const es = playerEntries(a);
  expect(es).toHaveLength(CHAR_VIEWS.length * (WALK_FRAMES + 1));
  const keys = new Set(es.map((e) => e.key));
  for (const v of CHAR_VIEWS) for (let f = 0; f <= WALK_FRAMES; f++) expect(keys.has(charKey('player', v, f))).toBe(true);
  for (const e of es) {
    expect([e.w, e.h, e.anchorY]).toEqual([CHAR_W, CHAR_H, CHAR_FEET_Y]);
    expect(e.svg).not.toMatch(BAD);
  }
  const p = playerPortraitSvg(a);
  expect(p).toContain('viewBox="0 0 128 128"');
  expect(p).not.toMatch(BAD);
}

describe('player appearance', () => {
  it('exposes the option lists', () => {
    expect(SKIN_TONES).toHaveLength(8);
    expect(HAIR_COLORS).toHaveLength(8);
    expect(OUTFIT_COLORS.length).toBeGreaterThanOrEqual(8);
    expect(HAIR_STYLES.length).toBeGreaterThanOrEqual(16);
    expect(EYES).toHaveLength(4);
    expect(BROWS.length).toBeGreaterThanOrEqual(3);
    expect(MOUTHS).toHaveLength(3);
    expect(FACIALS.map((o) => o.id)).toEqual(['none', 'stubble', 'beard', 'mustache']);
    expect(GLASSES.map((o) => o.id)).toEqual(['none', 'round', 'square', 'sunglasses', 'visor']);
    expect(HEADWEARS.map((o) => o.id)).toEqual(['none', 'cap', 'beanie', 'bucket', 'headphones', 'bandana', 'hood']);
    expect(OUTFITS.map((o) => o.id)).toEqual(['hoodie', 'bomber', 'overshirt', 'tracksuit', 'labcoat', 'dress', 'overalls']);
    expect(PATTERNS.map((o) => o.id)).toEqual(['plain', 'stripes', 'logo', 'split']);
    expect(BAGS.map((o) => o.id)).toEqual(['none', 'backpack', 'messenger', 'tote']);
    expect(LOWERS).toHaveLength(3);
    expect(SHOE_COLORS.length).toBeGreaterThanOrEqual(6);
    expect(ACCESSORIES.map((a) => a.id)).toEqual(['none', 'headphones', 'cap', 'glasses', 'beanie', 'bandana']);
    // hair is open to both bodies
    expect(HAIR_STYLES.every((s) => !s.body)).toBe(true);
  });

  it('has a valid default look (a fixed point of normalize)', () => {
    expect(normalizeAppearance(DEFAULT_APPEARANCE)).toEqual(DEFAULT_APPEARANCE);
    expect(normalizeAppearance(normalizeAppearance({ body: 'fem' }))).toEqual(normalizeAppearance({ body: 'fem' }));
    expect(HAIR_STYLES.map((s) => s.id)).toContain(DEFAULT_APPEARANCE.hairStyle);
    expect(SKIN_TONES).toContain(DEFAULT_APPEARANCE.skin);
  });

  it('repairs unknown or missing fields', () => {
    const a = normalizeAppearance({ body: 'fem', hairStyle: 'nope', skin: 'nope', accessory: 'crown', outfit: 'cape', bag: 'sack', eyes: 'x', shoes: 'red' });
    expect(a.body).toBe('fem');
    expect(a.hairStyle).toBe('long');
    expect(a.skin).toBe(DEFAULT_APPEARANCE.skin);
    expect(a.accessory).toBe('none');
    expect(a.headwear).toBe('none');
    expect([a.outfit, a.bag, a.eyes, a.shoes]).toEqual([DEFAULT_APPEARANCE.outfit, DEFAULT_APPEARANCE.bag, DEFAULT_APPEARANCE.eyes, DEFAULT_APPEARANCE.shoes]);
    expect(normalizeAppearance(undefined)).toEqual(DEFAULT_APPEARANCE);
  });

  it('loads v0.4 saves that lack the new fields', () => {
    const old: PlayerAppearance = { body: 'fem', skin: '#e9b98e', hairStyle: 'bun', hairColor: '#2b2236', top: '#ff48b0', bottom: '#3a3550', accessory: 'cap' };
    const a = normalizeAppearance(old);
    expect(a.headwear).toBe('cap');
    expect(a.lower).toBe('skirt');
    expect(a.bag).toBe('backpack');
    expect(normalizeAppearance({ ...old, accessory: 'glasses' }).glasses).toBe('round');
    expect(normalizeAppearance({ ...old, accessory: 'headphones' }).headwear).toBe('headphones');
    expect(normalizeAppearance({ ...old, accessory: 'none' }).headwear).toBe('none');
    expectComplete(old);
    expectComplete({ ...old, body: 'masc', accessory: 'glasses' });
  });

  it('builds every key at the common size for both bodies and every hair style', () => {
    for (const body of ['masc', 'fem'] as const) for (const hs of HAIR_STYLES) expectComplete({ ...DEFAULT_APPEARANCE, body, hairStyle: hs.id });
  });

  it('renders every single option value for both bodies', () => {
    const axes: [keyof PlayerAppearance, readonly { id: string }[]][] = [
      ['eyes', EYES], ['brows', BROWS], ['mouth', MOUTHS], ['facial', FACIALS], ['glasses', GLASSES], ['headwear', HEADWEARS],
      ['outfit', OUTFITS], ['lower', LOWERS], ['pattern', PATTERNS], ['bag', BAGS],
    ];
    for (const body of ['masc', 'fem'] as const) {
      for (const [k, opts] of axes) for (const o of opts) expectComplete({ ...DEFAULT_APPEARANCE, body, [k]: o.id });
      for (const c of SHOE_COLORS) expectComplete({ ...DEFAULT_APPEARANCE, body, shoes: c });
      for (const c of SKIN_TONES) expectComplete({ ...DEFAULT_APPEARANCE, body, skin: c });
    }
  });

  it('renders option combinations (outfit x pattern x headwear x bag, long/tall hair)', () => {
    let i = 0;
    for (const outfit of OUTFITS) for (const pattern of PATTERNS) {
      const headwear = HEADWEARS[i % HEADWEARS.length]!.id;
      const bag = BAGS[i % BAGS.length]!.id;
      const hairStyle = HAIR_STYLES[(i * 5) % HAIR_STYLES.length]!.id;
      expectComplete({ ...DEFAULT_APPEARANCE, body: i % 2 ? 'fem' : 'masc', outfit: outfit.id, pattern: pattern.id, headwear, bag, hairStyle, glasses: GLASSES[i % GLASSES.length]!.id, facial: FACIALS[i % FACIALS.length]!.id });
      i++;
    }
  });

  it('reflects each choice in the art', () => {
    const svg = (p: Partial<PlayerAppearance>, view: 'front' | 'side' | 'back' = 'front'): string => playerSpriteSvg({ ...DEFAULT_APPEARANCE, ...p }, view, 0);
    expect(svg({ skin: '#70442c' })).toContain('#70442c');
    expect(svg({ shoes: '#e0283c' })).toContain('#e0283c');
    const base = svg({});
    for (const p of [
      { eyes: 'big' }, { mouth: 'grin' }, { brows: 'angry' }, { facial: 'beard' }, { glasses: 'visor' }, { headwear: 'hood' }, { outfit: 'overalls' },
      { outfit: 'dress' }, { outfit: 'tracksuit' }, { pattern: 'stripes' }, { pattern: 'logo' }, { pattern: 'split' }, { bag: 'tote' }, { bag: 'messenger' }, { bag: 'none' }, { lower: 'shorts' },
    ]) expect(svg(p), JSON.stringify(p)).not.toBe(base);
    // views differ and the new parts show on the back/side too
    expect(svg({ bag: 'tote' }, 'back')).not.toBe(svg({ bag: 'none' }, 'back'));
    expect(svg({ bag: 'messenger' }, 'side')).not.toBe(svg({ bag: 'none' }, 'side'));
    expect(svg({ headwear: 'hood' }, 'back')).not.toBe(svg({ headwear: 'none' }, 'back'));
    expect(svg({ pattern: 'stripes' }, 'back')).not.toBe(svg({ pattern: 'plain' }, 'back'));
    // portrait follows too
    for (const p of [{ outfit: 'bomber' }, { pattern: 'logo' }, { bag: 'tote' }, { glasses: 'visor' }, { facial: 'mustache' }]) {
      expect(playerPortraitSvg({ ...DEFAULT_APPEARANCE, ...p }), JSON.stringify(p)).not.toBe(playerPortraitSvg(DEFAULT_APPEARANCE));
    }
    const m = playerEntries(DEFAULT_APPEARANCE)[0]!.svg;
    const f = playerEntries({ ...DEFAULT_APPEARANCE, body: 'fem' })[0]!.svg;
    expect(m).not.toBe(f);
  });

  it('draws a 128x128 portrait and a graduate', () => {
    for (const body of ['masc', 'fem'] as const) expect(playerPortraitSvg({ ...DEFAULT_APPEARANCE, body })).toContain('viewBox="0 0 128 128"');
    expect(graduateSvg('front', 0, { ...DEFAULT_APPEARANCE, headwear: 'hood', outfit: 'dress' })).toContain('<svg');
  });
});

describe('creator presets, random and history', () => {
  it('ships 6 named, valid presets', () => {
    expect(PRESETS.map((p) => p.label)).toEqual(['Vibe coder', 'Researcher', 'Hackeuse', 'Prof', 'Startupper', 'Résistance']);
    for (const p of PRESETS) {
      expect(normalizeAppearance(p.look)).toEqual(p.look);
      expectComplete(p.look);
    }
    expect(new Set(PRESETS.map((p) => JSON.stringify(p.look))).size).toBe(6);
  });

  it('randomises to a valid, complete look', () => {
    let seed = 7;
    const rnd = (): number => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 12; i++) {
      const a = randomAppearance(rnd);
      expect(normalizeAppearance(a)).toEqual(a);
      expectComplete(a);
    }
  });

  it('undoes and redoes', () => {
    const h = new LookHistory();
    const a = DEFAULT_APPEARANCE;
    const b = normalizeAppearance({ ...a, top: '#e0283c' });
    const c = normalizeAppearance({ ...a, top: '#0078bf' });
    h.push(a);
    h.push(b);
    expect(h.undo(c)).toEqual(b);
    expect(h.undo(b)).toEqual(a);
    expect(h.undo(a)).toBeUndefined();
    expect(h.canRedo).toBe(true);
    expect(h.redo(a)).toEqual(b);
    h.push(b);
    expect(h.canRedo).toBe(false);
  });
});
