// The battle stage: backdrop, platforms, sprites, info cards and the per-event animations.
// Pure presentation: BattleScene tells it what happened, it animates.
import Phaser from 'phaser';
import { C, GAME_WIDTH, TEXT, hex } from './theme';
import { drawArena, drawCables, platform } from './backdrops';
import { BattleCard } from './pokai-card';
import { blink, flashWhite, pokaiTex, resolveTex, tweenP, wait } from './gfx';
import { popText, shakeX } from './fx';
import { STAT_LABEL } from './labels';
import { txt } from './text';
import type { StatusId, Stats } from '../data/types';
import type { PokaiInstance } from '../state/types';
import { maxContext } from '../systems/pokai';
import type { BattleSide } from '../systems/battle';

export const STAGE_H = 118;
const FOE_POS = { x: 244, y: 46 };
const PLAYER_POS = { x: 72, y: 84 };

export class BattleView {
  readonly foeCard: BattleCard;
  readonly playerCard: BattleCard;
  private readonly bg: Phaser.GameObjects.Graphics;
  private readonly plat: Phaser.GameObjects.Graphics;
  private foeSprite: Phaser.GameObjects.Image;
  private playerSprite: Phaser.GameObjects.Image;
  private trainerSprite?: Phaser.GameObjects.Image;
  private foeLabel?: Phaser.GameObjects.Text;

  constructor(
    private readonly scene: Phaser.Scene,
    kind: 'wild' | 'trainer',
    aiact: boolean,
  ) {
    this.bg = kind === 'wild' ? drawCables(scene, STAGE_H) : drawArena(scene, STAGE_H, aiact);
    this.plat = scene.add.graphics();
    platform(this.plat, FOE_POS.x, FOE_POS.y + 32, 44, 7, kind === 'wild' ? C.leaf : C.dusk, C.ink);
    platform(this.plat, PLAYER_POS.x, PLAYER_POS.y + 32, 52, 8, kind === 'wild' ? C.leaf : C.dusk, C.ink);
    const empty = resolveTex(scene, [], 32, 32);
    this.foeSprite = scene.add.image(FOE_POS.x, FOE_POS.y, empty).setScale(2).setVisible(false);
    this.playerSprite = scene.add.image(PLAYER_POS.x, PLAYER_POS.y, empty).setScale(2).setVisible(false);
    this.foeCard = new BattleCard(scene, 4, 4, 124, false).setVisible(false);
    this.playerCard = new BattleCard(scene, 172, 72, 144, true).setVisible(false);
  }

  private sprite(side: BattleSide): Phaser.GameObjects.Image {
    return side === 'foe' ? this.foeSprite : this.playerSprite;
  }

  private home(side: BattleSide): { x: number; y: number } {
    return side === 'foe' ? FOE_POS : PLAYER_POS;
  }

  private card(side: BattleSide): BattleCard {
    return side === 'foe' ? this.foeCard : this.playerCard;
  }

  /** Marks a missing-art sprite with its form id so the placeholder is not anonymous. */
  private labelIfMissing(side: BattleSide, p: PokaiInstance, key: string): void {
    if (side !== 'foe') return;
    this.foeLabel?.destroy();
    this.foeLabel = undefined;
    if (key.startsWith('ph:') || key === 'pokai:unknown') {
      this.foeLabel = txt(this.scene, FOE_POS.x, FOE_POS.y + 20, p.form, { ...TEXT.log, color: C.fog }).setOrigin(0.5, 0);
    }
  }

  setSprite(side: BattleSide, p: PokaiInstance): void {
    const key = pokaiTex(this.scene, p.form, { back: side === 'player', sealed: p.sealed === true });
    this.sprite(side).setTexture(key);
    this.labelIfMissing(side, p, key);
  }

  /** Shows a PokAI with a slide-in (≤ 220 ms) and fills its card. */
  async enter(side: BattleSide, p: PokaiInstance): Promise<void> {
    const img = this.sprite(side);
    const home = this.home(side);
    this.setSprite(side, p);
    const card = this.card(side);
    card.setPokai(p, maxContext(p), p.context);
    img.clearTint().setAlpha(1).setVisible(true).setScale(2).setPosition(side === 'foe' ? GAME_WIDTH + 40 : -40, home.y);
    card.setVisible(true).setAlpha(0);
    this.scene.tweens.add({ targets: card, alpha: 1, duration: 200 });
    await tweenP(this.scene, { targets: img, x: home.x, duration: 220, ease: 'Cubic.easeOut' });
  }

  /** Quick pop-in used when the engine swaps in a new battler. */
  async popIn(side: BattleSide, p: PokaiInstance): Promise<void> {
    const img = this.sprite(side);
    const home = this.home(side);
    this.setSprite(side, p);
    this.card(side).setPokai(p, maxContext(p), p.context);
    this.card(side).setAlpha(1);
    img.setPosition(home.x, home.y).setAlpha(1).setVisible(true).setScale(0.5);
    img.setTintFill(hex(C.cream));
    await tweenP(this.scene, { targets: img, scale: 2, duration: 160, ease: 'Back.easeOut' });
    img.clearTint();
  }

  async recall(side: BattleSide): Promise<void> {
    const img = this.sprite(side);
    img.setTintFill(hex(C.cream));
    await tweenP(this.scene, { targets: img, scale: 0.4, alpha: 0, duration: 140 });
    img.setVisible(false).clearTint();
  }

  /** Trainer portrait shown where the foe will appear. */
  async showTrainer(portraitKey: string): Promise<void> {
    const key = resolveTex(this.scene, [portraitKey], 32, 32);
    this.trainerSprite = this.scene.add.image(GAME_WIDTH + 40, FOE_POS.y, key).setScale(2);
    await tweenP(this.scene, { targets: this.trainerSprite, x: FOE_POS.x, duration: 220, ease: 'Cubic.easeOut' });
  }

  async hideTrainer(): Promise<void> {
    const t = this.trainerSprite;
    if (!t) return;
    await tweenP(this.scene, { targets: t, x: GAME_WIDTH + 50, duration: 200, ease: 'Cubic.easeIn' });
    t.destroy();
    this.trainerSprite = undefined;
  }

  async lunge(side: BattleSide): Promise<void> {
    const img = this.sprite(side);
    const home = this.home(side);
    const dx = side === 'player' ? 14 : -14;
    await tweenP(this.scene, { targets: img, x: home.x + dx, duration: 90, ease: 'Quad.easeOut' });
    await tweenP(this.scene, { targets: img, x: home.x, duration: 110, ease: 'Quad.easeIn' });
  }

  async hit(side: BattleSide, amount: number, hp: number, maxHp: number, effectiveness: number): Promise<void> {
    const img = this.sprite(side);
    const card = this.card(side);
    const home = this.home(side);
    if (effectiveness > 1) this.scene.cameras.main.shake(140, 0.006);
    popText(this.scene, home.x, home.y - 28, `-${amount}`, side === 'player' ? C.ember : C.cream);
    const flash = effectiveness === 0 ? Promise.resolve() : flashWhite(this.scene, img, 2, 45);
    await Promise.all([flash, shakeX(this.scene, img, effectiveness > 1 ? 3 : 2, 6, 28), card.setHp(hp, maxHp)]);
  }

  async heal(side: BattleSide, amount: number, hp: number, maxHp: number): Promise<void> {
    const img = this.sprite(side);
    const home = this.home(side);
    popText(this.scene, home.x, home.y - 28, `+${amount}`, C.hp);
    img.setTint(hex(C.hp));
    await this.card(side).setHp(hp, maxHp);
    img.clearTint();
  }

  setStatus(side: BattleSide, s: StatusId | null): void {
    this.card(side).setStatus(s);
  }

  statChange(side: BattleSide, stat: keyof Stats, stages: number): void {
    const home = this.home(side);
    const sign = stages > 0 ? '+' : '-';
    popText(this.scene, home.x, home.y - 36, `${STAT_LABEL[stat]} ${sign}${Math.abs(stages)}`, stages > 0 ? C.gold : C.rose);
  }

  async faint(side: BattleSide): Promise<void> {
    const img = this.sprite(side);
    const home = this.home(side);
    await blink(this.scene, img, 2, 40);
    await tweenP(this.scene, { targets: img, y: home.y + 18, alpha: 0, duration: 240, ease: 'Quad.easeIn' });
    img.setVisible(false).setY(home.y);
    this.card(side).setAlpha(0.4);
    await wait(this.scene, 40);
  }

  /** Foe leaves the screen (successful onboarding or 429). */
  async leave(side: BattleSide, glitch: boolean): Promise<void> {
    const img = this.sprite(side);
    if (glitch) await blink(this.scene, img, 4, 40);
    await tweenP(this.scene, { targets: img, x: side === 'foe' ? GAME_WIDTH + 50 : -50, duration: 220, ease: 'Cubic.easeIn' });
    img.setVisible(false);
  }

  /** Card of the foe/player is visible again after a faint → switch. */
  resetCard(side: BattleSide): void {
    this.card(side).setAlpha(1);
  }

  destroy(): void {
    [this.bg, this.plat, this.foeSprite, this.playerSprite, this.foeCard, this.playerCard, this.trainerSprite, this.foeLabel].forEach((o) => o?.destroy());
  }
}
