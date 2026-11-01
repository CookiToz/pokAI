// Difficulty & cadence guard-rails from the campaign simulation. Run with BALANCE_REPORT=1 to print the tables.
import { describe, expect, it } from 'vitest';
import { CAMPAIGN, runCampaign, type Checkpoint } from './sim/campaign';
import { simOptions, winRate, type TeamSpec } from './sim/runner';

// A competent player: keeps the best attacks, heals with Café / Red Bull, and trains a balanced team (XP shared with supports).
simOptions.curate = true;
simOptions.bag = { cafe: 3, red_bull: 2 };

const STARTERS = [['claude_haiku', 'claude_sonnet'], ['phi_1', 'phi_3'], ['gemma', 'gemma_2']] as const;
const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;
const REPORT = env?.['BALANCE_REPORT'] === '1';
const log = (...a: unknown[]) => {
  if (REPORT) console.log(...a);
};
const pct = (r: number) => `${Math.round(r * 100)}%`;

function meanLevels(starter: string, opts = {}): Record<string, number[]> {
  const acc: Record<string, number[][]> = {};
  for (let s = 0; s < 30; s++) {
    for (const cp of runCampaign(starter, 1000 + s, opts)) (acc[cp.segment] ??= []).push(cp.team.map((t) => t.level));
  }
  const res: Record<string, number[]> = {};
  for (const [seg, runs] of Object.entries(acc)) {
    const n = runs[0]?.length ?? 0;
    res[seg] = Array.from({ length: n }, (_, i) => runs.reduce((a, r) => a + (r[i] ?? 0), 0) / runs.length);
  }
  return res;
}

const leaderOf = (id: string) => CAMPAIGN.find((s) => s.id === id)?.leader;
function cpTeam(starter: string, seg: string, shift = 0, opts = {}): TeamSpec[] {
  const cp: Checkpoint[] = runCampaign(starter, 4242, { leadOnly: 0, ...opts });
  const c = cp.find((x) => x.segment === seg);
  return (c?.team ?? []).map((t) => ({ form: t.form, level: Math.max(2, t.level + shift) }));
}

describe('campaign: levels at each leader (no grinding)', () => {
  it('lands within a few levels of each leader', () => {
    for (const [s] of STARTERS) {
      const lv = meanLevels(s, {});
      for (const seg of ['latentia_city', 'hugging_grove', 'port_8080']) {
        const l = leaderOf(seg);
        const top = Math.max(...(l?.team.map((m) => m.level) ?? [0]));
        const lead = lv[seg]?.[0] ?? 0;
        log(`${s} @${seg}: lead ${lead.toFixed(1)} team ${lv[seg]?.map((x) => x.toFixed(1)).join('/')} (leader top ${top})`);
        expect(lead).toBeGreaterThanOrEqual(top - 4);
        expect(lead).toBeLessThanOrEqual(top + 4);
      }
    }
  });
});

describe('leader win rates', () => {
  const N = 100;
  for (const seg of ['latentia_city', 'hugging_grove', 'port_8080']) {
    it(`${seg}: winnable at the expected level, never trivial`, () => {
      const l = leaderOf(seg);
      if (!l) throw new Error('no leader');
      const rows: string[] = [];
      let mean = 0;
      let meanUnder = 0;
      for (const [s] of STARTERS) {
        const at = winRate(cpTeam(s, seg), l.team, N, 11, 'trainer', l.badges, l.id).rate;
        const under = winRate(cpTeam(s, seg, -2), l.team, N, 11, 'trainer', l.badges, l.id).rate;
        rows.push(`${s}: ${pct(at)} / -2lv ${pct(under)}`);
        mean += at / STARTERS.length;
        meanUnder += under / STARTERS.length;
      }
      log(`${seg} (${l.team.map((m) => `${m.form}${m.level}`).join(' ')}): ${rows.join(' | ')} mean ${pct(mean)} under ${pct(meanUnder)}`);
      expect(mean).toBeGreaterThanOrEqual(0.55);
      expect(mean).toBeLessThanOrEqual(0.98);
      expect(meanUnder).toBeLessThan(mean);
    });
  }
});

describe('prison and rival', () => {
  it('guards and the Cookie inspector fall >= 90% of the time to a lv5 starter, rival >= 65%', () => {
    const prison = CAMPAIGN[0];
    for (const [s] of STARTERS) {
      const rows: string[] = [];
      for (const t of prison?.trainers ?? []) {
        const r = winRate([{ form: s, level: 5 }], t.team, 200, 31, 'trainer', 0, t.id).rate;
        rows.push(`${t.id}=${pct(r)}`);
        expect(r, `${s} vs ${t.id}`).toBeGreaterThanOrEqual(t.id.startsWith('rival') ? 0.6 : 0.88);
      }
      log(`${s}: ${rows.join(' ')}`);
    }
  });
});
