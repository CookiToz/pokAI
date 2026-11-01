// "Chat duel": drives BattleEngine and presents each BattleEvent as a chat line + card animation.
// Rules live in systems/battle.ts; nothing here decides game outcomes.
import './common.css';
import './duel.css';
import { audio, type TrackName } from '../../audio/audio';
import { h } from '../dom';
import { ui } from '../facade';
import { db } from '../../data/db';
import { game } from '../../state/store';
import { api } from '../../net/api';
import { pokaiSvg } from '../../art/svg';
import { portraitOrPlayer } from '../intro/appearance';
import type { Action } from '../../input/input';
import type { BattleOutcome } from '../../scenes/contracts';
import type { BattleRequest } from '../facade';
import type { PokaiInstance } from '../../state/types';
import type { MoveCategory, TypeId } from '../../data/types';
import { BattleEngine, createTrainerTeam, type BattleEvent, type BattleSide, type PlayerAction } from '../../systems/battle';
import { canUseItem, createPokai, displayName, maxContext, pendingEvolution } from '../../systems/pokai';
import { createRng, type Rng } from '../../systems/rng';
import { computeStats, xpForLevel } from '../../systems/stats';
import { learnLine, resolveLearnEvents } from '../shared/forget-move';
import { Backdrop, arenaTheme, THEME_LABEL } from './backdrop';
import { ChatLog } from './chat-log';
import { icon } from './icons';
import { cookieBanner } from './cookie-banner';
import { showResult, newSummary, type DuelSummary } from './end-screen';
import { FxLayer } from './fx';
import { TurnPill } from './hud';
import { ModelCard } from './model-card';
import { pickSheet, type SheetRow } from './modals';
import { runOnboarding } from './onboarding';
import { PromptBar, type CensorInfo } from './prompt-bar';
import { Screen, titlebar } from './screen';
import { BADGE_NAME, Pacer, STAT_LABEL, STAT_ORDER, fmtInt, fmtTokens, sleep, STATUS_LABEL, TOKEN_SCALE } from './util';

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

const FINE_RATE = 0.06;

class Duel {
  private screen = new Screen('duel', 'bt-duel');
  private pacer = new Pacer();
  private chat = new ChatLog(this.pacer);
  private cards = { player: new ModelCard('player'), foe: new ModelCard('foe') };
  private bar = new PromptBar();
  private pill = new TurnPill();
  private summary: DuelSummary = newSummary();
  private resultKey: ((a: Action) => void) | null = null;
  private turnNo = 0;
  private censor: (CensorInfo & { fresh: boolean }) | null = null;
  private koFoe = new Set<string>();
  private isTrainer = false;
  private titleEl = h('span.bt-title', null, 'duel.exe');
  private metaEl = h('span.bt-meta', null, '');
  private bannerEl: HTMLElement;
  private rng: Rng = createRng(game.nextSeed());
  private engine!: BattleEngine;
  private shown: Record<BattleSide, PokaiInstance | null> = { player: null, foe: null };
  private onField: Record<BattleSide, boolean> = { player: false, foe: false };
  private evolveReady = new Set<string>();
  private onboardReady = false;
  private endOutcome: 'won' | 'lost' | 'fled' | null = null;
  private finesApplied = 0;
  private locked = true;
  private lockedAt = 0;
  private tags: string[] = [];
  private bg: Backdrop;
  private fx: FxLayer;
  /** FX already shown for the move being played (so status/stat events do not repeat them). */
  private moveFx = { aura: false, arrows: false };

  constructor(private req: BattleRequest) {
    this.bannerEl = h(
      'div.bt-titlebar',
      null,
      h('span.bt-dots', null, h('i'), h('i'), h('i')),
      this.titleEl,
      this.metaEl,
    );
    const axis = h('div.bt-axis', null, this.pill.el, h('div.bt-vs-wrap', null, h('i.bt-vs-line'), h('div.bt-vs', null, 'VS'), h('i.bt-vs-line')));
    const arena = h('div.bt-arena', null, this.cards.player.el, axis, this.cards.foe.el);
    const dock = h('div.bt-dock', null, this.chat.el, this.bar.el);
    const body = h('div.bt-duel-body', null, arena, dock);
    this.screen.root.append(this.bannerEl, body);
    this.bg = new Backdrop(this.screen.root);
    this.fx = new FxLayer(this.screen.root, this.pacer, (side) => (this.cards[side].el.querySelector('.bt-mart-wrap') as HTMLElement | null) ?? this.cards[side].el, body);
    this.screen.onAction((a) => {
      if (this.resultKey) {
        this.resultKey(a);
        return;
      }
      if (this.locked) {
        if (a === 'confirm' && performance.now() - this.lockedAt > 260) {
          this.pacer.fast = true;
          this.fx.flush();
        }
        return;
      }
      this.bar.handle(a);
    });
  }

  private setTitle(title: string, meta: string, aiact: boolean): void {
    this.titleEl.textContent = title;
    this.metaEl.textContent = meta;
    this.bannerEl.classList.toggle('is-aiact', aiact);
  }

  private lock(): void {
    this.locked = true;
    this.lockedAt = performance.now();
    this.pacer.reset();
    this.bar.lock();
    this.pill.set('busy', 'Échange en cours', this.engine ? this.engine.state.turn : undefined);
  }

  // ---------------------------------------------------------------- flow

  async run(): Promise<BattleOutcome> {
    try {
      return await this.runInner();
    } catch (err) {
      console.error('[duel]', err);
      return { kind: 'fled' };
    } finally {
      ui.setHints([]);
      audio.resume();
      await this.screen.close();
    }
  }

  private async runInner(): Promise<BattleOutcome> {
    if (!game.state.party.some((p) => p.context > 0)) return { kind: 'lost' };
    const setup = this.buildSetup();
    let res = await this.fight(setup);

    // A tripped jailbreak: an Agent de Conformité shows up right after the capture.
    if (res.outcome === 'onboarded' && res.alert) {
      const agent = db.allTrainers().find((t) => t.aiact === true && t.id.includes('grunt')) ?? db.allTrainers().find((t) => t.aiact === true);
      if (agent) {
        this.lock();
        await this.chat.system('Un Agent de Conformité débarque, attaché-case à la main !', { tag: '[AIACT]', tone: 'aiact' });
        const second = await this.fight({ kind: 'trainer', trainerId: agent.id, foe: createTrainerTeam(agent.id, this.rng), canFlee: false });
        if (second.outcome === 'lost') res = { outcome: 'lost' };
      }
    }

    if (res.outcome === 'won' || res.outcome === 'onboarded') await this.runEvolutions();
    await this.endBeat(res.outcome);
    if (res.outcome === 'onboarded' && res.pokai) return { kind: 'onboarded', pokai: res.pokai };
    if (res.outcome === 'won') return { kind: 'won' };
    if (res.outcome === 'lost') return { kind: 'lost' };
    return { kind: 'fled' };
  }

  /** Closing beat: a result window with the rewards summary (a short line only when fleeing). */
  private async endBeat(outcome: FightResult['outcome']): Promise<void> {
    this.lock();
    this.pill.set('idle');
    const label = { won: 'victoire', lost: 'défaite', fled: 'fuite', onboarded: 'onboarding réussi' }[outcome];
    this.chat.divider(`fin du duel — ${label}`);
    this.summary.outcome = outcome;
    if (outcome === 'fled') {
      await sleep(600);
      return;
    }
    await sleep(outcome === 'lost' ? 500 : 250);
    const r = showResult(this.screen.root, this.summary);
    this.resultKey = r.key;
    this.screen.hints([['confirm', 'Continuer']]);
    await r.done;
    this.resultKey = null;
  }

  private buildSetup(): FightSetup {
    const r = this.req;
    if (r.kind === 'trainer' && r.trainerId) {
      return { kind: 'trainer', trainerId: r.trainerId, foe: createTrainerTeam(r.trainerId, this.rng), canFlee: false };
    }
    const w = r.wild ?? { form: 'claude_haiku', level: 3 };
    return { kind: 'wild', foe: [createPokai(w.form, w.level, this.rng)], canFlee: r.canFlee };
  }

  private async fight(setup: FightSetup): Promise<FightResult> {
    const trainer = setup.trainerId && db.hasTrainer(setup.trainerId) ? db.trainer(setup.trainerId) : undefined;
    this.chat.clear();
    this.onboardReady = false;
    this.endOutcome = null;
    this.finesApplied = 0;
    this.tags = [];
    this.turnNo = 0;
    this.censor = null;
    this.koFoe.clear();
    this.isTrainer = trainer !== undefined;
    this.cards.player.strip.el.hidden = true;
    this.cards.foe.strip.el.hidden = true;
    this.shown = { player: null, foe: null };
    this.onField = { player: false, foe: false };
    this.cards.player.el.classList.add('is-empty');
    this.cards.foe.el.classList.add('is-empty');
    const theme = arenaTheme(trainer, game.state.map);
    this.bg.set(theme);
    this.setTitle(trainer ? `duel.exe — ${trainer.name}` : 'duel.exe — câbles', trainer?.aiact ? 'AIACT · conformité' : trainer ? THEME_LABEL[theme] : 'sauvage', trainer?.aiact === true);

    const track: TrackName = !trainer ? 'battle_wild' : trainer.aiact ? 'battle_aiact' : trainer.badge ? 'battle_leader' : 'battle_trainer';
    audio.music(track);

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
    this.summary.foe = trainer ? trainer.name : displayName(foe0);
    this.chat.setSub(setup.kind === 'trainer' ? 'duel de dresseur' : 'rencontre dans les câbles');

    this.lock();
    if (trainer) {
      await this.trainerIntro(trainer.name, trainer.sprite, trainer.aiact === true);
      await this.chat.system(`${trainer.name} veut se battre !`, { tag: '[Défi]', tone: 'gold' });
      await this.enterSide('foe', foe0);
      await this.chat.system(`${trainer.name} envoie ${displayName(foe0)} !`);
    } else {
      await this.enterSide('foe', foe0);
      await this.chat.system(`Un ${displayName(foe0)} sauvage apparaît !`, { tag: '[Câbles]', tone: 'good' });
    }
    await this.enterSide('player', me0);
    await this.chat.system(`Go, ${displayName(me0)} !`);

    if (trainer?.aiact) await this.cookieRound();

    while (!engine.state.over) {
      if (engine.state.needSwitch) {
        const idx = await this.pickMember('Envoie un PokAI', true);
        await this.play(engine.act({ kind: 'switch', index: idx ?? this.firstHealthy() }));
        continue;
      }
      const act = await this.chooseAction(setup);
      this.turnNo++;
      this.summary.turns++;
      this.chat.turn(`tour ${this.turnNo}`);
      if (act.kind === 'item') game.removeItem(act.itemId);
      await this.play(engine.act(act));
      if (this.onboardReady) {
        this.onboardReady = false;
        const r = await this.onboardFlow();
        if (r) return r;
      }
    }

    const outcome = this.endOutcome ?? engine.state.outcome ?? 'fled';
    if (outcome === 'won') audio.music('victory');
    if (outcome === 'won' && trainer) await this.trainerRewards(trainer.id);
    return { outcome };
  }

  private firstHealthy(): number {
    const i = this.engine.player.findIndex((p, k) => p.context > 0 && k !== this.engine.state.playerActive);
    return Math.max(0, i);
  }

  private async enterSide(side: BattleSide, p: PokaiInstance, hp = p.context): Promise<void> {
    if (side === 'foe') game.markSeen(p.form);
    this.shown[side] = p;
    this.onField[side] = true;
    this.cards[side].show(p, hp);
    this.refreshStrip(side, p, hp);
    await this.cards[side].enter();
  }

  private refreshStrip(side: BattleSide, p: PokaiInstance, hp: number): void {
    const strip = this.cards[side].strip;
    if (side === 'player') {
      strip.render(this.engine.player, p.uid);
      strip.update(p.uid, hp, p.status ?? null, true);
    } else {
      strip.render(this.engine.foe, p.uid, this.isTrainer);
      strip.setFoeState(this.engine.foe, p.uid, this.koFoe);
    }
  }

  private async trainerIntro(name: string, sprite: string, aiact: boolean): Promise<void> {
    const art = portraitOrPlayer(sprite);
    const portrait = h('div.bt-intro-portrait', art ? { html: art } : null, art ? null : name.charAt(0));
    const card = h(
      aiact ? 'div.bt-intro-card.is-aiact' : 'div.bt-intro-card',
      null,
      portrait,
      h('div', null, h('div.bt-intro-name', null, name), h('div.bt-intro-sub', null, aiact ? 'Agent de Conformité' : 'te défie en duel')),
    );
    const layer = h('div.bt-intro', null, card);
    this.screen.root.append(layer);
    await sleep(this.pacer.fast ? 300 : 1000);
    layer.remove();
  }

  // ---------------------------------------------------------------- cookie banner

  private async cookieRound(): Promise<void> {
    audio.sfx('cookie');
    await this.chat.system('Une bannière de cookies recouvre le champ de bataille !', { tag: '[AIACT]', tone: 'aiact' });
    const consent = await cookieBanner(this.screen.root);
    this.lock();
    if (consent) {
      await this.chat.system('Cookies acceptés. Tu perds ton premier tour.', { tag: '[AIACT]', tone: 'aiact' });
      // The engine has no "pass" action: a failed onboarding lets only the foe act.
      await this.play(this.engine.resolveOnboarding('failed'));
    } else {
      await this.chat.system('Cookies refusés du premier coup. Tu gardes la main.', { tag: '[AIACT]', tone: 'good' });
    }
  }

  // ---------------------------------------------------------------- event playback

  private async play(events: BattleEvent[]): Promise<void> {
    this.lock();
    for (const [i, e] of events.entries()) await this.playOne(e, events, i);
    while (this.finesApplied < this.engine.fines) {
      this.finesApplied++;
      const fine = Math.floor(game.state.credits * FINE_RATE);
      game.addCredits(-fine);
      this.summary.credits -= fine;
      this.chat.note(`Amende : −${fmtInt(fine)} crédits GPU (6 %).`, 'aiact');
    }
    if (this.censor) {
      const st = this.engine.active('player').status;
      if (st !== 'censored') this.censor = null;
      else if (this.censor.fresh) this.censor.fresh = false;
      else this.censor.turns = Math.max(1, this.censor.turns - 1);
    }
    this.metaEl.textContent = (this.metaEl.textContent ?? '').replace(/ · tour \d+$/, '') + ` · tour ${this.engine.state.turn}`;
  }

  private nameOf(side: BattleSide): string {
    const p = this.shown[side];
    return p ? displayName(p) : '???';
  }

  /** HP to show for a freshly switched-in PokAI: the engine already applied later damage of the same batch. */
  private hpBefore(events: BattleEvent[], from: number, side: BattleSide, p: PokaiInstance): number {
    for (let k = from + 1; k < events.length; k++) {
      const e = events[k];
      if (!e || e.kind === 'switch_in' && e.side === side) break;
      if (e.kind === 'damage' && e.side === side) return e.hp + e.amount;
      if (e.kind === 'heal' && e.side === side) return e.hp - e.amount;
    }
    return p.context;
  }

  private stripHp(side: BattleSide, hp: number | undefined): void {
    const p = this.shown[side];
    if (!p || side !== 'player') return;
    this.cards.player.strip.update(p.uid, hp ?? Math.max(0, p.context), this.engine.active('player').uid === p.uid ? this.engine.active('player').status ?? null : p.status ?? null, true);
  }

  private async playOne(e: BattleEvent, events: BattleEvent[], i: number): Promise<void> {
    switch (e.kind) {
      case 'message': {
        if (/Coup critique/.test(e.text)) {
          this.tags.push('critique');
          break;
        }
        if (/super efficace|pas très efficace/.test(e.text)) break; // shown as a tag on the damage line
        const cen = /Censuré : (.+?) est bloquée (\d+) tour/.exec(e.text);
        if (cen && cen[1] && e.text.startsWith(this.nameOf('player'))) this.censor = { move: cen[1], turns: Number(cen[2]), fresh: true };
        const drop = /laisse tomber : (.+?) !/.exec(e.text);
        if (drop) this.summary.loot.push(`Butin : ${drop[1] ?? ''}`);
        else if (/crédits/i.test(e.text) && !/Amende/i.test(e.text)) this.summary.loot.push(e.text.replace(/\.$/, ''));
        const aiact = /cookie|Moratoire|Amende/i.test(e.text);
        await this.chat.system(e.text, aiact ? { tag: '[AIACT]', tone: 'aiact' } : {});
        await this.pacer.wait(240);
        break;
      }
      case 'move_used': {
        if (e.side === 'foe') {
          this.pill.set('think', `${this.nameOf('foe')} réfléchit`);
          await this.pacer.wait(380);
        }
        this.pill.set('busy', 'Résolution du tour');
        const mv = db.hasMove(e.moveId) ? db.move(e.moveId) : undefined;
        const chip = mv ? h('span.bt-chip.is-type', { dataset: { type: mv.type } }, mv.name) : null;
        const lunge = this.cards[e.side].lunge();
        await this.chat.bubble(e.side, this.nameOf(e.side), 'utilise', chip);
        await lunge;
        this.moveFx = { aura: false, arrows: false };
        if (mv) await this.playMoveFx(e.side, mv.type, mv.category, events, i);
        await this.pacer.wait(120);
        break;
      }
      case 'damage': {
        const tokens = e.amount * TOKEN_SCALE;
        const critical = this.tags.includes('critique');
        const line = this.chat.diff(this.nameOf(e.side), `−${fmtInt(tokens)} tokens`, 'bad');
        if (e.effectiveness === 0) this.chat.tag(line, 'sans effet', 'bad');
        else if (e.effectiveness > 1) this.chat.tag(line, 'super efficace', 'good');
        else if (e.effectiveness < 1) this.chat.tag(line, 'pas très efficace', 'bad');
        for (const t of this.tags.splice(0)) this.chat.tag(line, t, 'gold');
        if (critical) this.chat.mark(line, 'crit');
        else if (e.effectiveness > 1) this.chat.mark(line, 'super');
        void this.fx.impact(e.side, e.cause ? 1 : e.effectiveness, critical);
        audio.sfx(critical ? 'crit' : e.effectiveness === 0 ? 'miss' : e.effectiveness > 1 ? 'hit_super' : e.effectiveness < 1 || e.cause ? 'hit_weak' : 'hit');
        this.stripHp(e.side, e.hp);
        await this.cards[e.side].hit(e.hp, e.effectiveness);
        await this.pacer.wait(160);
        break;
      }
      case 'heal': {
        this.chat.diff(this.nameOf(e.side), `+${fmtInt(e.amount * TOKEN_SCALE)} tokens`, 'good');
        audio.sfx('heal');
        this.stripHp(e.side, e.hp);
        await this.cards[e.side].heal(e.hp);
        await this.pacer.wait(160);
        break;
      }
      case 'status':
        this.cards[e.side].setStatus(e.status);
        if (e.side === 'player' && !e.status) this.censor = null;
        this.stripHp(e.side, undefined);
        if (e.status) audio.sfx('status');
        if (e.status && !this.moveFx.aura) void this.fx.auraOn(e.side, undefined, 'var(--yellow)');
        if (e.status) this.chat.note(`${this.nameOf(e.side)} : ${STATUS_LABEL[e.status]}`, 'plain');
        break;
      case 'stat':
        audio.sfx(e.stages > 0 ? 'buff' : 'debuff');
        this.cards[e.side].setStage(e.stat, e.total);
        if (!this.moveFx.arrows) void this.fx.arrowsOn(e.side, e.stages < 0);
        this.cards[e.side].pulse('is-shake');
        break;
      case 'faint': {
        this.onField[e.side] = false;
        this.cards[e.side].setStatus(null);
        audio.sfx('faint');
        const gone = this.shown[e.side];
        if (gone && e.side === 'foe') {
          this.koFoe.add(gone.uid);
          this.cards.foe.strip.setFoeState(this.engine.foe, null, this.koFoe);
        } else if (gone) this.cards.player.strip.update(gone.uid, 0, null, false);
        await this.cards[e.side].faint();
        this.chat.note(`${this.nameOf(e.side)} : connexion perdue.`, 'plain', 'ko');
        break;
      }
      case 'switch_in': {
        const p = (e.side === 'player' ? this.engine.player : this.engine.foe)[e.index];
        if (!p) break;
        if (this.onField[e.side]) await this.cards[e.side].leave();
        await this.enterSide(e.side, p, this.hpBefore(events, i, e.side, p));
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
        await this.cards.player.leave();
        break;
      case 'end':
        this.endOutcome = e.outcome;
        break;
    }
  }

  /** Looks ahead in the batch to size the animation (miss, crit, super effective) before the damage lands. */
  private async playMoveFx(side: BattleSide, type: TypeId, category: MoveCategory, events: BattleEvent[], i: number): Promise<void> {
    let miss = false;
    let crit = false;
    let eff = 1;
    let to: BattleSide = side === 'player' ? 'foe' : 'player';
    for (let k = i + 1; k < events.length; k++) {
      const n = events[k];
      if (!n || n.kind === 'move_used' || n.kind === 'switch_in') break;
      if (n.kind === 'message' && /rate sa cible/.test(n.text)) miss = true;
      else if (n.kind === 'message' && /Coup critique/.test(n.text)) crit = true;
      else if (n.kind === 'damage' && !n.cause) {
        eff = n.effectiveness;
        to = n.side;
        break;
      } else if (n.kind === 'damage') {
        if (n.cause === 'self' && n.side === side) to = side;
        break;
      }
    }
    if (category === 'heal' || category === 'shield' || category === 'buff') to = side;
    else if (category === 'status' || category === 'debuff') to = side === 'player' ? 'foe' : 'player';
    if (category === 'status') this.moveFx.aura = true;
    if (category === 'buff' || category === 'debuff') this.moveFx.arrows = true;
    await this.fx.move({ from: side, to, type, category, eff, crit, miss });
  }

  private async onXp(e: Extract<BattleEvent, { kind: 'xp' }>): Promise<void> {
    const p = this.engine.player.find((x) => x.uid === e.uid);
    if (!p) return;
    const ups = e.events.filter((x) => x.kind === 'levelup').length;
    audio.sfx('xp');
    const lv0 = p.level - ups;
    const prev = this.summary.xp.get(p.uid);
    this.summary.xp.set(p.uid, { name: displayName(p), art: pokaiSvg(p.form), amount: (prev?.amount ?? 0) + e.amount, from: prev?.from ?? lv0, to: p.level });
    const ratio = (lv: number, xp: number): number => {
      const lo = xpForLevel(lv);
      const hi = xpForLevel(lv + 1);
      return hi > lo ? Math.max(0, Math.min(1, (xp - lo) / (hi - lo))) : 1;
    };
    const fill = h('i', { style: { width: `${Math.round(ratio(lv0, p.xp - e.amount) * 100)}%` } });
    this.chat.block(h('div.bt-xp', null, h('span', null, `fine-tuning… ${displayName(p)}`), h('div.bt-meter', null, fill), h('b', null, `+${fmtInt(e.amount)} XP`)));
    void fill.offsetWidth;
    fill.style.width = `${Math.round((ups > 0 ? 1 : ratio(p.level, p.xp)) * 100)}%`;
    await this.pacer.wait(560);

    const active = this.shown.player?.uid === p.uid && this.onField.player;
    if (ups > 0) {
      const before = computeStats(db.form(p.form), lv0, p.ivs);
      const after = computeStats(db.form(p.form), p.level, p.ivs);
      const diffs = STAT_ORDER.filter((k) => after[k] > before[k]).map((k) => h('span.is-up', null, `+${after[k] - before[k]} ${STAT_LABEL[k]}`));
      audio.sfx('level_up');
      const lvl = this.chat.block(h('div.bt-lvl', { dataset: { hl: 'levelup' } }, h('b', null, icon('trophy', 'bt-hl-ico'), `${displayName(p)} : Nv. ${lv0} → Nv. ${p.level}`), ...diffs));
      void lvl;
      if (active) {
        this.cards.player.setLevel(p.level);
        void this.cards.player.heal(p.context);
      }
      await this.pacer.wait(380);
    }
    if (active) this.cards.player.setXp(p);
    for (const ev of e.events) {
      if (ev.kind === 'learn' || ev.kind === 'learn_offer') {
        if (ev.kind === 'learn_offer') {
          const mv = db.hasMove(ev.move) ? db.move(ev.move).name : ev.move;
          await this.chat.system(`${displayName(p)} veut apprendre ${mv}, mais il n'y a plus de place…`, { tag: '[Tech]', tone: 'plain' });
        }
        for (const o of await resolveLearnEvents(p, [ev])) {
          await this.chat.system(learnLine(p, o), { tag: '[Tech]', tone: 'plain' });
        }
        await this.pacer.wait(200);
      } else if (ev.kind === 'evolve_ready') {
        this.evolveReady.add(p.uid);
        await this.chat.system(`Une mise à jour est disponible pour ${displayName(p)} !`, { tag: '[Hub]', tone: 'gold' });
      }
    }
  }

  // ---------------------------------------------------------------- menus

  private async chooseAction(setup: FightSetup): Promise<PlayerAction> {
    const me = this.engine.active('player');
    const foe = this.engine.active('foe');
    const canFlee = setup.kind === 'wild' && setup.canFlee;
    this.bar.setMoves(me, canFlee, { name: displayName(foe), types: this.engine.typesOf('foe') }, this.censor);
    this.bar.setActionDisabled('flee', canFlee ? null : 'Impossible de fuir ce combat !');
    this.bar.setActionDisabled('onboard', setup.kind === 'trainer' ? "On ne peut pas onboarder le PokAI d'un dresseur !" : foe.sealed ? 'Ce PokAI est sous scellés.' : null);
    for (;;) {
      this.locked = false;
      this.pill.set('you', 'À toi de prompter', this.engine.state.turn);
      this.screen.hints([['left', 'Choisir'], ['confirm', 'Envoyer le prompt'], ['down', 'Actions'], ['back', 'Techniques']]);
      const c = await this.bar.next();
      this.lock();
      if (c.kind === 'move') return { kind: 'move', index: c.index };
      if (c.kind === 'onboard') return { kind: 'onboard' };
      if (c.kind === 'flee') return { kind: 'flee' };
      if (c.kind === 'party') {
        const idx = await this.pickMember('Équipe', false);
        if (idx !== null) return { kind: 'switch', index: idx };
      } else if (c.kind === 'bag') {
        const a = await this.bagMenu();
        if (a) return a;
      }
    }
  }

  private memberRows(): SheetRow[] {
    return this.engine.player.map((p, i) => {
      const max = maxContext(p);
      return {
        title: displayName(p),
        sub: `Nv. ${p.level} · ${fmtTokens(Math.max(0, p.context))} / ${fmtTokens(max)} tokens${p.status ? ` · ${STATUS_LABEL[p.status]}` : ''}`,
        right: p.context <= 0 ? 'hors service' : i === this.engine.state.playerActive ? 'en jeu' : '',
        art: pokaiSvg(p.form),
        meter: max > 0 ? Math.max(0, p.context) / max : 0,
      };
    });
  }

  private async pickMember(title: string, forced: boolean, validate?: (p: PokaiInstance, i: number) => string | null): Promise<number | null> {
    const engine = this.engine;
    const check =
      validate ??
      ((p: PokaiInstance, i: number): string | null => {
        if (p.context <= 0) return 'Ce PokAI est hors service.';
        if (i === engine.state.playerActive) return 'Ce PokAI est déjà en jeu.';
        return null;
      });
    const i = await pickSheet(this.screen.root, {
      title,
      rows: this.memberRows(),
      forced,
      index: forced ? this.firstHealthy() : engine.state.playerActive,
      validate: (k) => {
        const p = engine.player[k];
        return p ? check(p, k) : 'Choix invalide.';
      },
    });
    return i < 0 ? null : i;
  }

  private async bagMenu(): Promise<PlayerAction | null> {
    const usable = Object.entries(game.state.bag)
      .filter(([id, n]) => n > 0 && db.hasItem(id) && ['heal', 'status_heal'].includes(db.item(id).kind))
      .map(([id, n]) => ({ id, n }));
    if (usable.length === 0) {
      await this.chat.system('Ton sac ne contient aucun soin.');
      return null;
    }
    const i = await pickSheet(this.screen.root, {
      title: 'Sac',
      rows: usable.map((u) => ({ title: db.item(u.id).name, sub: db.item(u.id).description, right: `×${u.n}` })),
    });
    const picked = usable[i];
    if (i < 0 || !picked) return null;
    const target = await this.pickMember(`${db.item(picked.id).name} sur…`, false, (p) => (canUseItem(picked.id, p) ? null : "Ça n'aurait aucun effet."));
    const p = target === null ? undefined : this.engine.player[target];
    if (!p) return null;
    return { kind: 'item', itemId: picked.id, targetUid: p.uid };
  }

  // ---------------------------------------------------------------- onboarding

  /** Returns a fight result when the battle ended, null to go back to the prompt bar. */
  private async onboardFlow(): Promise<FightResult | null> {
    const keys = Object.entries(game.state.bag)
      .filter(([id, n]) => n > 0 && db.hasItem(id) && db.item(id).kind === 'api_key')
      .map(([id, n]) => ({ id, n }));
    if (keys.length === 0) {
      await this.chat.system("Tu n'as pas de Clé API. Le Store en vend.");
      return null;
    }
    const i = await pickSheet(this.screen.root, {
      title: 'Choisir une Clé API',
      rows: keys.map((k) => ({ title: db.item(k.id).name, sub: db.item(k.id).description, right: `×${k.n}` })),
      footer: 'Plus la clé est haut de gamme, plus tu as de cartes et d’indices.',
    });
    const key = keys[i];
    if (i < 0 || !key) return null;
    const foe = this.engine.active('foe');
    game.removeItem(key.id);
    this.lock();
    const res = await runOnboarding(foe, key.id);
    this.lock();
    this.screen.hints([]);

    if (res.success) {
      game.addPokai(foe);
      this.summary.captured.push({ name: displayName(foe), art: pokaiSvg(foe.form) });
      const reported = api.reportCatch(foe.form).catch(() => null);
      await this.play(this.engine.resolveOnboarding('success'));
      const first = await Promise.race([reported, sleep(400).then(() => null)]);
      if (first?.first) await this.chat.system(`Tu es le premier joueur au monde à onboarder ${displayName(foe)} !`, { tag: '[Neurodex]', tone: 'gold' });
      return { outcome: 'onboarded', pokai: foe, alert: res.aiactAlert === true };
    }
    if (res.fled) {
      await this.play(this.engine.resolveOnboarding('fled'));
      this.cards.foe.glitch();
      await this.cards.foe.leave();
      return { outcome: 'fled' };
    }
    game.addItem(key.id);
    await this.chat.system("Connexion fermée. Ta clé API t'est restituée.");
    return null;
  }

  // ---------------------------------------------------------------- rewards, evolutions

  private async trainerRewards(trainerId: string): Promise<void> {
    const t = db.trainer(trainerId);
    this.lock();
    if (t.reward > 0) {
      game.addCredits(t.reward);
      this.summary.credits += t.reward;
      await this.chat.system(`${t.name} te verse ${fmtInt(t.reward)} crédits GPU.`, { tag: '[Gain]', tone: 'gold' });
    }
    if (t.badge) {
      game.addBadge(t.badge);
      this.summary.badges.push(BADGE_NAME(t.badge));
      audio.sfx('badge');
      await this.chat.system(`Badge obtenu : ${BADGE_NAME(t.badge)} !`, { tag: '[Badge]', tone: 'gold' });
    }
    await this.pacer.wait(500);
  }

  private async runEvolutions(): Promise<void> {
    for (const uid of this.evolveReady) {
      const p = game.findPokai(uid);
      if (!p) continue;
      const options = pendingEvolution(p, game.state.vibeurClass);
      if (options.length === 0) continue;
      await ui.evolution(uid, options);
    }
    this.evolveReady.clear();
  }
}

export function openDuel(req: BattleRequest): Promise<BattleOutcome> {
  return new Duel(req).run();
}
