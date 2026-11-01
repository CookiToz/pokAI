// Bridges pure progression events to the save game: counters, achievements, first-catch and Neurodex rewards, battle drops.
// UI code subscribes with onProgressNotice(); nothing here touches the DOM.
import { db } from '../data/db';
import {
  ACHIEVEMENTS,
  applyEvent,
  emitGameEvent,
  evaluate,
  onGameEvent,
  setBadgeProvider,
  setRewardSink,
  type AchievementDef,
  type BattleReward,
  type GameEvent,
  type Snapshot,
} from '../systems/progression';
import { ui } from '../ui-dom/facade';
import { crossedMilestones, firstCatchBonus } from '../systems/progression-rewards';
import { game } from './store';

export type ProgressNotice =
  | { kind: 'achievement'; def: AchievementDef }
  | { kind: 'info'; text: string };

const noticeListeners = new Set<(n: ProgressNotice) => void>();
export function onProgressNotice(fn: (n: ProgressNotice) => void): () => void {
  noticeListeners.add(fn);
  return () => noticeListeners.delete(fn);
}
function notify(n: ProgressNotice): void {
  for (const fn of [...noticeListeners]) fn(n);
}

const STEP_CHECK_EVERY = 25;

export function snapshot(): Snapshot {
  const s = game.state;
  return { counters: s.stats ?? {}, badges: s.badges, caught: s.caught, credits: s.credits, party: s.party, repo: s.repo };
}

export function unlockedSet(): Set<string> {
  return new Set(game.state.achievements ?? []);
}

function itemsText(items: Record<string, number>): string {
  return Object.entries(items)
    .filter(([id]) => db.hasItem(id))
    .map(([id, n]) => `${n > 1 ? `${n}× ` : ''}${db.item(id).name}`)
    .join(', ');
}

function grant(items: Record<string, number> | undefined, credits: number | undefined): void {
  for (const [id, n] of Object.entries(items ?? {})) if (db.hasItem(id)) game.addItem(id, n);
  if (credits && credits > 0) game.addCredits(credits);
}

/** Unlocks every achievement whose condition holds now. Returns the new ones. */
export function checkAchievements(): AchievementDef[] {
  const fresh = evaluate(snapshot(), unlockedSet(), ACHIEVEMENTS);
  if (fresh.length === 0) return fresh;
  game.state.achievements = [...(game.state.achievements ?? []), ...fresh.map((d) => d.id)];
  for (const d of fresh) {
    grant(d.reward?.items, d.reward?.credits);
    notify({ kind: 'achievement', def: d });
  }
  return fresh;
}

function onDex(ev: Extract<GameEvent, { kind: 'dex' }>): void {
  // The very first model is the starter: no discovery bonus.
  if (ev.before >= 1 && db.hasForm(ev.form)) {
    const bonus = firstCatchBonus(db.form(ev.form).stage);
    game.addCredits(bonus);
    notify({ kind: 'info', text: `Neurodex : nouveau modèle, +${bonus} crédits GPU.` });
  }
  for (const m of crossedMilestones(ev.before, ev.after)) {
    grant(m.items, m.credits);
    notify({ kind: 'info', text: `${m.label} : ${itemsText(m.items)} et ${m.credits} crédits GPU.` });
  }
}

/** Gentle prison escape: beating the rival or the Cookie inspector fully heals the team. */
const AUTO_HEAL_TRAINERS = /^(rival_1_|inspector_cookie)/;
function autoHeal(): void {
  setTimeout(() => {
    game.healParty();
    notify({ kind: 'info', text: 'Redémarrage automatique : ton équipe est soignée.' });
  }, 2500);
}

let busy = false;
const queue: GameEvent[] = [];
function handle(ev: GameEvent): void {
  queue.push(ev);
  if (busy) return;
  busy = true;
  try {
    for (let ev2 = queue.shift(); ev2; ev2 = queue.shift()) {
      const stats = (game.state.stats ??= {});
      applyEvent(stats, ev2);
      if (ev2.kind === 'dex') onDex(ev2);
      if (ev2.kind === 'battle_end' && ev2.outcome === 'won' && ev2.trainerId && AUTO_HEAL_TRAINERS.test(ev2.trainerId)) autoHeal();
      if (ev2.kind === 'step' && (stats['steps'] ?? 0) % STEP_CHECK_EVERY !== 0) continue;
      checkAchievements();
    }
  } finally {
    busy = false;
  }
}

function onReward(r: BattleReward): void {
  grant(r.items, r.credits);
}

let installed = false;
/** Idempotent: call once at boot. */
export function installProgression(): void {
  if (installed) return;
  installed = true;
  onGameEvent(handle);
  setRewardSink(onReward);
  setBadgeProvider(() => game.state.badges.length);
  // Both UI layers register on the facade at import time; wrap once they are all in place.
  setTimeout(() => {
    const orig = ui.evolution;
    ui.evolution = async (uid, options) => {
      const res = await orig(uid, options);
      if (res === null) emitGameEvent({ kind: 'evolve_cancel' });
      return res;
    };
  }, 0);
}
