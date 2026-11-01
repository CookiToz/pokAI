import { describe, expect, it } from 'vitest';
import { db } from '../data/db';
import { ACHIEVEMENTS, applyEvent, evaluate, progressOf, statValue, type Snapshot } from './progression';
import {
  DEX_MILESTONES,
  WILD_DROPS,
  crossedMilestones,
  earlyXpBoost,
  firstCatchBonus,
  foeDamageMultiplier,
  levelGapFactor,
  rollWildDrop,
} from './progression-rewards';
import { createRng } from './rng';
import { xpForLevel } from './stats';

const snap = (over: Partial<Snapshot> = {}): Snapshot => ({ counters: {}, badges: [], caught: [], credits: 0, party: [], repo: [], ...over });

describe('achievements data', () => {
  it('has ~25-35 unique, well-formed entries referencing real items', () => {
    expect(ACHIEVEMENTS.length).toBeGreaterThanOrEqual(25);
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length);
    for (const a of ACHIEVEMENTS) {
      expect(a.title.length).toBeGreaterThan(2);
      expect(a.description.length).toBeGreaterThan(10);
      expect(a.hint.length).toBeGreaterThan(3);
      expect(a.when.gte).toBeGreaterThan(0);
      for (const id of Object.keys(a.reward?.items ?? {})) expect(db.hasItem(id), `${a.id} -> ${id}`).toBe(true);
    }
  });
});

describe('evaluator', () => {
  it('counts events and unlocks once', () => {
    const c: Record<string, number> = {};
    applyEvent(c, { kind: 'cookie_refused' });
    applyEvent(c, { kind: 'evolve_cancel' });
    for (let i = 0; i < 3; i++) applyEvent(c, { kind: 'battle_end', outcome: 'lost', battle: 'trainer', aiact: false, flawless: false, turns: 5 });
    const fresh = evaluate(snap({ counters: c }), new Set());
    const ids = fresh.map((f) => f.id);
    expect(ids).toEqual(expect.arrayContaining(['tout_refuser', 'version_stable', 'rate_limited']));
    expect(evaluate(snap({ counters: c }), new Set(ids)).map((f) => f.id)).not.toContain('tout_refuser');
  });

  it('derives stats from the save (open-weights count, badges, party)', () => {
    const open = db.allForms().filter((f) => f.licence === 'open').slice(0, 5).map((f) => f.id);
    expect(statValue(snap({ caught: open }), 'caught_open')).toBe(5);
    expect(evaluate(snap({ caught: open }), new Set()).map((a) => a.id)).toContain('open_sourcerer');
    expect(statValue(snap({ party: [{ level: 7 }, { level: 31 }] }), 'max_level')).toBe(31);
    expect(progressOf(snap({ badges: ['a'] }), ACHIEVEMENTS.find((a) => a.id === 'benchmark_maxxing')!)).toBeCloseTo(1 / 3);
  });

  it('tracks perfect onboardings, quick and flawless wins, steps and credit peaks', () => {
    const c: Record<string, number> = {};
    applyEvent(c, { kind: 'onboard', perfect: true, jailbreak: false, tier: 'free', legendary: false });
    applyEvent(c, { kind: 'onboard', perfect: false, jailbreak: true, tier: 'pro', legendary: false });
    applyEvent(c, { kind: 'battle_end', outcome: 'won', battle: 'trainer', aiact: true, flawless: true, turns: 2 });
    applyEvent(c, { kind: 'step' });
    applyEvent(c, { kind: 'credits', total: 900 });
    applyEvent(c, { kind: 'credits', total: 400 });
    expect(c).toMatchObject({ onboard_perfect: 1, jailbreaks: 1, wins: 1, quick_wins: 1, flawless_wins: 1, aiact_wins: 1, steps: 1, credits_peak: 900 });
  });
});

describe('reward cadence', () => {
  it('catch-up XP: behind = more, over-levelled = less, bounded', () => {
    expect(levelGapFactor(10, 10)).toBe(1);
    expect(levelGapFactor(14, 10)).toBeGreaterThan(1);
    expect(levelGapFactor(5, 15)).toBeLessThan(0.5);
    expect(levelGapFactor(1, 90)).toBeGreaterThanOrEqual(0.35);
    expect(levelGapFactor(90, 1)).toBeLessThanOrEqual(1.6);
    expect(earlyXpBoost(10)).toBeGreaterThan(earlyXpBoost(22));
    expect(earlyXpBoost(40)).toBe(1);
  });

  it('wild drops: about one win in five, mostly cheap, keys and datasets rare', () => {
    const rng = createRng(7);
    const n = 6000;
    const got: Record<string, number> = {};
    let total = 0;
    for (let i = 0; i < n; i++) {
      const d = rollWildDrop(14, rng);
      if (d) {
        total++;
        got[d] = (got[d] ?? 0) + 1;
      }
    }
    expect(total / n).toBeGreaterThan(0.14);
    expect(total / n).toBeLessThan(0.23);
    expect(got['cafe'] ?? 0).toBeGreaterThan(got['dataset'] ?? 0);
    expect((got['api_key_free'] ?? 0) / n).toBeLessThan(0.03);
    for (const d of WILD_DROPS) expect(db.hasItem(d.item)).toBe(true);
    expect(rollWildDrop(2, createRng(1), 1)).not.toBe('dataset');
  });

  it('Neurodex milestones are crossed once and stay scarce on keys', () => {
    expect(crossedMilestones(4, 5).map((m) => m.caught)).toEqual([5]);
    expect(crossedMilestones(5, 6)).toEqual([]);
    for (const m of DEX_MILESTONES) for (const id of Object.keys(m.items)) expect(db.hasItem(id)).toBe(true);
    expect(DEX_MILESTONES.filter((m) => m.items['api_key_enterprise']).length).toBe(1);
    expect(firstCatchBonus(3)).toBeGreaterThan(firstCatchBonus(1));
  });

  it('early game is gentler: foe damage ramps up with badges', () => {
    expect(foeDamageMultiplier(0)).toBe(0.75);
    expect(foeDamageMultiplier(1)).toBe(0.9);
    expect(foeDamageMultiplier(2)).toBe(1);
    expect(foeDamageMultiplier(undefined)).toBe(1);
  });

  it('the XP curve still gets the first evolution (lv16) within reach: 16^3 XP', () => {
    expect(xpForLevel(16)).toBe(4096);
  });
});
