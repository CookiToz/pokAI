// Seeded battle simulation harness used by balance.test.ts (pure: no Phaser, no DOM).
import { db } from '../../data/db';
import type { Move } from '../../data/types';
import type { PokaiInstance } from '../../state/types';
import { BattleEngine, STAB } from '../battle';
import { createPokai, maxContext, pokaiStats } from '../pokai';
import { createRng } from '../rng';

/** `curate`: the simulated player keeps the best attacks when a learnset overflows 4 moves (as a human would). */
export const simOptions: { curate: boolean; bag: Record<string, number> } = { curate: false, bag: {} };

function curateMoves(p: PokaiInstance): void {
  const form = db.form(p.form);
  const known = [...new Set(form.learnset.filter((e) => e.level <= p.level).map((e) => e.move))];
  const types = form.types;
  const dmg = known
    .map((m) => db.move(m))
    .filter((m) => m.category === 'damage')
    .sort((a, b) => b.power * (types.includes(b.type) ? 1.5 : 1) * (b.accuracy / 100) - a.power * (types.includes(a.type) ? 1.5 : 1) * (a.accuracy / 100));
  // Two best attacks, then the best attack of another type (one coverage move), as a human builds a 4-move set.
  const picked: Move[] = dmg.slice(0, 2);
  const cover = dmg.slice(2).find((m) => !picked.some((p) => p.type === m.type)) ?? dmg[2];
  if (cover) picked.push(cover);
  const keep = picked.map((m) => m.id);
  const other = known.filter((m) => !keep.includes(m) && db.move(m).category !== 'damage');
  const set = [...keep, ...other].slice(0, 4);
  for (const m of known) if (set.length < 4 && !set.includes(m)) set.push(m);
  p.moves = set.map((m) => ({ move: m, tokens: db.move(m).tokens }));
}

export interface TeamSpec {
  form: string;
  level: number;
}

export interface SimResult {
  wins: number;
  games: number;
  rate: number;
  avgTurns: number;
  /** Battles where the foe's first PokAI was one-shot on the very first player move. */
  oneShots: number;
}

/** A reasonable human-ish policy: best expected damage, status when the foe is clean, heal when low. */
export function pickPlayerMove(e: BattleEngine): number {
  const me = e.active('player');
  const foe = e.active('foe');
  const foeTypes = e.typesOf('foe');
  const myTypes = e.typesOf('player');
  const hp = me.context / Math.max(1, maxContext(me));
  const ms = pokaiStats(me);
  const fs = pokaiStats(foe);
  let best = -1;
  let bestScore = -1;
  me.moves.forEach((slot, i) => {
    if (slot.tokens <= 0) return;
    const mv: Move = db.move(slot.move);
    let score = 0;
    if (mv.category === 'damage') {
      const eff = db.effectiveness(mv.type, foeTypes);
      const stab = myTypes.includes(mv.type) ? STAB : 1;
      const hits = mv.effect?.multiHit ? (mv.effect.multiHit[0] + mv.effect.multiHit[1]) / 2 : 1;
      const ratio = ms.power / Math.max(1, fs.robustness);
      score = mv.power * hits * eff * stab * (mv.accuracy / 100) * ratio * (mv.effect?.chargeTurns ? 0.5 : 1);
      if (mv.effect?.status && !foe.status) score *= 1 + (mv.effect.statusChance ?? 1) * 0.25;
    } else if (mv.category === 'heal') {
      score = hp < 0.4 ? 90 : 0;
    } else if (mv.category === 'status') {
      const st = mv.effect?.status;
      const clean = !foe.status && st !== undefined && e.statusImmunity('foe', st) === null;
      score = clean ? 45 * (mv.accuracy / 100) : 0;
    } else if (mv.category === 'buff' || mv.category === 'debuff') {
      score = e.state.turn <= 1 ? 40 : 5;
    } else {
      score = 3;
    }
    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  });
  return best >= 0 ? best : 0;
}

export function playBattle(
  player: TeamSpec[],
  foe: TeamSpec[],
  seed: number,
  kind: 'wild' | 'trainer' = 'trainer',
  maxTurns = 120,
  badges?: number,
  trainerId?: string,
): { won: boolean; turns: number; oneShot: boolean; engine: BattleEngine } {
  const rng = createRng(seed);
  const mk = (t: TeamSpec): PokaiInstance => createPokai(t.form, t.level, rng);
  const p = player.map(mk);
  if (simOptions.curate) p.forEach(curateMoves);
  const f = foe.map(mk);
  const engine = new BattleEngine({ player: p, foe: f, kind, vibeurClass: 'prompt_engineer', ...(badges !== undefined ? { badges } : {}), ...(trainerId ? { trainerId } : {}) }, createRng(seed ^ 0x9e3779b9));
  const firstFoe = f[0] as PokaiInstance;
  const foeMax = maxContext(firstFoe);
  let oneShot = false;
  const usedItems = { cafe: 0, red_bull: 0 };
  let first = true;
  let turns = 0;
  while (!engine.state.over && turns < maxTurns) {
    turns++;
    if (engine.state.needSwitch) {
      const idx = engine.player.findIndex((x) => x.context > 0);
      engine.act({ kind: 'switch', index: idx });
      continue;
    }
    const me = engine.active('player');
    const bag = { ...simOptions.bag };
    const heal = (bag['red_bull'] ?? 0) > 0 && me.context < maxContext(me) * 0.35 ? 'red_bull' : (bag['cafe'] ?? 0) > 0 && me.context < maxContext(me) * 0.25 ? 'cafe' : null;
    if (heal && usedItems[heal as 'cafe' | 'red_bull'] < (simOptions.bag[heal] ?? 0)) {
      usedItems[heal as 'cafe' | 'red_bull']++;
      engine.act({ kind: 'item', itemId: heal, targetUid: me.uid });
      continue;
    }
    engine.act({ kind: 'move', index: pickPlayerMove(engine) });
    if (first) {
      first = false;
      if (firstFoe.context <= 0 && foeMax > 0) oneShot = true;
    }
  }
  return { won: engine.state.outcome === 'won', turns, oneShot, engine };
}

export function winRate(player: TeamSpec[], foe: TeamSpec[], n: number, seed0 = 1, kind: 'wild' | 'trainer' = 'trainer', badges?: number, trainerId?: string): SimResult {
  let wins = 0;
  let turns = 0;
  let oneShots = 0;
  for (let i = 0; i < n; i++) {
    const r = playBattle(player, foe, seed0 + i * 7919, kind, 120, badges, trainerId);
    if (r.won) wins++;
    turns += r.turns;
    if (r.oneShot) oneShots++;
  }
  return { wins, games: n, rate: wins / n, avgTurns: turns / n, oneShots };
}

/**
 * Worst single-hit damage (fraction of the defender's max context) the attacker can deal at full HP
 * with any damaging move it knows at its level. Crits and rolls are included (n seeds per move).
 */
export function maxHitFraction(att: TeamSpec, def: TeamSpec, n: number, seed0 = 1): number {
  let worst = 0;
  const probe = createPokai(att.form, att.level, createRng(1));
  for (const slot of probe.moves) {
    if (db.move(slot.move).category !== 'damage') continue;
    for (let i = 0; i < n; i++) {
      const rng = createRng(seed0 + i);
      const a = createPokai(att.form, att.level, rng);
      a.moves = [{ move: slot.move, tokens: 99 }];
      const d = createPokai(def.form, def.level, rng);
      d.moves = [{ move: 'unit_tests', tokens: 99 }]; // harmless buff
      const engine = new BattleEngine({ player: [d], foe: [a], kind: 'wild', vibeurClass: 'prompt_engineer' }, createRng(seed0 + i * 31));
      const max = maxContext(d);
      let dealt = 0;
      for (const ev of engine.act({ kind: 'move', index: 0 })) {
        if (ev.kind === 'damage' && ev.side === 'player') dealt += ev.amount;
      }
      worst = Math.max(worst, dealt / max);
    }
  }
  return worst;
}

/** Debug helper: plays one battle and returns the message log. */
export function battleLog(player: TeamSpec[], foe: TeamSpec[], seed: number): string[] {
  const rng = createRng(seed);
  const p = player.map((t) => createPokai(t.form, t.level, rng));
  const f = foe.map((t) => createPokai(t.form, t.level, rng));
  const engine = new BattleEngine({ player: p, foe: f, kind: 'trainer', vibeurClass: 'prompt_engineer' }, createRng(seed ^ 0x9e3779b9));
  const out: string[] = [];
  for (let t = 0; t < 80 && !engine.state.over; t++) {
    if (engine.state.needSwitch) {
      engine.act({ kind: 'switch', index: engine.player.findIndex((x) => x.context > 0) });
      continue;
    }
    const idx = pickPlayerMove(engine);
    out.push(`-- turn ${engine.state.turn}: player picks ${engine.active('player').moves[idx]?.move}`);
    for (const ev of engine.act({ kind: 'move', index: idx })) {
      if (ev.kind === 'message') out.push('   ' + ev.text);
      else if (ev.kind === 'move_used') out.push(`   [${ev.side}] ${ev.moveId}`);
      else if (ev.kind === 'damage') out.push(`   dmg ${ev.side} -${ev.amount} -> ${ev.hp}/${ev.maxHp}`);
    }
  }
  return out;
}
