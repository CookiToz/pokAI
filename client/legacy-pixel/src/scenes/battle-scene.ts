// Battle overlay: drives BattleEngine and animates its events. Rules live in systems/battle.ts.
import Phaser from 'phaser';
import { SCENES } from './keys';
import type { BattleOutcome, BattleSceneData, EvolutionSceneData, OnboardingSceneData } from './contracts';
import { C, GAME_WIDTH, TEXT } from '../ui/theme';
import { db } from '../data/db';
import { game } from '../state/store';
import { api } from '../net/api';
import type { PokaiInstance } from '../state/types';
import { createPokai, displayName, canUseItem, maxContext, pendingEvolution } from '../systems/pokai';
import { createRng, type Rng } from '../systems/rng';
import {
  BattleEngine,
  createTrainerTeam,
  type BattleEvent,
  type BattleSide,
  type PlayerAction,
} from '../systems/battle';
import { InputRouter, type Action } from '../ui/input';
import { fadeIn, fadeOut, wait } from '../ui/gfx';
import { LogBox } from '../ui/log-box';
import { Panel } from '../ui/panel';
import { MenuList, type MenuItem } from '../ui/menu-list';
import { BattleView, STAGE_H } from '../ui/battle-view';
import { typeBadge } from '../ui/badges';
import { pickParty } from '../ui/party-screen';
import { cookieBanner } from '../ui/cookie-banner';
import { runOverlay } from '../ui/overlay';
import { sparkleBurst } from '../ui/fx';
import { badgeName } from '../ui/labels';
import { fmtCredits } from '../ui/format';
import { txt } from '../ui/text';
import type { OnboardingDone } from './onboarding-scene';

const PANE = { x: 176, y: 119, w: 142, h: 59 };
const LOG = { x: 2, y: 119, w: 172, h: 59 };

interface FightSetup {
  kind: 'wild' | 'trainer';
  foe: PokaiInstance[];
  trainerId?: string;
  canFlee: boolean;
}

interface FightResult {
  outcome: 'won' | 'lost' | 'fled' | 'onboarded';
  pokai?: PokaiInstance;
  alert?: boolean;
}

export class BattleScene extends Phaser.Scene {
  private d!: BattleSceneData;
  private router!: InputRouter;
  private log!: LogBox;
  private paneNodes: Phaser.GameObjects.GameObject[] = [];
  private view?: BattleView;
  private engine!: BattleEngine;
  private rng!: Rng;
  private shown: Record<BattleSide, PokaiInstance | null> = { player: null, foe: null };
  private onField: Record<BattleSide, boolean> = { player: false, foe: false };
  private evolveReady = new Set<string>();
  private onboardReady = false;
  private endOutcome: 'won' | 'lost' | 'fled' | null = null;
  private finished = false;
  private finesApplied = 0;

  constructor() {
    super(SCENES.Battle);
  }

  init(data: BattleSceneData): void {
    this.d = data;
  }

  create(): void {
    this.paneNodes = [];
    this.view = undefined;
    this.shown = { player: null, foe: null };
    this.onField = { player: false, foe: false };
    this.evolveReady = new Set();
    this.finished = false;
    this.router = new InputRouter(this);
    this.cameras.main.setBackgroundColor(C.ink);
    fadeIn(this, 160);
    new Panel(this, PANE.x, PANE.y, PANE.w, PANE.h, { style: 'terminal' }).setDepth(50);
    this.log = new LogBox(this, this.router, LOG.x, LOG.y, LOG.w, LOG.h).setDepth(50);
    this.rng = createRng(game.nextSeed());
    void this.run().catch((err: unknown) => {
      console.error('[BattleScene]', err);
      void this.close({ kind: 'fled' });
    });
  }

  // ---------------------------------------------------------------- flow

  private async run(): Promise<void> {
    const state = game.state;
    if (!state.party.some((p) => p.context > 0)) {
      await this.close({ kind: 'lost' });
      return;
    }
    const setup = this.buildSetup(this.d);
    let res = await this.fight(setup);

    // Jailbreak that tripped the AIACT: an Agent de Conformité shows up right after the capture.
    if (res.outcome === 'onboarded' && res.alert) {
      const agent = db.allTrainers().find((t) => t.aiact === true && t.id.includes('grunt')) ?? db.allTrainers().find((t) => t.aiact === true);
      if (agent) {
        await this.log.print('Un Agent de Conformité débarque, attaché-case à la main !', { tag: '[AIACT]', tagColour: C.steel });
        const second = await this.fight({
          kind: 'trainer',
          trainerId: agent.id,
          foe: createTrainerTeam(agent.id, this.rng),
          canFlee: false,
        });
        if (second.outcome === 'lost') res = { outcome: 'lost' };
      }
    }

    if (res.outcome === 'won' || res.outcome === 'onboarded') await this.runEvolutions();
    if (res.outcome === 'onboarded' && res.pokai) await this.close({ kind: 'onboarded', pokai: res.pokai });
    else if (res.outcome === 'won') await this.close({ kind: 'won' });
    else if (res.outcome === 'lost') await this.close({ kind: 'lost' });
    else await this.close({ kind: 'fled' });
  }

  private buildSetup(d: BattleSceneData): FightSetup {
    if (d.kind === 'trainer' && d.trainerId) {
      return { kind: 'trainer', trainerId: d.trainerId, foe: createTrainerTeam(d.trainerId, this.rng), canFlee: false };
    }
    const w = d.wild ?? { form: 'claude_haiku', level: 3 };
    return { kind: 'wild', foe: [createPokai(w.form, w.level, this.rng)], canFlee: d.canFlee };
  }

  private async close(result: BattleOutcome): Promise<void> {
    if (this.finished) return;
    this.finished = true;
    this.router.clear();
    await fadeOut(this, 160);
    this.d.onDone(result);
    this.scene.stop();
  }

  private async fight(setup: FightSetup): Promise<FightResult> {
    const trainer = setup.trainerId && db.hasTrainer(setup.trainerId) ? db.trainer(setup.trainerId) : undefined;
    this.view?.destroy();
    this.view = new BattleView(this, setup.kind, trainer?.aiact === true);
    const view = this.view;
    this.log.clear();
    this.clearPane();
    this.onboardReady = false;
    this.endOutcome = null;
    this.shown = { player: null, foe: null };
    this.onField = { player: false, foe: false };
    this.finesApplied = 0;

    this.engine = new BattleEngine(
      {
        player: game.state.party,
        foe: setup.foe,
        kind: setup.kind,
        ...(setup.trainerId ? { trainerId: setup.trainerId } : {}),
        vibeurClass: game.state.vibeurClass,
      },
      this.rng,
    );
    const engine = this.engine;
    const foe0 = engine.active('foe');
    const me0 = engine.active('player');

    await this.router.locking(async () => {
      if (trainer) {
        await view.showTrainer(`portrait:${trainer.sprite}`);
        await this.log.print(`${trainer.name} veut se battre !`, { tag: '[Défi]', tagColour: C.ember });
        await view.hideTrainer();
        await this.enterSide('foe', foe0);
        await this.log.print(`${trainer.name} envoie ${displayName(foe0)} !`);
      } else {
        await this.enterSide('foe', foe0);
        await this.log.print(`Un ${displayName(foe0)} sauvage apparaît !`, { tag: '[Câbles]', tagColour: C.leaf });
      }
      await this.enterSide('player', me0);
      await this.log.print(`Go, ${displayName(me0)} !`);
    });

    if (trainer?.aiact) await this.cookieRound();

    while (!engine.state.over) {
      if (engine.state.needSwitch) {
        const idx = await this.pickMember('Envoie un PokAI', true);
        await this.play(engine.act({ kind: 'switch', index: idx ?? this.firstHealthy() }));
        continue;
      }
      const act = await this.chooseAction(setup);
      if (act.kind === 'item') game.removeItem(act.itemId);
      await this.play(engine.act(act));
      if (this.onboardReady) {
        this.onboardReady = false;
        const r = await this.onboardFlow();
        if (r) return r;
      }
    }

    const outcome = this.endOutcome ?? engine.state.outcome ?? 'fled';
    if (outcome === 'won' && trainer) await this.trainerRewards(trainer.id);
    return { outcome };
  }

  private firstHealthy(): number {
    const i = this.engine.player.findIndex((p, k) => p.context > 0 && k !== this.engine.state.playerActive);
    return Math.max(0, i);
  }

  private async enterSide(side: BattleSide, p: PokaiInstance): Promise<void> {
    if (side === 'foe') game.markSeen(p.form);
    this.shown[side] = p;
    this.onField[side] = true;
    await this.view?.enter(side, p);
  }

  // ---------------------------------------------------------------- cookie banner

  private async cookieRound(): Promise<void> {
    await this.log.print('Une bannière de cookies recouvre le champ de bataille !', { tag: '[AIACT]', tagColour: C.steel });
    const consent = await cookieBanner(this, this.router);
    if (consent) {
      await this.router.locking(async () => {
        await this.log.print('Cookies acceptés. Tu perds ton premier tour.', { tag: '[AIACT]', tagColour: C.steel });
      });
      // The engine has no "pass" action: resolving a failed onboarding lets only the foe act.
      await this.play(this.engine.resolveOnboarding('failed'));
    } else {
      await this.router.locking(async () => {
        await this.log.print('Cookies refusés du premier coup. Tu gardes la main.', { tag: '[AIACT]', tagColour: C.leaf });
      });
    }
  }

  // ---------------------------------------------------------------- event animation

  private async play(events: BattleEvent[]): Promise<void> {
    await this.router.locking(async () => {
      for (const e of events) await this.playOne(e);
      const fines = this.engine.fines;
      while (this.finesApplied < fines) {
        this.finesApplied++;
        game.addCredits(-Math.floor(game.state.credits * 0.06));
      }
    });
  }

  private nameOf(side: BattleSide): string {
    const p = this.shown[side];
    return p ? displayName(p) : '???';
  }

  private async playOne(e: BattleEvent): Promise<void> {
    const view = this.view;
    if (!view) return;
    switch (e.kind) {
      case 'message':
        await this.log.print(e.text);
        break;
      case 'move_used': {
        const move = db.hasMove(e.moveId) ? db.move(e.moveId) : undefined;
        const lunge = view.lunge(e.side);
        await this.log.print(`utilise ${move?.name ?? e.moveId}…`, {
          tag: `[${this.nameOf(e.side)}]`,
          tagColour: e.side === 'player' ? C.sky : C.rose,
          pauseMs: 120,
        });
        await lunge;
        break;
      }
      case 'damage':
        await view.hit(e.side, e.amount, e.hp, e.maxHp, e.effectiveness);
        break;
      case 'heal':
        await view.heal(e.side, e.amount, e.hp, e.maxHp);
        break;
      case 'status':
        view.setStatus(e.side, e.status);
        break;
      case 'stat':
        view.statChange(e.side, e.stat, e.stages);
        break;
      case 'faint':
        this.onField[e.side] = false;
        await view.faint(e.side);
        break;
      case 'switch_in': {
        const p = (e.side === 'player' ? this.engine.player : this.engine.foe)[e.index];
        if (!p) break;
        if (this.onField[e.side]) await view.recall(e.side);
        this.shown[e.side] = p;
        this.onField[e.side] = true;
        if (e.side === 'foe') game.markSeen(p.form);
        await view.popIn(e.side, p);
        break;
      }
      case 'need_switch':
        break;
      case 'xp':
        await this.onXp(e);
        break;
      case 'onboard_ready':
        this.onboardReady = true;
        break;
      case 'fled':
        await view.leave('player', false);
        break;
      case 'end':
        this.endOutcome = e.outcome;
        break;
    }
  }

  private async onXp(e: Extract<BattleEvent, { kind: 'xp' }>): Promise<void> {
    const view = this.view;
    const p = this.engine.player.find((x) => x.uid === e.uid);
    if (!view || !p) return;
    const active = this.shown.player?.uid === p.uid && this.onField.player;
    const card = view.playerCard;
    const ups = e.events.filter((x) => x.kind === 'levelup').length;
    if (active && e.amount > 0) card.setXpInstant(card.xpRatio(p.level - ups, Math.max(0, p.xp - e.amount)));
    let level = p.level - ups;
    if (active && e.amount > 0 && ups === 0) await card.setXp(card.xpRatio(p.level, p.xp));
    for (const ev of e.events) {
      if (ev.kind === 'levelup') {
        if (active) {
          await card.setXp(1);
          level = ev.level;
          card.setLevel(level);
          card.setXpInstant(0);
          sparkleBurst(this, 72, 84, { count: 12, radius: 26 });
        }
        await this.log.print(`${displayName(p)} passe au niveau ${ev.level} !`, { tag: '[Niv+]', tagColour: C.gold });
        if (active) await card.setHp(p.context, maxContext(p));
      } else if (ev.kind === 'learn') {
        const mv = db.hasMove(ev.move) ? db.move(ev.move).name : ev.move;
        const old = ev.replaced && db.hasMove(ev.replaced) ? db.move(ev.replaced).name : ev.replaced;
        await this.log.print(
          old ? `${displayName(p)} oublie ${old} et apprend ${mv} !` : `${displayName(p)} apprend ${mv} !`,
          { tag: '[Tech]', tagColour: C.sky },
        );
      } else {
        this.evolveReady.add(p.uid);
        await this.log.print(`Une mise à jour est disponible pour ${displayName(p)} !`, { tag: '[Hub]', tagColour: C.gold });
      }
    }
    if (active && e.amount > 0 && ups > 0) await card.setXp(card.xpRatio(p.level, p.xp));
  }

  // ---------------------------------------------------------------- menus

  private clearPane(): void {
    this.paneNodes.forEach((n) => n.destroy());
    this.paneNodes = [];
  }

  /** One-column menu inside the right-hand pane. Resolves with the index, -1 on B. */
  private pickPane(items: MenuItem[], o: { index?: number; extra?: (list: MenuList) => Phaser.GameObjects.GameObject[]; onChange?: (i: number) => void } = {}): Promise<number> {
    this.clearPane();
    return new Promise((resolve) => {
      const list = new MenuList(this, {
        x: PANE.x + 5,
        y: PANE.y + 5,
        width: PANE.w - 10,
        items,
        rowH: 9,
        style: { ...TEXT.small, color: C.cream },
        colour: C.cream,
        disabledColour: C.dusk,
        onSelect: (i) => done(i),
        onCancel: () => done(-1),
        ...(o.onChange ? { onChange: o.onChange } : {}),
      });
      list.setDepth(60);
      if (o.index !== undefined) list.setIndex(o.index, true);
      this.paneNodes.push(list);
      for (const n of o.extra?.(list) ?? []) {
        (n as Phaser.GameObjects.Container).setDepth?.(60);
        this.paneNodes.push(n);
      }
      const handler = (a: Action): void => {
        list.handle(a);
      };
      this.router.push(handler);
      let closed = false;
      const done = (i: number): void => {
        if (closed) return;
        closed = true;
        this.router.pop(handler);
        resolve(i);
      };
    });
  }

  private async chooseAction(setup: FightSetup): Promise<PlayerAction> {
    const me = this.engine.active('player');
    await this.log.print(`Que doit faire ${displayName(me)} ?`, { instant: true, pauseMs: 0 });
    let last = 0;
    for (;;) {
      const i = await this.pickPane(
        [{ label: 'Attaquer' }, { label: 'Onboarder' }, { label: 'Équipe' }, { label: 'Sac' }, { label: 'Fuir' }],
        { index: last },
      );
      if (i >= 0) last = i;
      if (i === 0) {
        const a = await this.moveMenu();
        if (a) return this.leavePane(a);
      } else if (i === 1) {
        return this.leavePane({ kind: 'onboard' });
      } else if (i === 2) {
        this.clearPane();
        const idx = await this.pickMember('Équipe', false);
        if (idx !== null) return this.leavePane({ kind: 'switch', index: idx });
      } else if (i === 3) {
        const a = await this.bagMenu();
        if (a) return this.leavePane(a);
      } else if (i === 4) {
        if (!setup.canFlee && setup.kind === 'wild') {
          await this.router.locking(() => this.log.print('Impossible de fuir ce combat !'));
          await this.log.print(`Que doit faire ${displayName(me)} ?`, { instant: true, pauseMs: 0 });
        } else return this.leavePane({ kind: 'flee' });
      }
    }
  }

  private leavePane(a: PlayerAction): PlayerAction {
    this.clearPane();
    return a;
  }

  private async moveMenu(): Promise<PlayerAction | null> {
    const me = this.engine.active('player');
    const anyLeft = me.moves.some((m) => m.tokens > 0);
    const items: MenuItem[] = me.moves.map((m) => {
      const mv = db.move(m.move);
      const name = mv.name.length > 14 ? `${mv.name.slice(0, 13)}…` : mv.name;
      return { label: name, right: `${m.tokens}/${mv.tokens}`, disabled: m.tokens <= 0 && anyLeft };
    });
    let info: Phaser.GameObjects.Text | undefined;
    let badge: Phaser.GameObjects.Container | undefined;
    const showInfo = (i: number): void => {
      const slot = me.moves[i];
      if (!slot) return;
      const mv = db.move(slot.move);
      badge?.destroy();
      badge = typeBadge(this, PANE.x + 5, PANE.y + 46, mv.type).setDepth(60);
      this.paneNodes.push(badge);
      const pow = mv.power > 0 ? `PUI ${mv.power}` : 'STATUT';
      info?.setText(`${pow}  PRÉ ${mv.accuracy}`);
    };
    const i = await this.pickPane(items, {
      extra: () => {
        info = txt(this, PANE.x + 46, PANE.y + 46, '', { ...TEXT.log, color: C.fog }).setDepth(60);
        // type chips in a column left of the token counts
        const chips: Phaser.GameObjects.GameObject[] = [info];
        me.moves.forEach((m, k) => {
          const b = typeBadge(this, PANE.x + PANE.w - 36 - 30, PANE.y + 5 + k * 9, db.move(m.move).type);
          b.setScale(1);
          chips.push(b);
        });
        queueMicrotask(() => showInfo(0));
        return chips;
      },
      onChange: showInfo,
    });
    if (i < 0) return null;
    return { kind: 'move', index: i };
  }

  private async bagMenu(): Promise<PlayerAction | null> {
    const usable = Object.entries(game.state.bag)
      .filter(([id, n]) => n > 0 && db.hasItem(id) && ['heal', 'status_heal'].includes(db.item(id).kind))
      .map(([id, n]) => ({ id, n }));
    if (usable.length === 0) {
      this.clearPane();
      await this.router.locking(() => this.log.print('Ton sac ne contient aucun soin.'));
      return null;
    }
    const i = await this.pickPane(usable.map((u) => ({ label: db.item(u.id).name, right: `x${u.n}` })));
    const picked = usable[i];
    if (i < 0 || !picked) return null;
    this.clearPane();
    const target = await this.pickMember(`${db.item(picked.id).name} sur…`, false, (p) =>
      canUseItem(picked.id, p) ? null : 'Ça n\'aurait aucun effet.',
    );
    const p = target === null ? undefined : game.state.party[target];
    if (!p) return null;
    return { kind: 'item', itemId: picked.id, targetUid: p.uid };
  }

  private pickMember(title: string, forced: boolean, validate?: (p: PokaiInstance) => string | null): Promise<number | null> {
    const engine = this.engine;
    return pickParty(this, this.router, {
      party: engine.player,
      title,
      forced,
      activeIndex: engine.state.playerActive,
      validate:
        validate ??
        ((p, i) => {
          if (p.context <= 0) return 'Ce PokAI est hors service.';
          if (i === engine.state.playerActive) return 'Ce PokAI est déjà en jeu.';
          return null;
        }),
    });
  }

  // ---------------------------------------------------------------- onboarding

  /** Returns a fight result when the battle ended, null to go back to the menu. */
  private async onboardFlow(): Promise<FightResult | null> {
    const keys = Object.entries(game.state.bag)
      .filter(([id, n]) => n > 0 && db.hasItem(id) && db.item(id).kind === 'api_key')
      .map(([id, n]) => ({ id, n }));
    if (keys.length === 0) {
      await this.router.locking(() => this.log.print("Tu n'as pas de Clé API."));
      return null;
    }
    const i = await this.pickPane(keys.map((k) => ({ label: db.item(k.id).name, right: `x${k.n}` })));
    const key = keys[i];
    this.clearPane();
    if (i < 0 || !key) return null;
    const foe = this.engine.active('foe');
    game.removeItem(key.id);

    const res = await runOverlay<OnboardingDone>(this, SCENES.Onboarding, (done) => {
      const data: OnboardingSceneData = { target: foe, keyItem: key.id, onDone: done };
      return data;
    });

    if (res.success) {
      game.addPokai(foe);
      const reported = api.reportCatch(foe.form).catch(() => null);
      await this.play(this.engine.resolveOnboarding('success'));
      const first = await Promise.race([reported, wait(this, 400).then(() => null)]);
      if (first?.first) {
        await this.router.locking(() =>
          this.log.print(`Tu es le premier joueur au monde à onboarder ${displayName(foe)} !`, { tag: '[Neurodex]', tagColour: C.gold }),
        );
      }
      return { outcome: 'onboarded', pokai: foe, alert: res.aiactAlert === true };
    }
    if (res.fled) {
      await this.play(this.engine.resolveOnboarding('fled'));
      await this.view?.leave('foe', true);
      return { outcome: 'fled' };
    }
    game.addItem(key.id);
    await this.router.locking(() => this.log.print('Connexion fermée. Ta clé API t\'est restituée.'));
    return null;
  }

  // ---------------------------------------------------------------- rewards, evolutions

  private async trainerRewards(trainerId: string): Promise<void> {
    const t = db.trainer(trainerId);
    await this.router.locking(async () => {
      if (t.reward > 0) {
        game.addCredits(t.reward);
        await this.log.print(`${t.name} te verse ${fmtCredits(t.reward)} de crédits GPU.`, { tag: '[Gain]', tagColour: C.gold });
      }
      if (t.badge) {
        game.addBadge(t.badge);
        await this.log.print(`Badge obtenu : ${badgeName(t.badge)} !`, { tag: '[Badge]', tagColour: C.gold });
        sparkleBurst(this, GAME_WIDTH / 2, STAGE_H / 2, { count: 18, radius: 40 });
      }
    });
  }

  private async runEvolutions(): Promise<void> {
    for (const uid of this.evolveReady) {
      const p = game.findPokai(uid);
      if (!p) continue;
      const options = pendingEvolution(p, game.state.vibeurClass);
      if (options.length === 0) continue;
      await runOverlay<string | null>(this, SCENES.Evolution, (done) => {
        const data: EvolutionSceneData = { pokaiUid: uid, options, onDone: done };
        return data;
      });
    }
  }
}

