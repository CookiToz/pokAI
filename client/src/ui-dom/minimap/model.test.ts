import { describe, expect, it } from 'vitest';
import type { MapDef } from '../../data/types';
import { MM, arrowGlyph, headingAngle, layoutFor, shortLabel, tileColour } from './model';

const map = (w: number, h: number): MapDef => ({ id: 'm', name: 'M', width: w, height: h, rows: [], legend: {}, npcs: [], warps: [], triggers: [] });

describe('minimap model', () => {
  it('colours tiles by role', () => {
    expect(tileColour('water')).toBe(MM.blue);
    expect(tileColour('cable')).toBe(MM.teal);
    expect(tileColour('wall')).toBe(MM.ink3);
    expect(tileColour('path')).toBe(MM.paper);
    expect(tileColour('black')).toBeNull();
  });
  it('fits the layout in the requested box and keeps tiles inside the canvas', () => {
    for (const [w, h] of [[20, 14], [60, 40], [30, 30]] as const) {
      const l = layoutFor(map(w, h), 210, 118);
      expect(l.width).toBeLessThanOrEqual(210 + 4);
      expect(l.height).toBeLessThanOrEqual(118 + 6);
      for (const [gx, gy] of [[0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1]] as const) {
        const p = l.at(gx, gy);
        expect(p.x).toBeGreaterThanOrEqual(0);
        expect(p.x).toBeLessThanOrEqual(l.width);
        expect(p.y).toBeGreaterThanOrEqual(0);
        expect(p.y).toBeLessThanOrEqual(l.height);
      }
    }
  });
  it('arrows and heading follow the isometric view', () => {
    expect(arrowGlyph(1, -1)).toBe('→');
    expect(arrowGlyph(-1, -1)).toBe('↑');
    expect(headingAngle({ x: 1, y: -1 })).toBeCloseTo(0);
    expect(headingAngle({ x: 1, y: 1 })).toBeCloseTo(Math.PI / 2);
  });
  it('shortens labels', () => {
    expect(shortLabel('← Hugging Grove')).toBe('Hugging Grove');
    expect(shortLabel('x'.repeat(40), 10)).toHaveLength(10);
  });
});
