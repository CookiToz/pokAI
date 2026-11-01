import { describe, expect, it } from 'vitest';
import { db } from '../data/db';
import type { PokaiInstance } from '../state/types';
import { BattleEngine, createTrainerTeam, type BattleEvent } from './battle';
import { createPokai, maxContext } from './pokai';
import { createRng } from './rng';

function run(engine: BattleEngine, maxTurns = 200): BattleEvent[] {
  const all: BattleEvent[] = [];
  for (let i = 0; i < maxTurns && !engine.state.over; i++) {
    if (engine.state.needSwitch) {
      const idx = engine.player.findIndex((p) => p.context > 0);
      all.push(...engine.act({ kind: 'switch', index: idx }));
      continue;
    }
    const me = engine.active('player');
    const idx = Math.max(0, me.moves.findIndex((m) => m.tokens > 0 && db.move(m.move).category === 'damage'));
    all.push(...engine.act({ kind: 'move', index: idx }));
  }
  return all;
}

describe('damage', () => {
  it('super-effective hits deal more than resisted ones', () => {
    const avg = (atkForm: string, defForm: string, moveId: string) => {
      let total = 0;
      for (let s = 0; s < 40; s++) {
        const a = createPokai(atkForm, 20, createRng(s));
        a.moves = [{ move: moveId, tokens: 99 }];
        const d = createPokai(defForm, 20, createRng(s + 1000));
        d.moves = [{ move: 'unit_tests', tokens: 99 }];
        const e = new BattleEngine({ player: [a], foe: [d], kind: 'wild', vibeurClass: 'prompt_engineer' }, createRng(s));
        const ev = e.act({ kind: 'move', index: 0 });
        for (const x of ev) if (x.kind === 'damage' && x.side === 'foe') total += x.amount;
      }
      return total / 40;
    };
    const strong = avg('phi_1', 'claude_haiku', 'hello_world'); // code -> chat x2
    const weak = avg('phi_1', 'copilot', 'hello_world'); // code -> code x0.5
    expect(strong).toBeGreaterThan(weak * 2.5);
    expect(strong).toBeGreaterThan(0);
  });

  it('open-weights are immune to API outage', () => {
    const a = createPokai('copilot', 15, createRng(1));
    a.moves = [{ move: 'compliance', tokens: 10 }];
    const open = createPokai('phi_1', 15, createRng(2));
    const prop = createPokai('claude_haiku', 15, createRng(3));
    for (const [target, expected] of [[open, false], [prop, true]] as const) {
      target.moves = [{ move: 'unit_tests', tokens: 10 }];
      const e = new BattleEngine({ player: [target], foe: [a], kind: 'trainer', vibeurClass: 'prompt_engineer' }, createRng(4));
      const ev = e.act({ kind: 'move', index: 0 });
      const hit = ev.some((x) => x.kind === 'status' && x.side === 'player' && x.status === 'api_outage');
      expect(hit).toBe(expected);
    }
  });
});

describe('full battles', () => {
  it('a wild battle runs to the end deterministically and grants XP', () => {
    const play = (seed: number) => {
      const me = createPokai('claude_haiku', 8, createRng(seed));
      const foe = createPokai('smollm', 4, createRng(seed + 1));
      const engine = new BattleEngine({ player: [me], foe: [foe], kind: 'wild', vibeurClass: 'prompt_engineer' }, createRng(seed));
      const ev = run(engine);
      return { engine, ev, me };
    };
    const a = play(11);
    const b = play(11);
    expect(a.engine.state.over).toBe(true);
    const strip = (ev: BattleEvent[]) => JSON.stringify(ev).replace(/"uid":"[^"]*"/g, '');
    expect(strip(a.ev)).toEqual(strip(b.ev));
    expect(a.engine.state.outcome).toBe('won');
    expect(a.ev.some((e) => e.kind === 'faint' && e.side === 'foe')).toBe(true);
    expect(a.ev.some((e) => e.kind === 'xp' && e.amount > 0)).toBe(true);
    expect(a.ev[a.ev.length - 1]).toEqual({ kind: 'end', outcome: 'won' });
  });

  it('a trainer battle with several PokAI and switches ends', () => {
    for (let seed = 0; seed < 10; seed++) {
      const party: PokaiInstance[] = [createPokai('smollm', 5, createRng(seed)), createPokai('bert', 5, createRng(seed + 1))];
      const foe = createTrainerTeam('leader_nadelta', createRng(seed));
      const engine = new BattleEngine({ player: party, foe, kind: 'trainer', trainerId: 'leader_nadelta', vibeurClass: 'doomer' }, createRng(seed));
      const ev = run(engine, 500);
      expect(engine.state.over).toBe(true);
      expect(engine.state.outcome).toBe('lost');
      expect(ev.some((e) => e.kind === 'need_switch')).toBe(true);
    }
  });

  it('cannot flee or onboard in trainer battles; onboard needs a weakened foe', () => {
    const me = createPokai('claude_haiku', 10, createRng(1));
    const foe = createPokai('smollm', 3, createRng(2));
    const t = new BattleEngine({ player: [me], foe: [createPokai('smollm', 3, createRng(3))], kind: 'trainer', vibeurClass: 'vibe_coder' }, createRng(1));
    expect(t.act({ kind: 'flee' })[0]?.kind).toBe('message');
    expect(t.act({ kind: 'onboard' })[0]?.kind).toBe('message');
    const w = new BattleEngine({ player: [me], foe: [foe], kind: 'wild', vibeurClass: 'vibe_coder' }, createRng(1));
    expect(w.act({ kind: 'onboard' })[0]?.kind).toBe('message');
    foe.context = Math.floor(maxContext(foe) * 0.3);
    expect(w.act({ kind: 'onboard' })).toEqual([{ kind: 'onboard_ready' }]);
    const ev = w.resolveOnboarding('success');
    expect(ev[ev.length - 1]).toEqual({ kind: 'end', outcome: 'won' });
  });

  it('AIACT sealed PokAI carry an AIACT move', () => {
    const team = createTrainerTeam('aiact_grunt_port_2', createRng(1));
    for (const p of team) {
      expect(p.sealed).toBe(true);
      expect(p.moves.some((m) => db.move(m.move).aiactOnly)).toBe(true);
    }
  });
});

describe('battle lead', () => {
  it('opens with the first PokAI of the party that can still fight', () => {
    const rng = createRng(11);
    const party = [createPokai('claude_haiku', 10, rng), createPokai('smollm', 10, rng), createPokai('gemma', 10, rng)];
    party[0]!.context = 0;
    const eng = new BattleEngine({ player: party, foe: [createPokai('gemma', 5, rng)], kind: 'wild', vibeurClass: 'vibe_coder' }, rng);
    expect(eng.active('player')).toBe(party[1]);
    party.splice(0, 0, party.splice(2, 1)[0]!); // gemma first
    const eng2 = new BattleEngine({ player: party, foe: [createPokai('gemma', 5, rng)], kind: 'wild', vibeurClass: 'vibe_coder' }, rng);
    expect(eng2.active('player').form).toBe('gemma');
  });
});
