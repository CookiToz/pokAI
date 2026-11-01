// Main-path campaign model: expected PokAI levels at each leader from the brief's encounter bands. Pure, deterministic per seed.
import { db } from '../../data/db';
import { levelGapFactor, earlyXpBoost, LUCKY_XP_CHANCE, LUCKY_XP_MULT, TRAINER_XP_MULT, XP_SCALE } from '../progression-rewards';
import { createRng, type Rng } from '../rng';
import { xpForLevel } from '../stats';
import type { TeamSpec } from './runner';

export interface WildSlot {
  form: string;
  min: number;
  max: number;
  w: number;
}
export interface TrainerSpec {
  id: string;
  team: TeamSpec[];
  reward: number;
}
export interface Segment {
  id: string;
  /** Wild fights taken while walking through (encounter rate x cable steps), without grinding. */
  wildFights: number;
  wild: WildSlot[];
  trainers: TrainerSpec[];
  /** A support PokAI caught here (joins at the typical wild level - 1). */
  catches?: string;
  leader?: { id: string; team: TeamSpec[]; reward: number; badges: number };
}

/** Trainer mirrored from shared/data/trainers.json (single source of truth for prison and leaders). */
const D = (simId: string, dataId: string): TrainerSpec => {
  const t = db.trainer(dataId);
  return { id: simId, reward: t.reward, team: t.team.map((m) => ({ form: m.form, level: m.level })) };
};
const L = (id: string, badges: number): NonNullable<Segment['leader']> => {
  const t = D(id, id);
  return { id, badges, reward: t.reward, team: t.team };
};

const T = (id: string, reward: number, ...team: [string, number][]): TrainerSpec => ({ id, reward, team: team.map(([form, level]) => ({ form, level })) });

/** Recommended world layout (levels and counts) used by the sim, mirrored in the report for world-content. */
export const CAMPAIGN: Segment[] = [
  {
    id: 'prison',
    wildFights: 0,
    wild: [],
    trainers: [D('guard1', 'aiact_guard_1'), D('guard2', 'aiact_guard_2'), D('guard3', 'aiact_guard_3'), D('guard4', 'aiact_guard_4'), D('inspector_cookie', 'inspector_cookie'), D('rival_1', 'rival_1_haiku')],
  },
  {
    id: 'latentia_city',
    wildFights: 12,
    catches: 'gpt_2',
    wild: [{ form: 'smollm', min: 4, max: 6, w: 35 }, { form: 'bert', min: 4, max: 6, w: 30 }, { form: 'gpt_2', min: 5, max: 7, w: 20 }, { form: 'qwen', min: 5, max: 7, w: 20 }, { form: 'mistral_7b', min: 6, max: 8, w: 6 }],
    trainers: [T('kid', 100, ['smollm', 4], ['smollm', 5]), T('vibeur', 150, ['qwen', 6], ['smollm', 5]), T('dev', 170, ['copilot', 6], ['gpt_2', 6]), T('sci', 190, ['sd_1_5', 6], ['mistral_7b', 7]), T('agent1', 220, ['whisper_tiny', 6], ['midjourney_v5', 7]), T('agent2', 240, ['gpt_2', 7], ['qwen', 7])],
    leader: L('leader_nadelta', 0),
  },
  {
    id: 'route_foret_poids',
    wildFights: 22,
    catches: 'mistral_7b',
    wild: [{ form: 'smollm', min: 8, max: 10, w: 20 }, { form: 'qwen', min: 8, max: 11, w: 25 }, { form: 'falcon_7b', min: 9, max: 12, w: 20 }, { form: 'llama_2', min: 10, max: 13, w: 15 }, { form: 'copilot', min: 10, max: 14, w: 20 }],
    trainers: [T('f1', 220, ['qwen', 9], ['smollm', 9]), T('f2', 250, ['falcon_7b', 10], ['bert', 10]), T('f3', 280, ['llama_2', 11], ['copilot', 11]), T('f4', 300, ['sd_1_5', 12], ['mistral_7b', 12]), T('f5', 330, ['whisper_tiny', 12], ['codestral', 13]), T('f_agent', 380, ['gpt_2', 12], ['whisper_base', 13])],
  },
  {
    id: 'hugging_grove',
    wildFights: 12,
    catches: 'llama_2',
    wild: [{ form: 'llama_2', min: 12, max: 15, w: 30 }, { form: 'olmo', min: 12, max: 15, w: 25 }, { form: 'falcon_7b', min: 13, max: 16, w: 25 }, { form: 'mistral_7b', min: 13, max: 16, w: 20 }],
    trainers: [T('g1', 330, ['olmo', 14], ['qwen', 14]), T('g2', 360, ['llama_2', 15], ['falcon_7b', 15]), T('g3', 400, ['mistral_7b', 15], ['sd_1_5', 15]), T('g4', 450, ['codestral', 16], ['whisper_base', 16])],
    leader: L('leader_menschtral', 1),
  },
  {
    id: 'sentier_cotier',
    wildFights: 22,
    catches: 'qwen',
    wild: [{ form: 'qwen_2_5', min: 16, max: 19, w: 25 }, { form: 'whisper_base', min: 16, max: 20, w: 25 }, { form: 'sdxl', min: 18, max: 21, w: 20 }, { form: 'gpt_3_5', min: 17, max: 21, w: 20 }, { form: 'midjourney_v6', min: 19, max: 22, w: 10 }],
    trainers: [T('s1', 420, ['whisper_base', 17], ['qwen_2_5', 17]), T('s2', 450, ['sdxl', 18], ['gpt_3_5', 18]), T('s3', 500, ['llama_3', 19], ['falcon_7b', 19]), T('s4', 540, ['mixtral_8x7b', 20], ['whisper_base', 20]), T('s5', 600, ['deepseek_v3', 21], ['sdxl', 21])],
  },
  {
    id: 'port_8080',
    wildFights: 12,
    catches: 'whisper_tiny',
    wild: [{ form: 'gpt_3_5', min: 20, max: 24, w: 28 }, { form: 'midjourney_v6', min: 21, max: 25, w: 25 }, { form: 'qwen_2_5', min: 21, max: 25, w: 25 }, { form: 'deepseek_v3', min: 23, max: 26, w: 12 }],
    trainers: [T('p1', 600, ['gpt_3_5', 22], ['midjourney_v6', 22]), T('p2', 650, ['qwen_2_5', 23], ['sdxl', 23]), T('p3', 700, ['deepseek_v3', 24], ['whisper_base', 24]), T('p4', 760, ['llama_3', 25], ['gpt_3_5', 25])],
    leader: L('leader_hassabyte', 2),
  },
];

interface Member {
  form: string;
  level: number;
  xp: number;
}

function evolveIfDue(m: Member): void {
  for (;;) {
    const e = db.form(m.form).evolutions.find((x) => m.level >= x.level && db.hasForm(x.to) && !db.form(x.to).unobtainable);
    if (!e) return;
    m.form = e.to;
  }
}

function award(m: Member, foe: TeamSpec, kind: 'wild' | 'trainer', participants: number): void {
  const total = Math.max(1, Math.floor(((db.form(foe.form).xpYield * foe.level) / 7) * XP_SCALE * (kind === 'trainer' ? TRAINER_XP_MULT : 1)));
  const base = Math.ceil(total / participants);
  const luck = 1 + LUCKY_XP_CHANCE * (LUCKY_XP_MULT - 1);
  m.xp += Math.max(1, Math.round(base * levelGapFactor(foe.level, m.level) * earlyXpBoost(m.level) * luck));
  while (m.level < 100 && m.xp >= xpForLevel(m.level + 1)) m.level++;
  evolveIfDue(m);
}

export interface Checkpoint {
  segment: string;
  /** Level of the lead and the support mons when reaching the leader (before the fight). */
  team: TeamSpec[];
  wildFights: number;
  credits: number;
}

export interface RunOptions {
  /** Extra wild fights per segment (light grinding). */
  grind?: number;
  /** Fraction of fights where only the lead takes part. */
  leadOnly?: number;
  /** Open the Forêt before fighting Nadelta (otherwise the forest is locked until badge 1). */
  forestFirst?: boolean;
  /** Skip optional trainers (fraction of non-guard trainers fought). */
  trainerRate?: number;
}

function pickWild(seg: Segment, rng: Rng): TeamSpec {
  const total = seg.wild.reduce((s, w) => s + w.w, 0);
  let r = rng.next() * total;
  for (const w of seg.wild) {
    r -= w.w;
    if (r < 0) return { form: w.form, level: rng.int(w.min, w.max) };
  }
  const w = seg.wild[0] as WildSlot;
  return { form: w.form, level: w.min };
}

/** Plays the main path once and returns the party at each leader. */
export function runCampaign(starter: string, seed: number, opts: RunOptions = {}): Checkpoint[] {
  const rng = createRng(seed);
  const leadOnly = opts.leadOnly ?? 0.45;
  const trainerRate = opts.trainerRate ?? 1;
  const party: Member[] = [{ form: starter, level: 5, xp: xpForLevel(5) }];
  let credits = 500;
  let wildTotal = 0;
  const out: Checkpoint[] = [];
  const fight = (foe: TeamSpec, kind: 'wild' | 'trainer'): void => {
    const lead = party[0] as Member;
    const mate = party.length > 1 && !rng.chance(leadOnly) ? (rng.pick(party.slice(1)) as Member) : null;
    const parts = mate ? 2 : 1;
    award(lead, foe, kind, parts);
    if (mate) award(mate, foe, kind, parts);
  };
  let order = CAMPAIGN;
  if (opts.forestFirst) {
    const [prison, city, forest, ...rest] = CAMPAIGN as [Segment, Segment, Segment, ...Segment[]];
    const { leader, ...cityNoLeader } = city;
    order = [prison, cityNoLeader as Segment, forest, { ...city, id: 'latentia_city', wildFights: 0, trainers: [], wild: [], catches: undefined, ...(leader ? { leader } : {}) } as Segment, ...rest];
  }
  for (const seg of order) {
    if (seg.catches) {
      const avg = seg.wild.length ? Math.round(seg.wild.reduce((s, w) => s + ((w.min + w.max) / 2) * w.w, 0) / seg.wild.reduce((s, w) => s + w.w, 0)) : 6;
      const m: Member = { form: seg.catches, level: Math.max(2, avg), xp: 0 };
      m.xp = xpForLevel(m.level);
      evolveIfDue(m);
      party.push(m);
    }
    const n = seg.wildFights + (seg.wild.length > 0 ? opts.grind ?? 0 : 0);
    for (let i = 0; i < n; i++) {
      fight(pickWild(seg, rng), 'wild');
      wildTotal++;
      if (rng.chance(0.18)) credits += 0; // drops are items, no credits
    }
    for (const t of seg.trainers) {
      const optional = seg.id !== 'prison';
      if (optional && !rng.chance(trainerRate)) continue;
      for (const m of t.team) fight(m, 'trainer');
      credits += t.reward;
    }
    if (seg.leader) {
      out.push({ segment: seg.id, team: party.slice(0, seg.leader.team.length).map((m) => ({ form: m.form, level: m.level })), wildFights: wildTotal, credits });
      for (const m of seg.leader.team) fight(m, 'trainer');
      credits += seg.leader.reward;
    }
  }
  return out;
}
