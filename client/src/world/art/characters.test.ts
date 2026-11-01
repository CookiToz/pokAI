import { describe, expect, it } from 'vitest';
import { CHAR_FEET_Y, CHAR_H, CHAR_W, CHARACTER_IDS, characterEntries } from './characters';
import { CHAR_VIEWS, WALK_FRAMES, charKey } from './char-contract';
import { PORTRAITS } from '../../art/svg/portraits-c';

const NEW_CAST = [
  'guard_aiact', 'guard_aiact_2', 'inspector_cookie', 'greffiere_article52', 'directrice_moratoire', 'jensen_cuir', 'clem_delangouste', 'menschtral', 'hassabyte', 'zuckerbot',
  'resistance_dev', 'chef', 'fashion_clerk', 'barista', 'delivery_rider', 'tourist', 'dev_phone', 'citizen_a', 'citizen_b', 'citizen_c', 'citizen_d',
];
const OLD_CAST = ['player', 'kevin', 'kartpathy', 'nurse_hugging', 'clerk', 'gourou', 'agent_conformite', 'nadelta', 'kid', 'scientist', 'sailor', 'stagiaire', 'vibeur_a', 'vibeur_b', 'lecube', 'mom'];

describe('world characters', () => {
  const entries = characterEntries();
  const byKey = new Map(entries.map((e) => [e.key, e]));

  it('covers the whole v0.3 cast', () => {
    for (const id of [...OLD_CAST, ...NEW_CAST]) expect(CHARACTER_IDS, id).toContain(id);
  });

  it('has every id x view x frame exactly once', () => {
    expect(entries).toHaveLength(CHARACTER_IDS.length * CHAR_VIEWS.length * (WALK_FRAMES + 1));
    expect(byKey.size).toBe(entries.length);
    for (const id of CHARACTER_IDS) for (const v of CHAR_VIEWS) for (let f = 0; f <= WALK_FRAMES; f++) expect(byKey.has(charKey(id, v, f)), charKey(id, v, f)).toBe(true);
  });

  it('uses the common size and a feet anchor', () => {
    for (const e of entries) {
      expect(e.w).toBe(CHAR_W);
      expect(e.h).toBe(CHAR_H);
      expect(e.anchorY).toBe(CHAR_FEET_Y);
    }
  });

  it('emits flat svg (no gradients or filters)', () => {
    for (const e of entries) {
      expect(e.svg.startsWith('<svg'), e.key).toBe(true);
      expect(e.svg.endsWith('</svg>'), e.key).toBe(true);
      expect(e.svg).not.toMatch(/Gradient|<filter|filter=|NaN|undefined/);
    }
  });

  it('animates: walk frames differ from idle and from each other', () => {
    for (const id of ['player', 'chef', 'directrice_moratoire']) {
      for (const v of CHAR_VIEWS) {
        const set = new Set([0, 1, 2, 3, 4].map((f) => byKey.get(charKey(id, v, f))?.svg));
        expect(set.size, `${id}:${v}`).toBe(5);
      }
    }
  });
});

describe('portraits-c', () => {
  it('has every new cast bust', () => {
    for (const id of NEW_CAST) {
      const s = PORTRAITS[id] as string;
      expect(s, id).toBeDefined();
      expect(s.startsWith('<svg'), id).toBe(true);
      expect(s).toContain('viewBox="0 0 128 128"');
      expect(s).not.toMatch(/Gradient|<filter|filter=|NaN|undefined/);
    }
  });
});
