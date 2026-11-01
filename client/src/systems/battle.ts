// Deterministic, event-driven battle engine (1v1, up to 6 per side). Pure.
import { db } from '../data/db';
import type { Move, Stats, StatusId, TypeId } from '../data/types';
import type { PokaiInstance, VibeurClass } from '../state/types';
import { canOnboard } from './onboarding';
import {
  applyItem,
  canUseItem,
  createPokai,
  displayName,
  grantXp,
  isFainted,
  maxContext,
  pokaiStats,
  type ProgressEvent,
} from './pokai';
import { createRng, type Rng } from './rng';
import { stageMultiplier } from './stats';

function fmtTokens(n: number): string {
  return Math.round(n).toLocaleString('fr-FR');
}

import { badgeCount, deliverReward, emitGameEvent } from './progression';
import { FLAWLESS_BONUS, FOE_RANDOM_MOVE_CHANCE_EARLY, earlyXpBoost, foeDamageMultiplier, LUCKY_XP_CHANCE, LUCKY_XP_MULT, TRAINER_XP_MULT, XP_SCALE, levelGapFactor, rollWildDrop } from './progression-rewards';

export type BattleSide = 'player' | 'foe';
export type BattleKind = 'wild' | 'trainer';
export type StageStat = Exclude<keyof Stats, 'context'>;

export type PlayerAction =
  | { kind: 'move'; index: number }
  | { kind: 'switch'; index: number }
  | { kind: 'item'; itemId: string; targetUid?: string }
  | { kind: 'flee' }
  | { kind: 'onboard' };

export type BattleEvent =
  | { kind: 'message'; text: string }
  | { kind: 'move_used'; side: BattleSide; moveId: string }
  | { kind: 'damage'; side: BattleSide; amount: number; hp: number; maxHp: number; effectiveness: number; cause?: 'status' | 'self' | 'recoil' }
  | { kind: 'heal'; side: BattleSide; amount: number; hp: number; maxHp: number }
  | { kind: 'status'; side: BattleSide; status: StatusId | null; /** Turns the status will still last (omitted when cleared). */ turns?: number }
  | { kind: 'status_tick'; side: BattleSide; status: StatusId; /** Turns left after this tick. */ turns: number }
  | { kind: 'stat'; side: BattleSide; stat: keyof Stats; stages: number; total: number }
  | { kind: 'faint'; side: BattleSide }
  | { kind: 'switch_in'; side: BattleSide; index: number }
  | { kind: 'need_switch' }
  | { kind: 'xp'; uid: string; amount: number; events: ProgressEvent[] }
  | { kind: 'onboard_ready' }
  | { kind: 'fled' }
  | { kind: 'end'; outcome: 'won' | 'lost' | 'fled' };

export interface BattleInit {
  player: PokaiInstance[];
  foe: PokaiInstance[];
  kind: BattleKind;
  trainerId?: string;
  vibeurClass: VibeurClass;
  /** Badges owned: drives the early-game difficulty ramp. Omitted = ask the progression runtime, else no ramp. */
  badges?: number;
}

export interface BattleState {
  playerActive: number;
  foeActive: number;
  turn: number;
  over: boolean;
  outcome?: 'won' | 'lost' | 'fled';
  needSwitch: boolean;
}

export const STATUS_NAMES: Record<StatusId, string> = {
  hallucinating: 'Hallucinant',
  rate_limited: 'Rate-limité',
  censored: 'Censuré',
  overheat: 'en Surchauffe',
  maintenance: 'En maintenance',
  deprecated: 'Déprécié',
  api_outage: 'en Panne d\'API',
};

export const STAT_NAMES: Record<keyof Stats, string> = {
  context: 'Contexte',
  power: 'Puissance',
  robustness: 'Robustesse',
  throughput: 'Débit',
  precision: 'Précision',
};

export const STRUGGLE_MOVE = 'retry_loop';
export const CRIT_CHANCE = 1 / 16;
export const CRIT_MULT = 1.5;
export const STAB = 1.5;
/** Global damage tuning: with CONTEXT_SCALE it gives ~6-8 turn fights at every stage of the game. */
export const DAMAGE_SCALE = 0.7;
/** Share of the level gap (defender - attacker) removed from the damage formula's level term. */
export const LEVEL_GAP_DAMPING = 0.5;
/** Catch-up exponent applied to (defender level / attacker level) when the player is the lower-level side: 0 = off, 1 = levels never matter. */
export const LEVEL_RATIO_DAMPING = 0.5;
const HALLU_SELF_HIT = 0.33;
const RATE_LIMIT_SKIP = 0.25;
const RATE_LIMIT_SPEED = 0.75;
/** Displayed tokens per Context point (mirrors the UI scale; used in log lines). */
export const TOKEN_UNIT = 100;

/** Type flavour immunities: a PokAI having this type cannot get the status. */
export const STATUS_TYPE_IMMUNITY: Partial<Record<StatusId, { type: TypeId; why: string }>> = {
  hallucinating: { type: 'legacy', why: 'ses règles codées en dur ne laissent aucune place à l\'hallucination' },
  censored: { type: 'chaos', why: 'on ne censure pas le Chaos' },
  rate_limited: { type: 'agent', why: 'il relance ses requêtes en backoff exponentiel' },
};

/** Status turn counters are rolled here so initial and applied statuses agree. */
function rollStatusTurns(status: StatusId, rng: Rng): number {
  switch (status) {
    case 'hallucinating':
      return rng.int(2, 4);
    case 'maintenance':
      return rng.int(1, 3);
    case 'deprecated':
      return 3;
    case 'censored':
      return 4; // ticks once at the end of the turn it is applied
    case 'rate_limited':
      return rng.int(4, 6);
    case 'overheat':
      return rng.int(5, 7);
    default:
      return 1;
  }
}
const DOOMER_REFUSAL = 0.1;
const VIBE_BUG = 0.1;

interface Volatile {
  stages: Record<StageStat, number>;
  statusTurns: number;
  censoredSlot: number;
  shield: boolean;
  charging: { slot: number; turns: number } | null;
  recharge: boolean;
  skipNext: boolean;
  typeOverride: { type: TypeId; turns: number } | null;
  statusImmune: number;
  lastSlot: number;
}

function freshVolatile(): Volatile {
  return {
    stages: { power: 0, robustness: 0, throughput: 0, precision: 0 },
    statusTurns: 0,
    censoredSlot: -1,
    shield: false,
    charging: null,
    recharge: false,
    skipNext: false,
    typeOverride: null,
    statusImmune: 0,
    lastSlot: -1,
  };
}

const other = (s: BattleSide): BattleSide => (s === 'player' ? 'foe' : 'player');

/** Builds a trainer's team from trainers.json. */
export function createTrainerTeam(trainerId: string, rng: Rng): PokaiInstance[] {
  const trainer = db.trainer(trainerId);
  const aiactMoves = db.allMoves().filter((m) => m.aiactOnly);
  return trainer.team.map((t) => {
    const p = createPokai(t.form, t.level, rng);
    if (t.sealed) p.sealed = true;
    // AIACT sealed PokAI are "reprogrammed" with one AIACT-only move.
    if (trainer.aiact && t.sealed && aiactMoves.length > 0) {
      const mv = rng.pick(aiactMoves);
      const slot = { move: mv.id, tokens: mv.tokens };
      if (p.moves.length >= 4) p.moves[0] = slot;
      else p.moves.push(slot);
    }
    return p;
  });
}

/** XP given by defeating `foe`. */
export function xpYield(foe: PokaiInstance, kind: BattleKind): number {
  const base = (db.form(foe.form).xpYield * foe.level) / 7;
  return Math.max(1, Math.floor(base * XP_SCALE * (kind === 'trainer' ? TRAINER_XP_MULT : 1)));
}

export class BattleEngine {
  readonly player: PokaiInstance[];
  readonly foe: PokaiInstance[];
  readonly kind: BattleKind;
  readonly trainerId: string | undefined;
  readonly vibeurClass: VibeurClass;
  readonly badges: number | undefined;
  readonly state: BattleState;
  /** Number of "Amende de 6 %" received by the player: the scene removes 6 % credits each. */
  fines = 0;
  private readonly rng: Rng;
  private vol: Record<BattleSide, Volatile> = { player: freshVolatile(), foe: freshVolatile() };
  private participants: string[] = [];
  private fleeAttempts = 0;
  private moratorium = 0;
  private interrupted = false;

  constructor(init: BattleInit, rng: Rng) {
    this.player = init.player;
    this.foe = init.foe;
    this.kind = init.kind;
    this.trainerId = init.trainerId;
    this.vibeurClass = init.vibeurClass;
    this.badges = init.badges ?? badgeCount();
    this.rng = rng;
    const pIdx = Math.max(0, this.player.findIndex((p) => !isFainted(p)));
    const fIdx = Math.max(0, this.foe.findIndex((p) => !isFainted(p)));
    this.state = { playerActive: pIdx, foeActive: fIdx, turn: 1, over: false, needSwitch: false };
    if (this.player.length === 0 || this.foe.length === 0) throw new Error('BattleEngine: empty team');
    this.initStatusTurns('player');
    this.initStatusTurns('foe');
    this.addParticipant();
  }

  active(side: BattleSide): PokaiInstance {
    const team = side === 'player' ? this.player : this.foe;
    const idx = side === 'player' ? this.state.playerActive : this.state.foeActive;
    return team[idx] as PokaiInstance;
  }

  stages(side: BattleSide): Readonly<Record<StageStat, number>> {
    return this.vol[side].stages;
  }

  /** Effective types (Reflet multimodal / Édition d'image may override). */
  typesOf(side: BattleSide): TypeId[] {
    const o = this.vol[side].typeOverride;
    return o ? [o.type] : [...db.form(this.active(side).form).types];
  }

  /** Name used in logs. */
  nameOf(side: BattleSide): string {
    const n = displayName(this.active(side));
    if (side === 'player') return n;
    return this.kind === 'wild' ? `${n} sauvage` : `${n} adverse`;
  }

  act(action: PlayerAction): BattleEvent[] {
    const ev: BattleEvent[] = [];
    if (this.state.over) return ev;

    if (this.state.needSwitch) {
      if (action.kind !== 'switch' || !this.canSwitchTo(action.index)) return [{ kind: 'need_switch' }];
      this.doSwitch('player', action.index, ev);
      this.state.needSwitch = false;
      return ev;
    }

    this.interrupted = false;
    let playerMove: number | null = null;

    switch (action.kind) {
      case 'onboard':
        if (this.kind !== 'wild') return [{ kind: 'message', text: 'On ne peut pas onboarder le PokAI d\'un dresseur !' }];
        if (this.active('foe').sealed) return [{ kind: 'message', text: 'Ce PokAI est sous scellés.' }];
        if (!canOnboard(this.active('foe'))) {
          return [{ kind: 'message', text: `${this.nameOf('foe')} est encore trop en forme pour être onboardé.` }];
        }
        return [{ kind: 'onboard_ready' }];
      case 'flee': {
        if (this.kind !== 'wild') return [{ kind: 'message', text: 'Impossible de fuir un combat de dresseur !' }];
        this.fleeAttempts++;
        const ps = this.speed('player');
        const fs = this.speed('foe');
        const chance = Math.min(1, Math.max(0.25, 0.5 + (0.5 * (ps - fs)) / Math.max(ps, fs, 1) + 0.15 * (this.fleeAttempts - 1)));
        if (this.rng.chance(chance)) {
          ev.push({ kind: 'message', text: 'Tu prends la fuite !' }, { kind: 'fled' });
          this.finish('fled', ev);
          return ev;
        }
        ev.push({ kind: 'message', text: 'Fuite impossible !' });
        break;
      }
      case 'item': {
        const res = this.useItem(action.itemId, action.targetUid, ev);
        if (!res) return ev;
        break;
      }
      case 'switch':
        if (!this.canSwitchTo(action.index)) return [{ kind: 'message', text: 'Impossible d\'envoyer ce PokAI.' }];
        ev.push({ kind: 'message', text: `${this.nameOf('player')}, reviens !` });
        this.doSwitch('player', action.index, ev);
        break;
      case 'move': {
        const p = this.active('player');
        const slot = p.moves[action.index];
        if (!slot) return [{ kind: 'message', text: 'Technique inconnue.' }];
        const anyLeft = p.moves.some((m) => m.tokens > 0);
        if (slot.tokens <= 0 && anyLeft) return [{ kind: 'message', text: 'Plus de jetons pour cette technique !' }];
        playerMove = anyLeft ? action.index : -1;
        break;
      }
    }

    const foeMove = this.chooseFoeMove();
    const order: BattleSide[] = [];
    if (playerMove === null) order.push('foe');
    else order.push(...this.turnOrder(playerMove, foeMove));

    for (const side of order) {
      if (this.state.over || this.interrupted) break;
      this.takeTurn(side, side === 'player' ? (playerMove as number) : foeMove, ev);
      this.checkFaints(ev);
    }
    if (!this.state.over) this.endOfTurn(ev);
    if (!this.state.over) this.state.turn++;
    return ev;
  }

  /**
   * Call after the Onboarding scene: 'success' ends the battle (XP awarded),
   * 'failed' lets the foe act, 'fled' ends the battle (429).
   */
  resolveOnboarding(result: 'success' | 'failed' | 'fled'): BattleEvent[] {
    const ev: BattleEvent[] = [];
    if (this.state.over) return ev;
    const foe = this.active('foe');
    if (result === 'success') {
      ev.push({ kind: 'message', text: `${displayName(foe)} a été onboardé !` });
      this.captured = true;
      this.awardXp(foe, ev);
      this.finish('won', ev);
    } else if (result === 'fled') {
      ev.push({ kind: 'message', text: `429 Too Many Requests : ${this.nameOf('foe')} s'enfuit !` });
      this.foeEscaped = true;
      this.finish('fled', ev);
    } else {
      this.interrupted = false;
      this.takeTurn('foe', this.chooseFoeMove(), ev);
      this.checkFaints(ev);
      if (!this.state.over) this.endOfTurn(ev);
      if (!this.state.over) this.state.turn++;
    }
    return ev;
  }

  // ---------- helpers ----------

  private canSwitchTo(index: number): boolean {
    const p = this.player[index];
    return p !== undefined && !isFainted(p) && index !== this.state.playerActive;
  }

  private doSwitch(side: BattleSide, index: number, ev: BattleEvent[]): void {
    if (side === 'player') this.state.playerActive = index;
    else this.state.foeActive = index;
    this.vol[side] = freshVolatile();
    this.initStatusTurns(side);
    ev.push({ kind: 'switch_in', side, index });
    ev.push({ kind: 'message', text: side === 'player' ? `Go, ${this.nameOf('player')} !` : `${this.trainerName()} envoie ${displayName(this.active('foe'))} !` });
    if (side === 'player') this.addParticipant();
  }

  private trainerName(): string {
    return this.trainerId && db.hasTrainer(this.trainerId) ? db.trainer(this.trainerId).name : 'L\'adversaire';
  }

  private initStatusTurns(side: BattleSide): void {
    const p = this.active(side);
    const v = this.vol[side];
    v.statusTurns = p.status ? rollStatusTurns(p.status, this.rng) : 0;
    v.censoredSlot = p.status === 'censored' ? this.pickCensoredSlot(side) : -1;
  }

  private pickCensoredSlot(side: BattleSide): number {
    const slots = this.active(side).moves.map((m, i) => ({ m, i })).filter(({ m }) => m.tokens > 0).map(({ i }) => i);
    return slots.length > 0 ? this.rng.pick(slots) : -1;
  }

  /** Why `side` cannot receive `status` (null = it can). Used by applyStatus and the foe AI. */
  statusImmunity(side: BattleSide, status: StatusId): string | null {
    const p = this.active(side);
    const name = this.nameOf(side);
    if (status === 'api_outage' && db.form(p.form).licence === 'open') {
      return `${name} est open-weights : immunisé contre la Panne d'API !`;
    }
    const flavour = STATUS_TYPE_IMMUNITY[status];
    if (flavour && this.typesOf(side).includes(flavour.type)) {
      return `${name} est immunisé : ${flavour.why}.`;
    }
    return null;
  }

  private addParticipant(): void {
    const uid = this.active('player').uid;
    if (!this.participants.includes(uid)) this.participants.push(uid);
  }

  private stat(side: BattleSide, k: StageStat): number {
    const base = pokaiStats(this.active(side))[k];
    let m = stageMultiplier(this.vol[side].stages[k]);
    if (k === 'robustness' && side === 'player' && this.vibeurClass === 'doomer') m *= 1.2;
    return Math.max(1, base * m);
  }

  private speed(side: BattleSide): number {
    const base = this.stat(side, 'throughput');
    return this.active(side).status === 'rate_limited' ? base * RATE_LIMIT_SPEED : base;
  }

  private moveAt(side: BattleSide, slot: number): Move {
    if (slot < 0) return db.move(STRUGGLE_MOVE);
    const s = this.active(side).moves[slot];
    return db.move(s ? s.move : STRUGGLE_MOVE);
  }

  private turnOrder(playerSlot: number, foeSlot: number): BattleSide[] {
    const pp = this.vol.player.charging ? 0 : (this.moveAt('player', playerSlot).effect?.priority ?? 0);
    const fp = this.vol.foe.charging ? 0 : (this.moveAt('foe', foeSlot).effect?.priority ?? 0);
    if (pp !== fp) return pp > fp ? ['player', 'foe'] : ['foe', 'player'];
    const ps = this.speed('player');
    const fs = this.speed('foe');
    if (ps !== fs) return ps > fs ? ['player', 'foe'] : ['foe', 'player'];
    return this.rng.chance(0.5) ? ['player', 'foe'] : ['foe', 'player'];
  }

  private usableSlots(side: BattleSide): number[] {
    const p = this.active(side);
    const v = this.vol[side];
    return p.moves
      .map((m, i) => ({ m, i }))
      .filter(({ m, i }) => m.tokens > 0 && !(p.status === 'censored' && v.censoredSlot === i))
      .map(({ i }) => i);
  }

  /** Foe AI. Wild: random. Trainer: best expected damage, with some situational choices. */
  private chooseFoeMove(): number {
    const slots = this.usableSlots('foe');
    if (slots.length === 0) return -1;
    // Early trainers (before badge 1) fumble half of their turns; leaders and later trainers play properly.
    const early = this.badges !== undefined && this.badges < 1 && !this.isLeader();
    if (this.kind === 'wild' || this.rng.chance(early ? FOE_RANDOM_MOVE_CHANCE_EARLY : 0.1)) return this.rng.pick(slots);
    const me = this.active('foe');
    const target = this.active('player');
    const hpRatio = me.context / Math.max(1, maxContext(me));
    let best = slots[0] as number;
    let bestScore = -1;
    for (const i of slots) {
      const mv = this.moveAt('foe', i);
      let score = 0;
      if (mv.category === 'damage') {
        score = this.expectedDamage('foe', mv);
      } else if (mv.category === 'heal') {
        score = hpRatio < 0.4 ? maxContext(me) * 0.5 : 0;
      } else if (mv.category === 'status') {
        const st = mv.effect?.status;
        const immune = st !== undefined && this.statusImmunity('player', st) !== null;
        score = !target.status && st && !immune ? maxContext(target) * 0.15 : 0;
        if (!st) score = this.state.turn <= 2 ? maxContext(target) * 0.1 : 0;
      } else if (mv.category === 'buff' || mv.category === 'debuff') {
        score = this.state.turn <= 2 ? maxContext(target) * 0.12 : 1;
      } else if (mv.category === 'shield') {
        score = hpRatio < 0.5 ? maxContext(me) * 0.1 : 0;
      }
      if (score > bestScore) {
        bestScore = score;
        best = i;
      }
    }
    return best;
  }

  private isLeader(): boolean {
    const id = this.trainerId;
    if (id === undefined) return false;
    return id.startsWith('leader_') || (db.hasTrainer(id) && db.trainer(id).badge !== undefined);
  }

  private moveType(side: BattleSide, mv: Move): TypeId {
    return mv.type;
  }

  private expectedDamage(side: BattleSide, mv: Move): number {
    const def = other(side);
    const type = this.moveType(side, mv);
    const eff = db.effectiveness(type, this.typesOf(def));
    const stab = this.typesOf(side).includes(type) ? STAB : 1;
    const hits = mv.effect?.multiHit ? (mv.effect.multiHit[0] + mv.effect.multiHit[1]) / 2 : 1;
    const lv = this.active(side).level;
    const raw = ((((2 * lv) / 5 + 2) * Math.max(mv.power, 40) * this.stat(side, 'power')) / this.stat(def, 'robustness')) / 50 + 2;
    return raw * eff * stab * hits * (mv.accuracy / 100) * (mv.effect?.chargeTurns ? 0.5 : 1);
  }

  private takeTurn(side: BattleSide, chosenSlot: number, ev: BattleEvent[]): void {
    const me = this.active(side);
    const v = this.vol[side];
    if (isFainted(me)) return;
    const name = this.nameOf(side);

    if (v.recharge) {
      v.recharge = false;
      ev.push({ kind: 'message', text: `${name} doit se remettre de son effort.` });
      return;
    }
    if (v.skipNext) {
      v.skipNext = false;
      ev.push({ kind: 'message', text: `${name} cherche le bouton « Tout refuser »… et perd son tour.` });
      return;
    }
    if (me.status === 'maintenance') {
      if (v.statusTurns > 0) {
        v.statusTurns--;
        ev.push({ kind: 'status_tick', side, status: 'maintenance', turns: v.statusTurns });
        ev.push({ kind: 'message', text: `${name} est en maintenance…` });
        return;
      }
      this.clearStatus(side, ev, `${name} redémarre !`);
    }
    if (me.status === 'api_outage') {
      this.clearStatus(side, ev, `Panne d'API ! ${name} ne peut rien faire.`);
      return;
    }
    if (me.status === 'rate_limited' && this.rng.chance(RATE_LIMIT_SKIP)) {
      ev.push({ kind: 'message', text: `${name} : 429 Too Many Requests. Il passe son tour.` });
      return;
    }

    let slot = chosenSlot;
    let charged = false;
    if (v.charging) {
      slot = v.charging.slot;
      v.charging.turns--;
      if (v.charging.turns > 0) {
        ev.push({ kind: 'message', text: `${name} réfléchit encore…` });
        return;
      }
      v.charging = null;
      charged = true;
    }
    const mv = this.moveAt(side, slot);

    if (!charged && me.status === 'censored' && slot === v.censoredSlot) {
      ev.push({ kind: 'message', text: `${mv.name} est censurée ! ${name} ne peut pas l'utiliser (encore ${Math.max(1, v.statusTurns - 1)} tour${v.statusTurns > 2 ? 's' : ''}).` });
      return;
    }
    if (!charged && side === 'player' && this.vibeurClass === 'doomer' && mv.category === 'damage' && this.rng.chance(DOOMER_REFUSAL)) {
      ev.push({ kind: 'message', text: `${name} refuse d'attaquer : « Ce serait irresponsable. »` });
      return;
    }

    ev.push({ kind: 'move_used', side, moveId: mv.id });
    v.lastSlot = slot;
    if (!charged && slot >= 0) {
      const ms = me.moves[slot];
      const freeCode = side === 'player' && this.vibeurClass === 'vibe_coder' && mv.type === 'code';
      const efficient = db.lineOfForm(me.form).id === 'deepseek' && this.rng.chance(0.5);
      if (ms && !freeCode && !efficient) ms.tokens = Math.max(0, ms.tokens - 1);
      if (freeCode && this.rng.chance(VIBE_BUG)) {
        ev.push({ kind: 'message', text: 'Bug en prod ! La technique plante.' });
        return;
      }
    }
    if (!charged && mv.effect?.chargeTurns) {
      v.charging = { slot, turns: mv.effect.chargeTurns };
      ev.push({ kind: 'message', text: `${name} réfléchit…` });
      return;
    }

    if (me.status === 'hallucinating') {
      if (v.statusTurns <= 0) {
        this.clearStatus(side, ev, `${name} ne délire plus.`);
      } else {
        v.statusTurns--;
        ev.push({ kind: 'status_tick', side, status: 'hallucinating', turns: v.statusTurns });
        if (this.rng.chance(HALLU_SELF_HIT)) {
          ev.push({ kind: 'message', text: `${name} hallucine… et frappe son propre camp !` });
          this.rawHit(side, side, 40, null, ev);
          return;
        }
        ev.push({ kind: 'message', text: `${name} délire un peu, mais garde le fil.` });
      }
    }

    // Transformer: changes type with every move.
    if (db.lineOfForm(me.form).id === 'transformer') v.typeOverride = { type: mv.type, turns: 1 };

    const targetSide = this.targetOf(mv, side);
    if (targetSide !== side && mv.accuracy < 100 && this.rng.int(1, 100) > mv.accuracy) {
      ev.push({ kind: 'message', text: `${name} rate sa cible !` });
      return;
    }
    if (mv.effect?.selfHitChance && this.rng.chance(mv.effect.selfHitChance)) {
      ev.push({ kind: 'message', text: `${name} perd le contrôle et se touche lui-même !` });
      this.rawHit(side, side, mv.power || 40, null, ev);
      return;
    }
    this.resolveMove(side, mv, ev);
  }

  private targetOf(mv: Move, side: BattleSide): BattleSide {
    if (mv.effect?.target === 'self') return side;
    if (mv.effect?.target === 'foe') return other(side);
    return mv.category === 'heal' || mv.category === 'shield' || mv.category === 'buff' ? side : other(side);
  }

  private resolveMove(side: BattleSide, mv: Move, ev: BattleEvent[]): void {
    const foe = other(side);
    const me = this.active(side);
    const target = this.active(foe);
    const v = this.vol[side];
    const e = mv.effect ?? {};

    switch (mv.id) {
      case 'textbook':
        this.hit(side, mv, ev, { powerMul: target.level > me.level ? 1.5 : 1 });
        return;
      case 'multimodal_mirror':
      case 'image_edit': {
        const t = this.typesOf(foe)[0] as TypeId;
        v.typeOverride = { type: t, turns: mv.id === 'image_edit' ? 3 : 2 };
        ev.push({ kind: 'message', text: `${this.nameOf(side)} prend le type ${db.typeInfo(t).name} !` });
        if (mv.category === 'damage') this.hit(side, mv, ev, { type: t });
        return;
      }
      case 'mixture_of_experts': {
        const pool = db.allMoves().filter((m) => m.category === 'damage' && !m.aiactOnly && m.power > 0 && m.id !== mv.id && !m.effect?.chargeTurns);
        const experts = this.rng.shuffle(pool).slice(0, 8);
        let pick = experts[0];
        for (const x of experts) if (pick && this.expectedDamage(side, x) > this.expectedDamage(side, pick)) pick = x;
        if (!pick) return;
        ev.push({ kind: 'message', text: `Sur 8 experts, ${pick.name} est choisi !` });
        this.hit(side, pick, ev);
        return;
      }
      case 'swarm': {
        const team = side === 'player' ? this.player : this.foe;
        const qwens = team.filter((p) => p !== me && !isFainted(p) && db.lineOfForm(p.form).id === 'qwen').length;
        if (qwens > 0) ev.push({ kind: 'message', text: `L'essaim grossit : ${qwens + 1} Qwen à l'unisson !` });
        this.hit(side, mv, ev, { powerMul: 1 + 0.5 * qwens });
        return;
      }
      case 'unfiltered_mode':
        this.hit(side, mv, ev, { powerMul: 0.5 + this.rng.next() * 2.5 });
        return;
      case 'refactor':
        if (me.status) this.clearStatus(side, ev, `${this.nameOf(side)} est refactorisé : statut corrigé.`);
        this.changeStage(side, 'power', 1, ev);
        return;
      case 'denoise':
        if (me.status) this.clearStatus(side, ev, `${this.nameOf(side)} retire le bruit : statut soigné.`);
        else this.heal(side, 0.25, ev);
        return;
      case 'transcription':
        ev.push({
          kind: 'message',
          text: `Transcription : ${this.nameOf(foe)} connaît ${target.moves.map((m) => db.move(m.move).name).join(', ')}.`,
        });
        this.changeStage(side, 'precision', 1, ev);
        return;
      case 'small_but_tough':
        this.changeStage(side, 'robustness', me.context / maxContext(me) < 0.5 ? 2 : 1, ev);
        return;
      case 'constitution':
        v.statusImmune = 3;
        if (me.status) this.clearStatus(side, ev, `${this.nameOf(side)} relit sa Constitution : statut retiré.`);
        ev.push({ kind: 'message', text: 'L\'équipe est immunisée contre les statuts pendant 3 tours.' });
        return;
      case 'max_effort':
        this.hit(side, mv, ev);
        v.recharge = true;
        return;
      case 'multi_head_attention': {
        const types = db.types.map((t) => t.id).filter((t) => db.effectiveness(t, this.typesOf(foe)) > 1);
        const list: TypeId[] = types.length > 0 ? types : [mv.type];
        for (const t of list) {
          if (isFainted(target)) break;
          this.hit(side, mv, ev, { type: t, quiet: false });
        }
        ev.push({ kind: 'message', text: `Touché ${list.length} fois !` });
        return;
      }
      case 'cookie_banner':
        if (this.rng.chance(0.5)) {
          this.vol[foe].skipNext = true;
          ev.push({ kind: 'message', text: 'Une bannière de cookies recouvre tout l\'écran !' });
        } else ev.push({ kind: 'message', text: `${this.nameOf(foe)} clique sur « Tout refuser » du premier coup.` });
        return;
      case 'moratorium':
        this.moratorium = 3;
        ev.push({ kind: 'message', text: 'Moratoire ! Aucun changement de stats pendant 3 tours.' });
        return;
      case 'fine_6':
        this.hit(side, mv, ev);
        if (foe === 'player') {
          this.fines++;
          ev.push({ kind: 'message', text: 'Amende de 6 % ! Tes crédits GPU fondent.' });
        }
        return;
    }

    switch (mv.category) {
      case 'damage':
        this.hit(side, mv, ev);
        return;
      case 'heal':
        this.heal(side, e.healRatio ?? 0.5, ev);
        return;
      case 'shield':
        v.shield = true;
        ev.push({ kind: 'message', text: `${this.nameOf(side)} se protège.` });
        return;
      case 'status':
        if (e.status && (e.statusChance === undefined || this.rng.chance(e.statusChance))) {
          this.applyStatus(foe, e.status, ev, true);
        } else if (e.status) {
          ev.push({ kind: 'message', text: 'Ça n\'a aucun effet.' });
        }
        if (e.stat && e.stages) this.changeStage(this.targetOf(mv, side), e.stat, e.stages, ev);
        if (!e.status && !e.stat) ev.push({ kind: 'message', text: 'Il ne se passe rien.' });
        return;
      case 'buff':
      case 'debuff': {
        const t = this.targetOf(mv, side);
        if (e.stat && e.stages) this.changeStage(t, e.stat, e.stages, ev);
        if (e.status) this.applyStatus(other(side), e.status, ev, true);
        return;
      }
    }
  }

  private hit(
    side: BattleSide,
    mv: Move,
    ev: BattleEvent[],
    opts: { powerMul?: number; type?: TypeId; quiet?: boolean } = {},
  ): void {
    const foe = other(side);
    const target = this.active(foe);
    const e = mv.effect ?? {};
    const [lo, hi] = e.multiHit ?? [1, 1];
    const hits = this.rng.int(lo, hi);
    const type = opts.type ?? this.moveType(side, mv);
    let landed = 0;
    for (let i = 0; i < hits && !isFainted(target) && !isFainted(this.active(side)); i++) {
      this.rawHit(side, foe, mv.power * (opts.powerMul ?? 1), type, ev);
      landed++;
    }
    if (hits > 1) ev.push({ kind: 'message', text: `Touché ${landed} fois !` });
    if (isFainted(target)) return;
    if (e.status) {
      if (this.rng.chance(e.statusChance ?? 1)) this.applyStatus(foe, e.status, ev, false);
    }
    if (e.stat && e.stages && this.rng.chance(e.status ? 1 : (e.statusChance ?? 1))) {
      this.changeStage(e.target === 'self' ? side : foe, e.stat, e.stages, ev);
    }
  }

  /** One damage instance. type = null: typeless (self-hit). */
  private rawHit(att: BattleSide, def: BattleSide, power: number, type: TypeId | null, ev: BattleEvent[]): void {
    const a = this.active(att);
    const d = this.active(def);
    // Level gap dampening: the level term leans toward the defender's level so +-2 levels is not a coin flip turned landslide.
    const lv = a.level + (d.level - a.level) * LEVEL_GAP_DAMPING;
    // Catch-up assist: only when the player is the lower-level side (never punishes over-levelling).
    const underdog = att === 'player' ? d.level > a.level : a.level > d.level;
    const gap = underdog ? Math.pow(d.level / Math.max(1, a.level), LEVEL_RATIO_DAMPING) : 1;
    const atk = this.stat(att, 'power');
    const dfn = this.stat(def, 'robustness');
    let dmg = ((((2 * lv) / 5 + 2) * power * atk) / dfn) / 50 + 2;
    let eff = 1;
    if (type) {
      eff = db.effectiveness(type, this.typesOf(def));
      if (this.typesOf(att).includes(type)) dmg *= STAB;
      dmg *= eff;
      if (this.rng.chance(CRIT_CHANCE)) {
        dmg *= CRIT_MULT;
        ev.push({ kind: 'message', text: 'Coup critique !' });
      }
    }
    dmg *= (0.85 + this.rng.next() * 0.15) * DAMAGE_SCALE * gap;
    if (att === 'foe' && def === 'player') dmg *= this.isLeader() ? 1 : foeDamageMultiplier(this.badges);
    let amount = Math.max(1, Math.floor(dmg));
    const shielded = att !== def && this.vol[def].shield;
    if (shielded) amount = Math.max(1, Math.floor(amount / 2));
    amount = Math.min(amount, d.context);
    d.context -= amount;
    if (att === def) ev.push({ kind: 'damage', side: def, amount, hp: d.context, maxHp: maxContext(d), effectiveness: eff, cause: 'self' });
    else ev.push({ kind: 'damage', side: def, amount, hp: d.context, maxHp: maxContext(d), effectiveness: eff });
    if (type && eff > 1) ev.push({ kind: 'message', text: 'C\'est super efficace !' });
    else if (type && eff < 1) ev.push({ kind: 'message', text: 'Ce n\'est pas très efficace…' });
    if (shielded && amount > 0 && !isFainted(a)) {
      const back = Math.min(a.context, Math.max(1, Math.floor(amount / 2)));
      a.context -= back;
      ev.push({ kind: 'message', text: `« Désolé, je ne peux pas. » ${back} tokens renvoyés !` });
      ev.push({ kind: 'damage', side: att, amount: back, hp: a.context, maxHp: maxContext(a), effectiveness: 1, cause: 'recoil' });
    }
  }

  private heal(side: BattleSide, ratio: number, ev: BattleEvent[]): void {
    const p = this.active(side);
    const max = maxContext(p);
    const before = p.context;
    p.context = Math.min(max, p.context + Math.ceil(max * ratio));
    const amount = p.context - before;
    if (amount <= 0) {
      ev.push({ kind: 'message', text: `Le Contexte de ${this.nameOf(side)} est déjà plein.` });
      return;
    }
    ev.push({ kind: 'heal', side, amount, hp: p.context, maxHp: max });
  }

  private changeStage(side: BattleSide, stat: keyof Stats, delta: number, ev: BattleEvent[]): void {
    if (stat === 'context') return;
    const name = this.nameOf(side);
    if (this.moratorium > 0) {
      ev.push({ kind: 'message', text: 'Moratoire en vigueur : aucun changement de stats.' });
      return;
    }
    const v = this.vol[side];
    const cur = v.stages[stat];
    const next = Math.max(-6, Math.min(6, cur + delta));
    if (next === cur) {
      ev.push({ kind: 'message', text: `${STAT_NAMES[stat]} de ${name} ne peut plus ${delta > 0 ? 'monter' : 'baisser'}.` });
      return;
    }
    v.stages[stat] = next;
    const d = next - cur;
    ev.push({ kind: 'stat', side, stat, stages: d, total: next });
    const word = d >= 2 ? 'monte beaucoup' : d > 0 ? 'monte' : d <= -2 ? 'baisse beaucoup' : 'baisse';
    ev.push({ kind: 'message', text: `${STAT_NAMES[stat]} de ${name} ${word} !` });
  }

  private applyStatus(side: BattleSide, status: StatusId, ev: BattleEvent[], loud: boolean): void {
    const p = this.active(side);
    const v = this.vol[side];
    const name = this.nameOf(side);
    if (isFainted(p)) return;
    if (v.statusImmune > 0) {
      if (loud) ev.push({ kind: 'message', text: `${name} est protégé par sa Constitution.` });
      return;
    }
    if (p.status) {
      if (loud) ev.push({ kind: 'message', text: `${name} est déjà ${STATUS_NAMES[p.status]}.` });
      return;
    }
    const immune = this.statusImmunity(side, status);
    if (immune) {
      if (loud) ev.push({ kind: 'message', text: immune });
      return;
    }
    if (status === 'hallucinating') {
      const prec = this.stat(side, 'precision');
      const resist = prec / (prec + 3 * p.level + 60);
      if (this.rng.chance(resist)) {
        if (loud) ev.push({ kind: 'message', text: `${name} vérifie ses sources et résiste à l'hallucination.` });
        return;
      }
    }
    p.status = status;
    this.initStatusTurns(side);
    if (status === 'censored') {
      if (v.lastSlot >= 0 && p.moves[v.lastSlot] && this.rng.chance(0.5)) v.censoredSlot = v.lastSlot;
    }
    ev.push({ kind: 'status', side, status, turns: v.statusTurns });
    ev.push({ kind: 'message', text: this.statusAppliedText(side, status) });
  }

  private statusAppliedText(side: BattleSide, status: StatusId): string {
    const name = this.nameOf(side);
    switch (status) {
      case 'overheat':
        return `${name} est en Surchauffe ! Les GPU fument.`;
      case 'hallucinating':
        return `${name} devient Hallucinant : il invente des faits.`;
      case 'rate_limited':
        return `${name} est Rate-limité : 429 en vue, Débit réduit.`;
      case 'maintenance':
        return `${name} part En maintenance (${this.vol[side].statusTurns} tour${this.vol[side].statusTurns > 1 ? 's' : ''}).`;
      case 'censored': {
        const slot = this.vol[side].censoredSlot;
        const m = slot >= 0 ? this.active(side).moves[slot] : undefined;
        return m ? `${name} est Censuré : ${db.move(m.move).name} est bloquée 3 tours !` : `${name} est Censuré !`;
      }
      case 'deprecated':
        return `${name} est Déprécié : ses stats vont s'effriter.`;
      case 'api_outage':
        return `${name} subit une Panne d'API : il ne pourra rien faire.`;
    }
  }

  private clearStatus(side: BattleSide, ev: BattleEvent[], text: string): void {
    delete this.active(side).status;
    this.vol[side].statusTurns = 0;
    this.vol[side].censoredSlot = -1;
    ev.push({ kind: 'status', side, status: null });
    ev.push({ kind: 'message', text });
  }

  private useItem(itemId: string, targetUid: string | undefined, ev: BattleEvent[]): boolean {
    if (!db.hasItem(itemId)) {
      ev.push({ kind: 'message', text: 'Objet inconnu.' });
      return false;
    }
    const item = db.item(itemId);
    if (item.kind === 'api_key') {
      ev.push({ kind: 'message', text: 'Une Clé API sert à onboarder : choisis « Onboarder ».' });
      return false;
    }
    const target = targetUid ? this.player.find((p) => p.uid === targetUid) : this.active('player');
    if (!target || !canUseItem(itemId, target)) {
      ev.push({ kind: 'message', text: 'Ça n\'aurait aucun effet.' });
      return false;
    }
    const isActive = target === this.active('player');
    const hadStatus = target.status;
    const res = applyItem(itemId, target, this.vibeurClass);
    ev.push({ kind: 'message', text: `Tu utilises ${item.name} sur ${displayName(target)}.` });
    if (isActive && res.healed > 0) {
      ev.push({ kind: 'heal', side: 'player', amount: res.healed, hp: target.context, maxHp: maxContext(target) });
    }
    if (isActive && hadStatus && !target.status) {
      this.vol.player.statusTurns = 0;
      ev.push({ kind: 'status', side: 'player', status: null });
    }
    if (itemId === 'clear_cache' && isActive) this.changeStage('player', 'throughput', 1, ev);
    if (res.events.length > 0) ev.push({ kind: 'xp', uid: target.uid, amount: 0, events: res.events });
    return true;
  }

  private endOfTurn(ev: BattleEvent[]): void {
    for (const side of ['player', 'foe'] as const) {
      const p = this.active(side);
      const v = this.vol[side];
      v.shield = false;
      if (v.typeOverride && --v.typeOverride.turns <= 0) v.typeOverride = null;
      if (v.statusImmune > 0) v.statusImmune--;
      if (isFainted(p)) continue;
      const name = this.nameOf(side);
      if (p.status === 'overheat') {
        const max = maxContext(p);
        const amount = Math.min(p.context, Math.max(1, Math.floor(max / 16)));
        p.context -= amount;
        ev.push({ kind: 'message', text: `${name} surchauffe ! −${fmtTokens(amount * TOKEN_UNIT)} tokens` });
        ev.push({ kind: 'damage', side, amount, hp: p.context, maxHp: max, effectiveness: 1, cause: 'status' });
        if (!isFainted(p) && --v.statusTurns <= 0) this.clearStatus(side, ev, `${name} refroidit : fin de la Surchauffe.`);
      } else if (p.status === 'deprecated') {
        const stat = this.rng.pick<StageStat>(['power', 'robustness', 'throughput']);
        ev.push({ kind: 'message', text: `${name} est déprécié… les mises à jour se font rares.` });
        this.changeStage(side, stat, -1, ev);
        if (--v.statusTurns <= 0) this.clearStatus(side, ev, `${name} reçoit un patch de support.`);
      } else if (p.status === 'censored') {
        if (--v.statusTurns <= 0) this.clearStatus(side, ev, `${name} n'est plus censuré.`);
      } else if (p.status === 'rate_limited') {
        if (--v.statusTurns <= 0) this.clearStatus(side, ev, `${name} n'est plus rate-limité : le quota se réinitialise.`);
      }
      if (p.status && !isFainted(p) && v.statusTurns > 0 && (p.status === 'overheat' || p.status === 'deprecated' || p.status === 'censored' || p.status === 'rate_limited')) {
        ev.push({ kind: 'status_tick', side, status: p.status, turns: v.statusTurns });
      }
    }
    if (this.moratorium > 0) this.moratorium--;
    this.checkFaints(ev);
  }

  private awardXp(foe: PokaiInstance, ev: BattleEvent[]): void {
    const alive = this.participants
      .map((uid) => this.player.find((p) => p.uid === uid))
      .filter((p): p is PokaiInstance => p !== undefined && !isFainted(p));
    if (alive.length === 0) return;
    const total = xpYield(foe, this.kind);
    const base = Math.ceil(total / alive.length);
    // Deterministic "lucky prompt" roll: derived from the rng state without advancing it.
    const lucky = createRng(this.rng.seed ^ 0x5bd1e995).chance(LUCKY_XP_CHANCE);
    if (lucky) ev.push({ kind: 'message', text: 'Prompt chanceux ! Bonus d\'XP.' });
    for (const p of alive) {
      const share = Math.max(1, Math.round(base * levelGapFactor(foe.level, p.level) * earlyXpBoost(p.level) * (lucky ? LUCKY_XP_MULT : 1)));
      const events = grantXp(p, share, this.vibeurClass);
      ev.push({ kind: 'message', text: `${displayName(p)} gagne ${share} XP.` });
      ev.push({ kind: 'xp', uid: p.uid, amount: share, events });
    }
  }

  private checkFaints(ev: BattleEvent[]): void {
    if (this.state.over) return;
    const foe = this.active('foe');
    const me = this.active('player');
    if (isFainted(foe) && !this.foeFaintHandled) {
      this.foeFaintHandled = true;
      this.interrupted = true;
      ev.push({ kind: 'faint', side: 'foe' });
      ev.push({ kind: 'message', text: `${this.nameOf('foe')} est hors service !` });
      this.awardXp(foe, ev);
      const next = this.foe.findIndex((p) => !isFainted(p));
      if (next < 0) {
        this.finish('won', ev);
        return;
      }
      this.doSwitch('foe', next, ev);
      this.foeFaintHandled = false;
      this.participants = isFainted(this.active('player')) ? [] : [this.active('player').uid];
    }
    if (isFainted(me) && !this.state.needSwitch) {
      this.interrupted = true;
      ev.push({ kind: 'faint', side: 'player' });
      ev.push({ kind: 'message', text: `${this.nameOf('player')} est hors service !` });
      this.playerFaints++;
      this.participants = this.participants.filter((u) => u !== me.uid);
      if (this.player.some((p) => !isFainted(p))) {
        this.state.needSwitch = true;
        ev.push({ kind: 'need_switch' });
      } else {
        ev.push({ kind: 'message', text: 'Tous tes PokAI sont hors service…' });
        this.finish('lost', ev);
      }
    }
  }

  private foeFaintHandled = false;
  private playerFaints = 0;
  private captured = false;
  private foeEscaped = false;

  private finish(outcome: 'won' | 'lost' | 'fled', ev: BattleEvent[]): void {
    this.state.over = true;
    this.state.outcome = outcome;
    this.state.needSwitch = false;
    for (const p of this.player) {
      // Combat-only statuses never leak into the overworld.
      delete p.status;
    }
    if (outcome === 'won' && !this.captured) this.winRewards(ev);
    ev.push({ kind: 'end', outcome });
    if (this.foeEscaped) return; // a 429 during onboarding is reported by the onboarding system, not as a player flee
    emitGameEvent({
      kind: 'battle_end',
      outcome,
      battle: this.kind,
      aiact: this.kind === 'trainer' && !!this.trainerId && db.hasTrainer(this.trainerId) && db.trainer(this.trainerId).aiact === true,
      flawless: this.playerFaints === 0,
      turns: this.state.turn,
      ...(this.trainerId !== undefined ? { trainerId: this.trainerId } : {}),
    });
  }

  /** Wild drops and trainer performance bonus: announced as messages, handed to the reward sink. */
  private winRewards(ev: BattleEvent[]): void {
    const rr = createRng(this.rng.seed ^ 0x27d4eb2f);
    if (this.kind === 'wild') {
      const foe = this.active('foe');
      const drop = rollWildDrop(foe.level, rr);
      if (!drop || !db.hasItem(drop)) return;
      ev.push({ kind: 'message', text: `${this.nameOf('foe')} laisse tomber : ${db.item(drop).name} !` });
      deliverReward({ credits: 0, items: { [drop]: 1 } });
    } else if (this.trainerId && db.hasTrainer(this.trainerId) && this.playerFaints === 0) {
      const bonus = Math.round(db.trainer(this.trainerId).reward * FLAWLESS_BONUS);
      if (bonus <= 0) return;
      ev.push({ kind: 'message', text: `Prime de performance : +${bonus} crédits GPU (aucun PokAI hors service).` });
      deliverReward({ credits: bonus, items: {} });
    }
  }
}
