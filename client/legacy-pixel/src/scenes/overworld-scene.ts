import Phaser from 'phaser';
import { SCENES } from './keys';
import type { BattleOutcome, BattleSceneData, SimpleOverlayData } from './contracts';
import { db } from '../data/db';
import { TILE_NAMES, TILE_SIZE, SOLID_TILES } from '../data/tiles';
import type { Direction, MapDef, MapNpc, MapTrigger, MapWarp } from '../data/types';
import { game } from '../state/store';
import { isNightAt, rollEncounter } from '../systems/encounters';
import { createRng, type Rng } from '../systems/rng';
import { Controls, type PadAction } from '../story/controls';
import { evalCondition, interpolate, lastHubMap, setLastHub, trainerDefeatedFlag, triggerFlag } from '../story/conditions';
import { isWalkable, tileAt } from '../story/map-validate';
import { runScript, runTrainerEncounter, ScriptAbort, type WorldHost } from '../story/script-runner';
import { C, FONT_PIXEL, GAME_HEIGHT, GAME_WIDTH, hex, ZOOM } from '../ui/theme';

const STEP_MS = 140;
const DIR_VEC: Record<Direction, [number, number]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const DIR_FRAME: Record<Direction, number> = { down: 0, up: 2, left: 4, right: 6 };
const OPPOSITE: Record<Direction, Direction> = { up: 'down', down: 'up', left: 'right', right: 'left' };

interface NpcRec {
  def: MapNpc;
  sprite: Phaser.GameObjects.Sprite;
  x: number;
  y: number;
}

const FALLBACK_COLORS: Record<string, string> = {
  grass: C.leaf, grass_alt: C.moss, path: '#c9a96e', sand: '#e6d5a1', water: C.sea, water_edge: C.sky, cable: C.moss,
  tree: '#1f4d2b', floor_wood: '#a9774a', floor_lab: C.fog, floor_tile: C.fog, wall: C.dusk, carpet: C.rose,
  exit_mat: C.gold, dock: '#8a6a45', gpu_crate: C.steel, black: C.ink,
};

export class OverworldScene extends Phaser.Scene implements WorldHost {
  private controls!: Controls;
  private map!: MapDef;
  private mapObjs: Phaser.GameObjects.GameObject[] = [];
  private npcs = new Map<string, NpcRec>();
  private player!: Phaser.GameObjects.Sprite;
  private gx = 0;
  private gy = 0;
  private facing: Direction = 'down';
  private moving = false;
  private busy = 0;
  private toggle = false;
  private turnUntil = 0;
  private graceStep = false;
  private rng!: Rng;
  private banner?: Phaser.GameObjects.Container;
  private playAcc = 0;

  constructor() {
    super(SCENES.Overworld);
  }

  create(): void {
    this.mapObjs = [];
    this.npcs = new Map();
    this.moving = false;
    this.busy = 0;
    this.rng = createRng((game.state.rngSeed ^ Date.now()) >>> 0);
    this.controls = new Controls(this);
    this.controls.push((a) => this.onPress(a));
    this.player = this.makeSprite('player');
    this.cameras.main.setBackgroundColor(C.ink);
    const s = game.state;
    this.loadMap(s.map, s.x, s.y, s.facing);
    this.cameras.main.fadeIn(250, 20, 16, 28);
    this.events.on(Phaser.Scenes.Events.RESUME, () => {
      this.controls.clearHeld();
      this.refreshNpcs();
    });
  }

  // ---------- rendering helpers ----------

  private makeSprite(id: string): Phaser.GameObjects.Sprite {
    let key = `char:${id}`;
    if (!this.textures.exists(key)) {
      key = `ph:${id}`;
      if (!this.textures.exists(key)) {
        const ct = this.textures.createCanvas(key, 128, 16);
        if (ct) {
          const ctx = ct.getContext();
          let h = 0;
          for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
          for (let i = 0; i < 8; i++) {
            ctx.fillStyle = `hsl(${h % 360},55%,55%)`;
            ctx.fillRect(i * 16 + 3, 3, 10, 12);
            ctx.fillStyle = '#14101c';
            const ex = [0, 0, 0, 0, -2, -2, 2, 2][i] ?? 0;
            ctx.fillRect(i * 16 + 6 + ex, 6, 2, 2);
            ctx.fillRect(i * 16 + 9 + ex, 6, 2, 2);
            ct.add(i, 0, i * 16, 0, 16, 16);
          }
          ct.refresh();
        }
      }
    }
    return this.add.sprite(0, 0, key, 0).setOrigin(0, 0.5);
  }

  private px(x: number): number {
    return x * TILE_SIZE;
  }
  private py(y: number): number {
    return y * TILE_SIZE + TILE_SIZE / 2;
  }

  private buildTiles(m: MapDef): void {
    const data = m.rows.map((row) => [...row].map((ch) => Math.max(0, TILE_NAMES.indexOf((m.legend[ch] ?? 'black') as (typeof TILE_NAMES)[number]))));
    if (this.textures.exists('tileset')) {
      const tm = this.make.tilemap({ data, tileWidth: TILE_SIZE, tileHeight: TILE_SIZE });
      const ts = tm.addTilesetImage('tileset', 'tileset', TILE_SIZE, TILE_SIZE, 0, 0);
      if (ts) {
        const layer = tm.createLayer(0, ts, 0, 0);
        if (layer) {
          layer.setDepth(0);
          this.mapObjs.push(layer);
          return;
        }
      }
    }
    const g = this.add.graphics().setDepth(0);
    data.forEach((row, y) =>
      row.forEach((idx, x) => {
        const name = TILE_NAMES[idx] ?? 'black';
        const col = FALLBACK_COLORS[name] ?? (SOLID_TILES.has(name) ? C.dusk : C.fog);
        g.fillStyle(hex(col), 1).fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        if (SOLID_TILES.has(name)) g.lineStyle(1, hex(C.ink), 0.5).strokeRect(x * TILE_SIZE + 0.5, y * TILE_SIZE + 0.5, TILE_SIZE - 1, TILE_SIZE - 1);
      }),
    );
    this.mapObjs.push(g);
  }

  private loadMap(mapId: string, x: number, y: number, facing: Direction): void {
    for (const o of this.mapObjs) o.destroy();
    this.mapObjs = [];
    for (const n of this.npcs.values()) n.sprite.destroy();
    this.npcs.clear();
    this.map = db.map(mapId);
    this.buildTiles(this.map);
    this.gx = x;
    this.gy = y;
    this.facing = facing;
    this.moving = false;
    this.graceStep = true;
    this.player.setPosition(this.px(x), this.py(y)).setFrame(DIR_FRAME[facing]);
    this.player.setDepth(10 + y);
    this.refreshNpcs();
    const w = this.map.width * TILE_SIZE;
    const h = this.map.height * TILE_SIZE;
    const bx = w < GAME_WIDTH ? -(GAME_WIDTH - w) / 2 : 0;
    const by = h < GAME_HEIGHT ? -(GAME_HEIGHT - h) / 2 : 0;
    const cam = this.cameras.main;
    cam.setBounds(bx, by, Math.max(w, GAME_WIDTH), Math.max(h, GAME_HEIGHT));
    cam.startFollow(this.player, true, 1, 1, -TILE_SIZE / 2, 0);
    cam.centerOn(this.player.x + TILE_SIZE / 2, this.player.y);
    const s = game.state;
    s.map = mapId;
    s.x = x;
    s.y = y;
    s.facing = facing;
    if (this.map.hub) setLastHub(s.flags, mapId);
    this.showBanner(interpolate(this.map.name, { player: s.playerName }));
  }

  private showBanner(text: string): void {
    this.banner?.destroy();
    const t = this.add.text(0, 0, text, { fontFamily: FONT_PIXEL, fontSize: '10px', color: C.cream, resolution: ZOOM });
    const w = t.width + 16;
    const bg = this.add.rectangle(0, 0, w, 16, hex(C.plum), 0.92).setOrigin(0).setStrokeStyle(1, hex(C.cream));
    t.setPosition(8, 3);
    // Screen-fixed under a centred zoomed camera: shift by the zoom's centring offset.
    const hx = (GAME_WIDTH * (ZOOM - 1)) / 2;
    const hy = (GAME_HEIGHT * (ZOOM - 1)) / 2;
    const c = this.add.container(hx + (GAME_WIDTH - w) / 2, hy + 6, [bg, t]).setScrollFactor(0).setDepth(900);
    this.banner = c;
    this.tweens.add({ targets: c, alpha: 0, delay: 1700, duration: 400, onComplete: () => c.destroy() });
  }

  // ---------- NPCs ----------

  private npcVisible(def: MapNpc): boolean {
    return evalCondition(def.condition, (n) => game.flag(n));
  }

  refreshNpcs(): void {
    for (const def of this.map.npcs) {
      const vis = this.npcVisible(def);
      const rec = this.npcs.get(def.id);
      if (vis && !rec) {
        const sprite = this.makeSprite(def.sprite).setFrame(DIR_FRAME[def.facing]);
        sprite.setPosition(this.px(def.x), this.py(def.y)).setDepth(10 + def.y);
        this.npcs.set(def.id, { def, sprite, x: def.x, y: def.y });
        this.mapObjs.push(sprite);
      } else if (!vis && rec) {
        rec.sprite.destroy();
        this.npcs.delete(def.id);
      }
    }
  }

  private npcAt(x: number, y: number): NpcRec | undefined {
    for (const n of this.npcs.values()) if (n.x === x && n.y === y) return n;
    return undefined;
  }

  private face(rec: NpcRec, d: Direction): void {
    rec.sprite.setFrame(DIR_FRAME[d]);
  }

  async moveNpc(id: string, path: Direction[]): Promise<void> {
    const rec = this.npcs.get(id);
    if (!rec) return;
    for (const d of path) {
      const [dx, dy] = DIR_VEC[d];
      this.face(rec, d);
      rec.x += dx;
      rec.y += dy;
      rec.sprite.setDepth(10 + rec.y);
      await this.tweenTo(rec.sprite, this.px(rec.x), this.py(rec.y), STEP_MS);
    }
  }

  private tweenTo(target: Phaser.GameObjects.Sprite, x: number, y: number, ms: number): Promise<void> {
    return new Promise((resolve) => this.tweens.add({ targets: target, x, y, duration: ms, onComplete: () => resolve() }));
  }

  // ---------- input / movement ----------

  private onPress(a: PadAction): void {
    if (this.busy > 0 || this.moving) return;
    if (a === 'a') void this.interact();
    else if (a === 'b') void this.openMenu();
  }

  override update(_time: number, delta: number): void {
    this.playAcc += delta;
    if (this.playAcc >= 1000) {
      game.state.playTimeSec += Math.floor(this.playAcc / 1000);
      this.playAcc %= 1000;
    }
    if (this.moving || this.busy > 0) return;
    const d = this.controls.heldDirection();
    if (!d) return;
    if (d !== this.facing) {
      this.facing = d;
      this.player.setFrame(DIR_FRAME[d]);
      this.turnUntil = this.time.now + 90;
      return;
    }
    if (this.time.now < this.turnUntil) return;
    this.tryMove(d);
  }

  private blocked(x: number, y: number): boolean {
    return !isWalkable(this.map, x, y) || !!this.npcAt(x, y);
  }

  private tryMove(d: Direction): void {
    const [dx, dy] = DIR_VEC[d];
    const nx = this.gx + dx;
    const ny = this.gy + dy;
    if (this.blocked(nx, ny)) return;
    this.moving = true;
    this.gx = nx;
    this.gy = ny;
    this.toggle = !this.toggle;
    this.player.setFrame(DIR_FRAME[d] + (this.toggle ? 1 : 0)).setDepth(10 + ny);
    this.tweens.add({
      targets: this.player,
      x: this.px(nx),
      y: this.py(ny),
      duration: STEP_MS,
      onComplete: () => {
        this.player.setFrame(DIR_FRAME[d]);
        this.moving = false;
        void this.afterStep();
      },
    });
  }

  /** Run an async world action with player input suspended. */
  private async locked<T>(fn: () => Promise<T>): Promise<T | undefined> {
    this.busy++;
    try {
      return await fn();
    } catch (e) {
      if (e instanceof ScriptAbort) return undefined;
      throw e;
    } finally {
      this.busy--;
      this.controls.clearHeld();
      this.refreshNpcs();
    }
  }

  private async afterStep(): Promise<void> {
    const s = game.state;
    s.x = this.gx;
    s.y = this.gy;
    s.facing = this.facing;
    const grace = this.graceStep;
    this.graceStep = false;
    // triggers
    for (const t of this.map.triggers) {
      if (!this.inTrigger(t) || !evalCondition(t.condition, (n) => game.flag(n))) continue;
      const tf = triggerFlag(this.map.id, t.x, t.y);
      if (t.once && game.flag(tf)) continue;
      const mapBefore = this.map.id;
      await this.locked(async () => {
        await runScript(this, t.script);
        if (t.once) game.setFlag(tf, true);
      });
      if (this.map.id !== mapBefore || this.gx !== s.x || this.gy !== s.y) return;
      break;
    }
    if (await this.checkSight()) return;
    const warp = this.map.warps.find((w) => w.x === this.gx && w.y === this.gy);
    if (warp) {
      await this.locked(() => this.doWarp(warp));
      return;
    }
    if (!grace) await this.checkEncounter();
  }

  private inTrigger(t: MapTrigger): boolean {
    return this.gx >= t.x && this.gx < t.x + (t.w ?? 1) && this.gy >= t.y && this.gy < t.y + (t.h ?? 1);
  }

  private async doWarp(w: MapWarp): Promise<void> {
    await this.warpTo(w.to, w.toX, w.toY, w.facing ?? this.facing);
  }

  async warpTo(mapId: string, x: number, y: number, facing: Direction = this.facing): Promise<void> {
    const cam = this.cameras.main;
    await new Promise<void>((resolve) => {
      cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => resolve());
      cam.fadeOut(180, 20, 16, 28);
    });
    this.loadMap(mapId, x, y, facing);
    game.save();
    cam.fadeIn(180, 20, 16, 28);
    // trainers may already see the arriving player
    await this.checkSight();
  }

  async handleWipe(): Promise<void> {
    game.healParty();
    const hubMap = lastHubMap(game.state.flags);
    const m = db.hasMap(hubMap) ? db.map(hubMap) : db.map('player_house');
    const hub = m.hub ?? { x: 4, y: 5 };
    await this.warpTo(m.id, hub.x, hub.y, 'down');
    this.showBanner('Tes PokAI ont été redémarrés au Hub.');
  }

  // ---------- trainers ----------

  private async checkSight(): Promise<boolean> {
    for (const rec of this.npcs.values()) {
      const t = rec.def.trainer;
      if (!t || game.flag(trainerDefeatedFlag(t))) continue;
      const facing = rec.def.facing;
      const [dx, dy] = DIR_VEC[facing];
      const range = rec.def.sightRange ?? 4;
      for (let d = 1; d <= range; d++) {
        const x = rec.x + dx * d;
        const y = rec.y + dy * d;
        if (x === this.gx && y === this.gy) {
          await this.locked(() => this.sightEncounter(rec, d - 1));
          return true;
        }
        if (!isWalkable(this.map, x, y) || this.npcAt(x, y)) break;
      }
    }
    return false;
  }

  private async sightEncounter(rec: NpcRec, gap: number): Promise<void> {
    const mark = this.add.text(rec.sprite.x + 5, rec.sprite.y - 20, '!', { fontFamily: FONT_PIXEL, fontSize: '12px', color: C.ember, resolution: ZOOM }).setDepth(800);
    await new Promise<void>((r) => this.time.delayedCall(550, () => r()));
    mark.destroy();
    await this.moveNpc(rec.def.id, Array<Direction>(gap).fill(rec.def.facing));
    this.facing = OPPOSITE[rec.def.facing];
    this.player.setFrame(DIR_FRAME[this.facing]);
    await runTrainerEncounter(this, rec.def.trainer ?? '');
  }

  // ---------- interaction ----------

  private async interact(): Promise<void> {
    const [dx, dy] = DIR_VEC[this.facing];
    const tx = this.gx + dx;
    const ty = this.gy + dy;
    let rec = this.npcAt(tx, ty);
    if (!rec && tileAt(this.map, tx, ty) === 'counter') rec = this.npcAt(tx + dx, ty + dy);
    if (rec) {
      const target = rec;
      await this.locked(async () => {
        if (Math.abs(target.x - this.gx) + Math.abs(target.y - this.gy) === 1) this.face(target, OPPOSITE[this.facing]);
        const t = target.def.trainer;
        if (t && !game.flag(trainerDefeatedFlag(t))) await runTrainerEncounter(this, t);
        else await runScript(this, target.def.dialogue);
      });
      return;
    }
    const tile = tileAt(this.map, tx, ty);
    if (tile === 'sign' || tile === 'poster_aiact') {
      const id = `sign_${this.map.id}_${tx}_${ty}`;
      if (db.hasScript(id)) await this.locked(() => runScript(this, id));
    }
  }

  private async openMenu(): Promise<void> {
    await this.locked(
      () =>
        new Promise<void>((resolve) => {
          this.scene.pause();
          const data: SimpleOverlayData = {
            onDone: () => {
              if (this.scene.isPaused()) this.scene.resume();
              resolve();
            },
          };
          this.scene.launch(SCENES.Menu, data);
          this.scene.bringToTop(SCENES.Menu);
        }),
    );
  }

  // ---------- wild encounters ----------

  private async checkEncounter(): Promise<void> {
    const tile = tileAt(this.map, this.gx, this.gy);
    if (tile !== 'cable') return;
    if (!game.state.party.some((p) => p.context > 0)) return;
    const enc = rollEncounter(this.map, isNightAt(), this.rng);
    if (!enc) return;
    await this.locked(async () => {
      this.cameras.main.flash(250, 242, 234, 216);
      await new Promise<void>((r) => this.time.delayedCall(300, () => r()));
      game.markSeen(enc.form);
      const result = await new Promise<BattleOutcome>((resolve) => {
        this.scene.pause();
        const data: BattleSceneData = {
          kind: 'wild',
          wild: enc,
          canFlee: true,
          onDone: (r) => {
            if (this.scene.isPaused()) this.scene.resume();
            resolve(r);
          },
        };
        this.scene.launch(SCENES.Battle, data);
        this.scene.bringToTop(SCENES.Battle);
      });
      if (result.kind === 'lost') await this.handleWipe();
      else if (result.kind === 'onboarded') {
        const p = result.pokai;
        const known = [...game.state.party, ...game.state.repo].some((q) => q.uid === p.uid);
        if (!known) {
          p.caughtAt = this.map.id;
          game.addPokai(p);
        }
        game.markCaught(p.form);
      }
    });
  }
}
