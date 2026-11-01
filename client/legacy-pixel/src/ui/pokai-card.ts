// Battle info card: name, level, type badges, status, HP bar (+ numbers and XP for the player).
import Phaser from 'phaser';
import { C, TEXT } from './theme';
import { Panel } from './panel';
import { HpBar, XpBar } from './bars';
import { StatusBadge, typeBadges } from './badges';
import { txt } from './text';
import { db } from '../data/db';
import type { StatusId } from '../data/types';
import type { PokaiInstance } from '../state/types';
import { displayName } from '../systems/pokai';
import { xpForLevel } from '../systems/stats';

export class BattleCard extends Phaser.GameObjects.Container {
  override readonly w: number;
  readonly h: number;
  private readonly isPlayer: boolean;
  private readonly nameT: Phaser.GameObjects.Text;
  private readonly lvlT: Phaser.GameObjects.Text;
  private readonly hpT?: Phaser.GameObjects.Text;
  private readonly hpBar: HpBar;
  private readonly xpBar?: XpBar;
  private readonly status: StatusBadge;
  private types?: Phaser.GameObjects.Container;
  hp = 0;
  maxHp = 1;

  constructor(scene: Phaser.Scene, x: number, y: number, w: number, isPlayer: boolean) {
    super(scene, Math.round(x), Math.round(y));
    this.isPlayer = isPlayer;
    this.w = w;
    this.h = isPlayer ? 44 : 34;
    this.add(new Panel(scene, 0, 0, this.w, this.h, { style: 'night' }));
    this.nameT = txt(scene, 5, 2, '', { ...TEXT.small, color: C.cream });
    this.lvlT = txt(scene, w - 5, 3, '', { ...TEXT.log, color: C.gold }).setOrigin(1, 0);
    this.add([this.nameT, this.lvlT]);
    this.add(txt(scene, 5, 24, 'CTX', { ...TEXT.log, color: C.fog }));
    this.hpBar = new HpBar(scene, 22, 24, w - 28, 3);
    this.add(this.hpBar);
    this.status = new StatusBadge(scene, w - 5 - 18, 13);
    this.add(this.status);
    if (isPlayer) {
      this.hpT = txt(scene, w - 5, 30, '', { ...TEXT.log, color: C.cream }).setOrigin(1, 0);
      this.xpBar = new XpBar(scene, 5, this.h - 5, w - 12);
      this.add([this.hpT, this.xpBar]);
      this.add(txt(scene, 5, 30, 'XP', { ...TEXT.log, color: C.sky }));
    }
    scene.add.existing(this);
  }

  /** Static fill from a PokAI (no animation). hp overrides p.context (events arrive before the UI). */
  setPokai(p: PokaiInstance, maxHp: number, hp: number = p.context): void {
    this.nameT.setText(displayName(p));
    this.lvlT.setText(`Nv.${p.level}`);
    this.types?.destroy();
    const sprite = db.form(p.form);
    const row = typeBadges(this.scene, 5, 13, sprite.types);
    this.add(row);
    this.types = row;
    this.maxHp = Math.max(1, maxHp);
    this.hp = hp;
    this.hpBar.setRatio(hp / this.maxHp);
    this.hpT?.setText(`${Math.max(0, Math.round(hp))}/${this.maxHp}`);
    this.status.set(p.status, false);
    if (this.xpBar) this.xpBar.setRatio(this.xpRatio(p.level, p.xp));
  }

  xpRatio(level: number, xp: number): number {
    const lo = xpForLevel(level);
    const hi = xpForLevel(level + 1);
    return hi > lo ? Math.max(0, Math.min(1, (xp - lo) / (hi - lo))) : 0;
  }

  async setHp(hp: number, maxHp: number = this.maxHp): Promise<void> {
    this.maxHp = Math.max(1, maxHp);
    this.hp = hp;
    this.hpT?.setText(`${Math.max(0, Math.round(hp))}/${this.maxHp}`);
    await this.hpBar.tweenTo(hp / this.maxHp, 450);
  }

  setLevel(level: number): void {
    this.lvlT.setText(`Nv.${level}`);
  }

  setStatus(s: StatusId | null): void {
    this.status.set(s, true);
  }

  async setXp(ratio: number): Promise<void> {
    if (this.xpBar) await this.xpBar.tweenTo(ratio, 500);
  }

  setXpInstant(ratio: number): void {
    this.xpBar?.setRatio(ratio);
  }

  get player(): boolean {
    return this.isPlayer;
  }
}
