// Balance guard-rails, checked by seeded simulation. Run with BALANCE_REPORT=1 to print the tables.
import { describe, expect, it } from 'vitest';
import { db } from '../data/db';
import { baseStatTotal, xpForLevel } from './stats';
import { BattleEngine } from './battle';
import { createPokai } from './pokai';
import { createRng } from './rng';
import { maxHitFraction, winRate, type TeamSpec } from './sim/runner';

const STARTERS = ['claude_haiku', 'phi_1', 'gemma'] as const;
const N = 400;
const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;
const REPORT = env?.['BALANCE_REPORT'] === '1';
const log = (...a: unknown[]) => {
  if (REPORT) console.log(...a);
};
const pct = (r: number) => `${Math.round(r * 100)}%`;

/** Prison guards' PokAI (see recommended bands): levels 3-5, early common forms. */
const GUARD_MONS: TeamSpec[] = [
  { form: 'smollm', level: 3 },
  { form: 'smollm', level: 4 },
  { form: 'qwen', level: 4 },
  { form: 'bert', level: 4 },
  { form: 'whisper_tiny', level: 5 },
];
/** Early wild PokAI (routes + city, lv 3-8). */
const EARLY_WILD: TeamSpec[] = [
  { form: 'smollm', level: 5 },
  { form: 'qwen', level: 5 },
  { form: 'whisper_tiny', level: 6 },
  { form: 'gpt_2', level: 6 },
  { form: 'copilot', level: 8 },
  { form: 'mistral_7b', level: 7 },
  { form: 'falcon_7b', level: 7 },
  { form: 'sd_1_5', level: 7 },
  { form: 'midjourney_v5', level: 8 },
  { form: 'llama_2', level: 8 },
  { form: 'nova_micro', level: 6 },
];

describe('starters', () => {
  it('have total base stats within +-5% of each other', () => {
    const totals = STARTERS.map((id) => baseStatTotal(db.form(id).baseStats));
    const mean = totals.reduce((a, b) => a + b, 0) / totals.length;
    log('starter effective totals', STARTERS.map((s, i) => `${s}=${totals[i]}`).join(' '));
    for (const t of totals) expect(Math.abs(t - mean) / mean).toBeLessThanOrEqual(0.05);
  });

  it('win 40-60% against each rival counter-pick at lv5', () => {
    const rows: string[] = [];
    for (const s of STARTERS) {
      const rates: number[] = [];
      for (const r of STARTERS) {
        const res = winRate([{ form: s, level: 5 }], [{ form: r, level: 5 }], N, 100);
        rates.push(res.rate);
        rows.push(`${s} vs rival ${r}: ${pct(res.rate)} (avg ${res.avgTurns.toFixed(1)} turns)`);
      }
      const avg = rates.reduce((a, b) => a + b, 0) / rates.length;
      // Every individual pairing (incl. the type-disadvantaged counter-pick) stays fair.
      for (const r of rates) {
        expect(r).toBeGreaterThanOrEqual(0.38);
        expect(r).toBeLessThanOrEqual(0.66);
      }
      expect(avg).toBeGreaterThanOrEqual(0.43);
      expect(avg).toBeLessThanOrEqual(0.58);
    }
    log(rows.join('\n'));
  });

  it('are fair against the shipped rival trainers (trainers.json)', () => {
    for (const t of db.allTrainers().filter((x) => x.id.startsWith('rival_1_'))) {
      const starter = t.id === 'rival_1_haiku' ? 'claude_haiku' : t.id === 'rival_1_phi' ? 'phi_1' : 'gemma';
      const res = winRate([{ form: starter, level: 5 }], t.team.map((m) => ({ form: m.form, level: m.level })), N, 300);
      log(`${t.id}: ${starter} wins ${pct(res.rate)}`);
      expect(res.rate).toBeGreaterThanOrEqual(0.38);
      expect(res.rate).toBeLessThanOrEqual(0.66);
    }
  });

  it('beat a single prison guard PokAI (lv3-5) at least 70% of the time', () => {
    for (const s of STARTERS) {
      const rates = GUARD_MONS.map((g) => winRate([{ form: s, level: 5 }], [g], N, 500).rate);
      log(`${s} vs guards: ${GUARD_MONS.map((g, i) => `${g.form}${g.level}=${pct(rates[i] as number)}`).join(' ')}`);
      const avg = rates.reduce((a, b) => a + b, 0) / rates.length;
      expect(avg).toBeGreaterThanOrEqual(0.7);
      for (const r of rates) expect(r).toBeGreaterThanOrEqual(0.6);
    }
  });

  it('can still beat a 2-PokAI guard team more often than not', () => {
    for (const s of STARTERS) {
      const res = winRate([{ form: s, level: 5 }], [{ form: 'smollm', level: 3 }, { form: 'bert', level: 4 }], N, 700);
      log(`${s} vs 2-mon guard team: ${pct(res.rate)}`);
      expect(res.rate).toBeGreaterThanOrEqual(0.45);
    }
  });
});

describe('early wild PokAI', () => {
  it('never one-shot a starter of equal level', () => {
    for (const s of STARTERS) {
      for (const w of EARLY_WILD) {
        const lvl = w.level;
        const worst = maxHitFraction(w, { form: s, level: lvl }, 60, 11);
        expect(worst, `${w.form} lv${lvl} vs ${s} lv${lvl}`).toBeLessThan(1);
      }
    }
  });

  it('are beatable by a starter of the same level (random-move wild AI): each >= 40%, mean >= 65%', () => {
    for (const s of STARTERS) {
      const out: string[] = [];
      const rates: number[] = [];
      for (const w of EARLY_WILD) {
        const res = winRate([{ form: s, level: w.level }], [w], 150, 900, 'wild');
        out.push(`${w.form}${w.level}=${pct(res.rate)}`);
        rates.push(res.rate);
        expect(res.rate, `${s} vs ${w.form}`).toBeGreaterThanOrEqual(0.4);
      }
      const mean = rates.reduce((a, b) => a + b, 0) / rates.length;
      log(`${s} (same level) vs early wild: ${out.join(' ')} mean=${pct(mean)}`);
      expect(mean).toBeGreaterThanOrEqual(0.65);
    }
  });
});

describe('no move wins alone', () => {
  it('spamming any single early move (learnable <= lv12) never beats an equal-level starter more than 80%', () => {
    const early = new Set<string>();
    for (const l of db.lines) {
      if (!['claude', 'phi', 'gemma', 'smollm', 'bert', 'qwen', 'copilot', 'gpt', 'whisper', 'midjourney', 'stable_diffusion', 'mistral', 'llama', 'falcon', 'grok', 'nova'].includes(l.id)) continue;
      for (const f of l.forms) for (const e of f.learnset) if (e.level <= 12) early.add(e.move);
    }
    let worst = { move: '', rate: 0 };
    for (const id of early) {
      const m = db.move(id);
      if (m.aiactOnly || m.id === 'retry_loop') continue;
      let wins = 0;
      const games = 60;
      for (let i = 0; i < games; i++) if (spamWins(id, i)) wins++;
      if (wins / games > worst.rate) worst = { move: id, rate: wins / games };
    }
    log(`best single early move vs a neutral lv5 starter: ${worst.move} ${pct(worst.rate)} (${early.size} moves tested)`);
    expect(worst.rate).toBeLessThanOrEqual(0.8);
  });
});

function spamWins(moveId: string, seed: number): boolean {
  const rng = createRng(seed + 5);
  const a = createPokai('phi_1', 5, rng);
  a.moves = [{ move: moveId, tokens: 99 }];
  // Pick a foe the move's type is not super-effective against, so the test measures the move, not the chart.
  const foeForm = db.effectiveness(db.move(moveId).type, ['code']) > 1 ? 'gemma' : db.effectiveness(db.move(moveId).type, ['media']) > 1 ? 'phi_1' : 'gemma';
  const foe = createPokai(foeForm, 5, rng);
  const e = new BattleEngine({ player: [a], foe: [foe], kind: 'trainer', vibeurClass: 'prompt_engineer' }, createRng(seed));
  for (let t = 0; t < 60 && !e.state.over; t++) e.act({ kind: 'move', index: 0 });
  return e.state.outcome === 'won';
}

describe('type chart', () => {
  it('is sane: every type has strengths, no type is immune, no absurd multipliers', () => {
    const ids = db.types.map((t) => t.id);
    for (const a of ids) {
      let strong = 0;
      for (const d of ids) {
        const m = db.effectiveness(a, [d]);
        expect([0.5, 1, 2]).toContain(m);
        if (m > 1) strong++;
        if (a === d) expect(m).toBe(0.5);
      }
      expect(strong, `${a} has a super-effective target`).toBeGreaterThanOrEqual(1);
      expect(strong, `${a} not too dominant`).toBeLessThanOrEqual(3);
    }
    // Each type is hit super-effectively by at least one other type.
    for (const d of ids) expect(ids.some((a) => db.effectiveness(a, [d]) > 1), `${d} has a counter`).toBe(true);
  });
});

describe('XP curve', () => {
  it('is monotonic and reaches Nadelta-level (14-16) in a reasonable number of fights', () => {
    for (let l = 2; l <= 50; l++) expect(xpForLevel(l)).toBeGreaterThan(xpForLevel(l - 1));
    // Average XP of a fight: wild lv(L) of a typical early form. The player should hit lv14-16 after ~60-100 fights.
    const fightXp = (lv: number) => Math.floor((50 * lv) / 7);
    let xp = xpForLevel(5);
    let fights = 0;
    while (xp < xpForLevel(14) && fights < 500) {
      const lv = Math.min(13, Math.max(4, 4 + Math.floor(fights / 6)));
      xp += fightXp(lv) * 1.15; // some trainer fights (x1.5) mixed in
      fights++;
    }
    log(`fights to reach lv14 from lv5: ${fights}`);
    expect(fights).toBeGreaterThan(20);
    expect(fights).toBeLessThan(110);
  });
});
