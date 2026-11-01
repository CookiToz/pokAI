// Executes DialogueScript steps against the DOM interface (ui facade) and the world port.
import { db } from '../data/db';
import type { FlagCondition, ScriptStep } from '../data/types';
import { game } from '../state/store';
import { createPokai } from '../systems/pokai';
import { createRng } from '../systems/rng';
import { ui } from '../ui-dom/facade';
import type { WorldPort } from './world-port';
import { BADGE_FLAG_PREFIX, evalCondition, interpolate, lastHubMap, trainerDefeatedFlag } from './conditions';

/** Thrown to stop a script early (party wiped, etc.). Caught by runScript. */
export class ScriptAbort extends Error {}

const vars = (): Record<string, string> => ({ player: game.state.playerName });
const flag = (n: string): boolean => game.flag(n);
export const check = (c: FlagCondition | undefined): boolean => evalCondition(c, flag);

export function grantBadge(name: string): void {
  if (name.startsWith(BADGE_FLAG_PREFIX)) game.addBadge(name);
}

function setFlag(name: string, v: boolean): void {
  game.setFlag(name, v);
  if (v) grantBadge(name);
}

/** After the starter choice, derive story flags from the first party member. */
function syncStarterFlags(): void {
  const first = game.state.party[0];
  if (!first) return;
  game.setFlag('starter_' + first.form, true);
  game.setFlag('got_starter', true);
}

/** Party wiped: back to the last Hub, healed. */
async function handleWipe(world: WorldPort): Promise<void> {
  const mapId = lastHubMap(game.state.flags);
  game.healParty();
  const map = db.hasMap(mapId) ? db.map(mapId) : null;
  const spot = map?.hub ?? { x: 4, y: 5 };
  await world.warp(map ? mapId : 'aiact_center', spot.x, spot.y, 'down');
}

async function runBattleStep(trainerId: string, world: WorldPort): Promise<void> {
  const result = await ui.battle({ kind: 'trainer', trainerId, canFlee: false });
  if (result.kind === 'lost') {
    await handleWipe(world);
    throw new ScriptAbort('wiped');
  }
  if (result.kind === 'won') {
    game.setFlag(trainerDefeatedFlag(trainerId), true);
    const badge = db.trainer(trainerId).badge;
    if (badge) {
      game.addBadge(badge);
      game.setFlag(badge.startsWith(BADGE_FLAG_PREFIX) ? badge : BADGE_FLAG_PREFIX + badge, true);
    }
    world.refreshNpcs();
  }
}

/** Trainer line-of-sight encounter: intro script, battle, defeat script. */
export async function runTrainerEncounter(trainerId: string, world: WorldPort): Promise<void> {
  const t = db.trainer(trainerId);
  const intro = t.introDialogue ?? `${trainerId}_intro`;
  if (db.hasScript(intro)) await runScript(intro, world);
  try {
    await runBattleStep(trainerId, world);
  } catch (e) {
    if (e instanceof ScriptAbort) return;
    throw e;
  }
  const defeat = t.defeatDialogue ?? `${trainerId}_defeat`;
  if (db.hasScript(defeat)) await runScript(defeat, world);
}

async function systemLine(text: string): Promise<void> {
  await ui.say({ text });
}

export async function runScript(scriptId: string, world: WorldPort): Promise<void> {
  const script = db.script(scriptId);
  const steps = script.steps;
  const labels = new Map<string, number>();
  steps.forEach((s, i) => {
    if ('label' in s) labels.set(s.label, i);
  });
  const jump = (l: string): number => {
    const i = labels.get(l);
    if (i === undefined) throw new Error(`script ${scriptId}: unknown label ${l}`);
    return i;
  };
  let pc = 0;
  let inCutscene = false;
  try {
    while (pc < steps.length) {
      const step: ScriptStep = steps[pc] as ScriptStep;
      pc++;
      if ('say' in step) {
        await ui.say({ text: interpolate(step.say, vars()), speaker: step.speaker, portrait: step.portrait });
      } else if ('choice' in step) {
        const i = await ui.choice(step.choice.map((c) => interpolate(c.label, vars())));
        pc = jump((step.choice[i] ?? step.choice[0]!).goto);
      } else if ('label' in step) {
        // marker only
      } else if ('if' in step) {
        if (check(step.if)) pc = jump(step.goto);
      } else if ('goto' in step) {
        pc = jump(step.goto);
      } else if ('set_flag' in step) {
        setFlag(step.set_flag, step.value ?? true);
      } else if ('give_item' in step) {
        const n = step.count ?? 1;
        game.addItem(step.give_item, n);
        const name = db.hasItem(step.give_item) ? db.item(step.give_item).name : step.give_item;
        await systemLine(`${game.state.playerName} obtient ${name}${n > 1 ? ` x${n}` : ''} !`);
      } else if ('give_pokai' in step) {
        const p = createPokai(step.give_pokai, step.level, createRng((Date.now() ^ (pc * 7919)) >>> 0));
        p.caughtAt = game.state.map;
        const dest = game.addPokai(p);
        const name = db.hasForm(p.form) ? db.form(p.form).name : p.form;
        await systemLine(`${name} rejoint ${dest === 'party' ? 'ton équipe' : 'le Dépôt'} !`);
      } else if ('give_credits' in step) {
        game.addCredits(step.give_credits);
        await systemLine(`+${step.give_credits} crédits GPU.`);
      } else if ('take_credits' in step) {
        const n = step.take_credits === 'all' ? game.state.credits : Math.min(step.take_credits, game.state.credits);
        game.addCredits(-n);
        await systemLine(`-${n} crédits GPU.`);
      } else if ('heal_party' in step) {
        game.healParty();
      } else if ('start_battle' in step) {
        await runBattleStep(step.start_battle, world);
      } else if ('open' in step) {
        if (step.open === 'store') await ui.store();
        else if (step.open === 'repo') await ui.menu('repo');
        else if (step.open === 'vending') await ui.vending(step.items);
        else if (step.open === 'starter_choice') {
          await ui.starter();
          syncStarterFlags();
        } else await ui.menu(step.open === 'neurodex' ? 'dex' : 'team');
      } else if ('warp' in step) {
        await world.warp(step.warp, step.x, step.y);
      } else if ('move_npc' in step) {
        await world.moveNpc(step.move_npc, step.path);
      } else if ('cutscene' in step) {
        inCutscene = step.cutscene === 'start';
        world.setCutscene(inCutscene);
        ui.cutscene(inCutscene);
      } else if ('npc_approach' in step) {
        await world.npcApproach(step.npc_approach);
      } else if ('npc_leave' in step) {
        await world.npcLeave(step.npc_leave, step.to, step.hide);
      } else if ('camera' in step) {
        await world.camera(step.camera, step.ms);
      } else if ('emote' in step) {
        await world.emote(step.who, step.emote);
      } else if ('intro_card' in step) {
        const c = step.intro_card;
        await ui.introCard({ ...c, name: interpolate(c.name, vars()), title: interpolate(c.title, vars()) });
      } else if ('end' in step) {
        break;
      } else {
        console.warn(`script ${scriptId}: unknown step skipped`, step);
      }
    }
  } catch (e) {
    if (!(e instanceof ScriptAbort)) throw e;
  } finally {
    // A script that dies or ends mid-cutscene must never leave the bars up / the world locked.
    if (inCutscene) {
      world.setCutscene(false);
      ui.cutscene(false);
    }
  }
}
