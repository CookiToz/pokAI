import Phaser from 'phaser';
import { audio, type TrackName } from '../audio/audio';
import { db } from '../data/db';
import { ENCOUNTER_TILES, LANDMARK_FOOTPRINT, SOLID_TILES, type TileName } from '../data/tiles';
import type { Direction, MapDef, MapNpc, MapTrigger, MapWarp } from '../data/types';
import { input, type Action } from '../input/input';
import { evalCondition, interpolate, lastHubMap, setLastHub, trainerDefeatedFlag, triggerFlag } from '../story/conditions';
import { runScript, runTrainerEncounter } from '../story/script-runner';
import type { WorldPort } from '../story/world-port';
import { game } from '../state/store';
import { isNightAt, rollEncounter } from '../systems/encounters';
import { createRng, type Rng } from '../systems/rng';
import { ui } from '../ui-dom/facade';
import { createMinimap, type Minimap, type MinimapFrame } from '../ui-dom/minimap';
import { charKey } from '../world/art/char-contract';
import { CITY_VARIANTS } from '../world/art';
import { posterBase, thinFamily, wallKeys, wallMask, wantsLow } from '../world/engine/walls';
import { FLAT_TILES, UNDERLAY_TILES, V03_PROP_TILES, V04_AXIS_TILES, V04_PROP_TILES, groundVariants } from '../world/art/tiles';
import { RUN_FPS, WALK_FPS, isContactFrame, leanAngle, pickView, walkFrame, type ViewPick } from '../world/engine/anim';
import { laneRuns, packetPos, type LaneRun } from '../world/engine/lanes';
import {
  FEET_HALF, RUN_SPEED, WALK_SPEED, boxBlocked, dirOfVector, len, moveAndSlide, normalize, pickInFront, screenToGrid, stepVelocity, tileOf, type V2,
} from '../world/engine/movement';
import {
  crateAt, enterMapCrates, gateIsOpen, hasPuzzle, idVariant, isSolved, loadCrates, planPush, resetCrates, solvedFlag, storeCrate, syncSwitches, tileSolid,
  type CrateMap, type PuzzleView,
} from '../world/engine/puzzles';
import { signLines, signText, signVariant } from '../world/engine/signposts';
import { approachPath, bfsPath, exitPath, npcGoneFlag, type Grid } from '../world/engine/pathfind';
import { newPatrol, newWander, stepPatrol, stepWander, unitToward, type PatrolState, type WanderCtx, type WanderState } from '../world/engine/npc-ai';
import { coneOutline, inVisionCone, rayClear } from '../world/engine/vision';
import {
  DIR_VEC, GROUND_DEPTH, fallbackMapId, LAYER, dominantGround, depthKey, fitZoom, groundUnder, isNearWall, mapBounds,
  project, roofColourAbove, roofShape, tileNameAt, variantOf,
} from '../world/iso';
import { SPRITE_SCALE, anchorOf, charactersForMap, ensureCharacters, ensurePlayerTextures, packetKeys, worldKey } from '../world/textures';
import { SCENES } from './keys';
import { emitGameEvent } from '../systems/progression';

const INK = 0x1d1a2b;
const FADE = [29, 26, 43] as const;
const ZERO: V2 = { x: 0, y: 0 };
const MAX_DT = 0.05;
const WANDER_SPEED = 1.5;
const PATROL_SPEED = 1.9;
const CHASE_SPEED = 3.4;
/** Actors are discs of this radius for actor-vs-actor collision. */
const ACTOR_R = 0.5;
const CONE_HALF = Math.PI / 6.5;
const DEFAULT_SIGHT = 4;
const MAX_PACKETS = 140;

const PROP_TILES: ReadonlySet<TileName> = new Set<TileName>([
  'tree', 'bush', 'rock', 'flowers', 'sign', 'lamp', 'ledge', 'dock', 'gpu_crate', 'poster_aiact', 'counter', 'table', 'shelf', 'pc', 'server_rack', 'bed', 'plant',
  ...V03_PROP_TILES,
  ...V04_PROP_TILES,
]);
const UNDERLAID: ReadonlySet<TileName> = new Set<TileName>([...UNDERLAY_TILES, ...PROP_TILES, 'blocker']);
const FLAT: ReadonlySet<TileName> = new Set<TileName>([...FLAT_TILES, 'bridge_wood', 'hub_floor', 'arena_floor', 'arena_line']);
/** Puzzle tiles: the ground is drawn by the map, the object itself is a dynamic image (see buildPuzzle). */
const PUZZLE_TILES: ReadonlySet<TileName> = new Set<TileName>(['gate', 'switch_plate', 'crate_push']);
const SIGN_TILES: ReadonlySet<TileName> = new Set<TileName>(['sign', 'poster_aiact', 'signpost', 'vending', 'pc', 'repo_shelf']);
/** Interactables that open a UI through their authored `sign_<map>_<x>_<y>` script (`open: vending` / `open: repo`). */
const USE_TILES: ReadonlySet<TileName> = new Set<TileName>(['vending', 'pc', 'repo_shelf']);
const CAM_TAU = 110;
const warned = new Set<string>();
const SIGN_PREVIEW_RANGE = 2.8;
const PUSH_HOLD = 0.14;
/** Tiles with a gx-axis sprite (:0) and a gy-axis sprite (:1). */
const AXIS_TILES: ReadonlySet<TileName> = new Set<TileName>(['data_lane', 'data_bridge', 'cell_bars', ...V04_AXIS_TILES]);
const ROOF_TILE_COLOUR: Partial<Record<TileName, string>> = {
  roof_red: 'red', roof_blue: 'blue', roof_grey: 'grey', hub_roof: 'hub', store_roof: 'store', bench_roof: 'bench',
};
const PUFF_COLOURS = [0xff48b0, 0x00a095, 0xffd23f, 0xf4efe4];

interface Ctl {
  target: () => V2;
  speed: number;
  stop: number;
  until: number;
  done: () => void;
}

interface Actor {
  sprite: Phaser.GameObjects.Image;
  shadow: Phaser.GameObjects.Image;
  ghost?: Phaser.GameObjects.Image;
  spriteId: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  face: V2;
  moving: boolean;
  running: boolean;
  clock: number;
  frame: number;
  texKey: string;
  flip: boolean;
  phase: number;
  ctl?: Ctl;
}

interface NpcRec {
  def: MapDef['npcs'][number];
  actor: Actor;
  home: V2;
  wander?: WanderState;
  patrol?: PatrolState;
  waypoints?: V2[];
  progressed: boolean;
  /** performance.now()-style time (scene clock) before which this NPC will not spot the player again */
  coolUntil: number;
  cone?: Phaser.GameObjects.Graphics;
  coneSig: string;
}

interface PacketRec {
  img: Phaser.GameObjects.Image;
  run: LaneRun;
  phase: number;
  speed: number;
  dir: 1 | -1;
}

interface Puff {
  img: Phaser.GameObjects.Image;
  life: number;
  max: number;
}

interface CrateRec {
  id: string;
  img: Phaser.GameObjects.Image;
  shadow: Phaser.GameObjects.Image;
  gx: number;
  gy: number;
  moving: boolean;
  tween?: Phaser.Tweens.Tween;
}

interface PlateRec {
  x: number;
  y: number;
  img: Phaser.GameObjects.Image;
  on: boolean;
}

interface GateRec {
  x: number;
  y: number;
  img: Phaser.GameObjects.Image;
  open: boolean;
}

type Target =
  | { kind: 'npc'; rec: NpcRec }
  | { kind: 'sign'; script: string | null; x: number; y: number; tile: TileName }
  | { kind: 'terminal'; script: string | null };

export class OverworldScene extends Phaser.Scene implements WorldPort {
  private map!: MapDef;
  private mapObjs: Phaser.GameObjects.GameObject[] = [];
  private mapTweens: Phaser.Tweens.Tween[] = [];
  private npcs = new Map<string, NpcRec>();
  private player!: Actor;
  private busy = 0;
  private rng!: Rng;
  private aiRng!: Rng;
  private playAcc = 0;
  private hintKey = '';
  private hintAcc = 0;
  private cam = { x: 0, y: 0, init: false };
  /** Scripted camera focus in grid tiles (null = follow the player) and its smoothing time constant (ms). */
  private camFocus: V2 | null = null;
  private camTau = CAM_TAU;
  private camTimer: Phaser.Time.TimerEvent | null = null;
  private cutsceneHeld = false;
  private zoomTiles = 16;
  private unbindInput: (() => void) | null = null;
  private lastTile = { x: -999, y: -999 };
  /** Set on map load: the tile we arrived on may hold a (non-warp) story trigger that must fire once the world is free. */
  private pendingArrival = false;
  private packets: PacketRec[] = [];
  private puffs: Puff[] = [];
  private puffAcc = 0;
  private stepCount = 0;
  private laneTime = 0;
  private charCache = new Map<string, { raw: string | null; flip: boolean }>();
  // v0.4 puzzles / minimap / signposts
  private crates: CrateMap = new Map();
  private crateRecs = new Map<string, CrateRec>();
  private plates: PlateRec[] = [];
  private gates: GateRec[] = [];
  private pzView: PuzzleView = { map: undefined as unknown as MapDef, flags: {}, crates: new Map() };
  private pzTile = { x: -999, y: -999 };
  private pushT = 0;
  private pushCool = 0;
  private minimap: Minimap | null = null;
  private mmAcc = 0;
  private signLabel: Phaser.GameObjects.Text | null = null;
  private signLabelKey = '';
  private onAppearance = (): void => {
    void this.refreshPlayerLook();
  };

  constructor() {
    super(SCENES.Overworld);
  }

  // ---------- lifecycle ----------

  create(): void {
    this.mapObjs = [];
    this.mapTweens = [];
    this.npcs = new Map();
    this.packets = [];
    this.puffs = [];
    this.charCache = new Map();
    this.crates = new Map();
    this.crateRecs = new Map();
    this.plates = [];
    this.gates = [];
    this.signLabel = null;
    this.signLabelKey = '';
    this.busy = 0;
    this.hintKey = '';
    this.cam.init = false;
    this.rng = createRng((game.state.rngSeed ^ Date.now()) >>> 0);
    this.aiRng = createRng((Date.now() * 2654435761) >>> 0);
    this.cameras.main.setBackgroundColor('#1d1a2b');
    this.unbindInput = input.push('world', (a) => this.onAction(a));
    this.scale.on(Phaser.Scale.Events.RESIZE, this.applyZoom, this);
    if (import.meta.env.DEV) Object.assign(window, { __pokaiWorld: this }); // debug handle for the dev driver
    window.addEventListener('pokai:appearance', this.onAppearance);
    this.minimap?.destroy();
    this.minimap = createMinimap();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener('pokai:appearance', this.onAppearance);
      this.minimap?.destroy();
      this.minimap = null;
      this.unbindInput?.();
      this.scale.off(Phaser.Scale.Events.RESIZE, this.applyZoom, this);
    });
    this.player = this.makeActor('player', 0, 0, { x: 0, y: 1 }, true);
    const s = game.state;
    const mapId = db.hasMap(s.map) ? s.map : fallbackMapId();
    this.loadMap(mapId, s.x, s.y, s.facing, true);
    this.minimap?.setVisible(true);
    this.cameras.main.fadeIn(300, ...FADE);
    this.refreshHints(true);
  }

  // ---------- actors ----------

  /** Collision for every actor: terrain, gates (open/closed) and pushable crates. */
  private solid = (tx: number, ty: number): boolean => tileSolid(this.pzView, tx, ty);

  /** Texture for a character: new 3-view/5-frame art first, then the legacy 2-view art, then the player's. */
  private charTex(spriteId: string, pick: ViewPick, frame: number): { raw: string | null; flip: boolean } {
    const ck = `${spriteId}|${pick.view}|${pick.flip ? 1 : 0}|${frame}`;
    const hit = this.charCache.get(ck);
    if (hit) return hit;
    const has = (raw: string): boolean => this.textures.exists(worldKey(raw));
    let out: { raw: string | null; flip: boolean } = { raw: null, flip: pick.flip };
    search: for (const sid of spriteId === 'player' ? ['player'] : [spriteId, 'player']) {
      for (const f of frame > 0 ? [frame, 0] : [0]) {
        const raw = charKey(sid, pick.view, f);
        if (has(raw)) {
          out = { raw, flip: pick.flip };
          break search;
        }
      }
      const legacy = `char:${sid}:${pick.view === 'back' ? 'back' : 'front'}`;
      if (has(legacy)) {
        out = { raw: legacy, flip: pick.view === 'side' ? pick.flip : false };
        break;
      }
    }
    this.charCache.set(ck, out);
    return out;
  }

  private makeActor(spriteId: string, x: number, y: number, face: V2, withGhost = false): Actor {
    const shadow = this.add.image(0, 0, 'w:shadow').setScale(0.42, 0.42).setAlpha(0.1);
    const sprite = this.add.image(0, 0, '__MISSING').setScale(SPRITE_SCALE);
    const actor: Actor = {
      sprite, shadow, spriteId, x, y, vx: 0, vy: 0, face: normalize(face), moving: false, running: false, clock: 0, frame: 0, texKey: '', flip: false,
      phase: Math.random() * 6.28,
    };
    if (withGhost) {
      // faint copy drawn over everything: reveals the player behind trees and walls
      actor.ghost = this.add.image(0, 0, '__MISSING').setScale(SPRITE_SCALE).setAlpha(0.3).setDepth(1e7);
    }
    this.renderActor(actor, 0);
    return actor;
  }

  private destroyActor(a: Actor): void {
    a.sprite.destroy();
    a.shadow.destroy();
    a.ghost?.destroy();
  }

  /** Pick view + frame for the actor's facing and apply the texture. */
  private applyLook(a: Actor): void {
    const pick = pickView(a.face);
    const t = this.charTex(a.spriteId, pick, a.frame);
    const key = t.raw ? worldKey(t.raw) : '__MISSING';
    if (a.texKey !== key) {
      const o = t.raw ? anchorOf(t.raw) : { x: 0.5, y: 0.5 };
      a.sprite.setTexture(key).setOrigin(o.x, o.y);
      a.ghost?.setTexture(key).setOrigin(o.x, o.y);
      a.texKey = key;
    }
    if (a.flip !== t.flip || a.sprite.flipX !== t.flip) {
      a.flip = t.flip;
      a.sprite.setFlipX(t.flip);
      a.ghost?.setFlipX(t.flip);
    }
  }

  private renderActor(a: Actor, time: number): void {
    this.applyLook(a);
    const p = project(a.x, a.y);
    const breathe = a.moving ? 0 : Math.sin(time / 520 + a.phase) * 0.014;
    const maxSpeed = a.running ? RUN_SPEED : WALK_SPEED;
    const lean = a.moving ? leanAngle({ x: a.vx, y: a.vy }, maxSpeed, a.running) : 0;
    const sx = SPRITE_SCALE * (1 - breathe * 0.5);
    const sy = SPRITE_SCALE * (1 + breathe);
    a.sprite.setPosition(p.x, p.y + 2).setScale(sx, sy).setAngle(lean).setDepth(depthKey(a.x, a.y, LAYER.actor));
    a.shadow.setPosition(p.x, p.y + 2).setDepth(depthKey(a.x, a.y, LAYER.shadow));
    if (a.ghost) a.ghost.setPosition(p.x, p.y + 2).setScale(sx, sy).setAngle(lean);
  }

  /** Blocks `self` from stepping into another actor (unless it is moving away from it). */
  private actorBlocked(self: Actor, nx: number, ny: number, ox: number, oy: number): boolean {
    const hit = (o: Actor): boolean => {
      if (o === self) return false;
      const dn = Math.hypot(nx - o.x, ny - o.y);
      return dn < ACTOR_R && dn < Math.hypot(ox - o.x, oy - o.y);
    };
    if (hit(this.player)) return true;
    for (const n of this.npcs.values()) if (hit(n.actor)) return true;
    return false;
  }

  /** One physics step of an actor toward `wish` (unit vector or zero). Returns the distance actually moved. */
  private drive(a: Actor, wish: V2, maxSpeed: number, dt: number, running = false): number {
    const v = stepVelocity({ x: a.vx, y: a.vy }, wish, maxSpeed, dt);
    const res = moveAndSlide({ x: a.x, y: a.y }, { x: v.x * dt, y: v.y * dt }, FEET_HALF, this.solid, (nx, ny, ox, oy) => this.actorBlocked(a, nx, ny, ox, oy));
    if (res.hitX) v.x = 0;
    if (res.hitY) v.y = 0;
    const moved = Math.hypot(res.pos.x - a.x, res.pos.y - a.y);
    a.x = res.pos.x;
    a.y = res.pos.y;
    a.vx = v.x;
    a.vy = v.y;
    const speed = len(v);
    const was = a.moving;
    a.moving = speed > 0.3;
    a.running = running && a.moving;
    if (len(wish) > 0) a.face = wish;
    else if (a.moving) a.face = normalize(v);
    if (a.moving) {
      if (!was) a.clock = 0;
      a.clock += dt * (a.running ? RUN_FPS : WALK_FPS);
    }
    const f = walkFrame(a.clock, a.moving);
    if (f !== a.frame) {
      a.frame = f;
      if (a === this.player && isContactFrame(f)) {
        this.stepCount++;
        emitGameEvent({ kind: 'step' });
        if (a.running || this.stepCount % 2 === 0) audio.sfx('step');
      }
    }
    return moved;
  }

  /** Walk an actor to a (possibly moving) target under script control. Resolves on arrival or timeout. */
  private walkActor(a: Actor, target: () => V2, speed: number, stop: number, timeoutMs: number): Promise<void> {
    return new Promise<void>((resolve) => {
      a.ctl?.done();
      a.ctl = { target, speed, stop, until: this.time.now + timeoutMs, done: resolve };
    });
  }

  private stopCtl(a: Actor): void {
    const c = a.ctl;
    a.ctl = undefined;
    c?.done();
  }

  private faceToward(a: Actor, p: V2): void {
    const v = unitToward({ x: a.x, y: a.y }, p);
    if (v.x !== 0 || v.y !== 0) a.face = v;
  }

  // ---------- map building ----------

  private clearMap(): void {
    for (const t of this.mapTweens) t.stop().remove();
    this.mapTweens = [];
    for (const o of this.mapObjs) o.destroy();
    this.destroyPuzzle();
    this.mapObjs = [];
    this.packets = [];
    for (const p of this.puffs) p.img.destroy();
    this.puffs = [];
    for (const n of this.npcs.values()) this.destroyNpc(n);
    this.npcs.clear();
  }

  private destroyNpc(n: NpcRec): void {
    this.stopCtl(n.actor);
    n.cone?.destroy();
    this.destroyActor(n.actor);
  }

  private hasTex(key: string): boolean {
    return this.textures.exists(worldKey(key));
  }

  /** First candidate key that has a texture, or null. */
  private pickTex(cands: string[]): string | null {
    for (const k of cands) if (this.hasTex(k)) return k;
    return null;
  }

  private addImg(key: string, gx: number, gy: number, depth: number, dx = 0, dy = 0): Phaser.GameObjects.Image | null {
    if (!this.hasTex(key)) return null;
    const p = project(gx, gy);
    const a = anchorOf(key);
    const img = this.add.image(p.x + dx, p.y + dy, worldKey(key)).setOrigin(a.x, a.y).setScale(SPRITE_SCALE).setDepth(depth);
    this.mapObjs.push(img);
    return img;
  }

  private same(map: MapDef, name: TileName, x: number, y: number): boolean {
    return tileNameAt(map, x, y) === name;
  }

  /** 0 = the tile belongs to a run along gx, 1 = along gy (ties: gx). */
  private axisOf(map: MapDef, name: TileName, x: number, y: number): 0 | 1 {
    const h = (this.same(map, name, x - 1, y) ? 1 : 0) + (this.same(map, name, x + 1, y) ? 1 : 0);
    const v = (this.same(map, name, x, y - 1) ? 1 : 0) + (this.same(map, name, x, y + 1) ? 1 : 0);
    return h >= v ? 0 : 1;
  }

  private groundKey(name: TileName, x: number, y: number, map?: MapDef): string | null {
    if (name === 'cable') return this.pickTex([`cable_ground:${variantOf(x, y, 3)}`, 'cable_ground:0']);
    if (map && AXIS_TILES.has(name)) return this.pickTex([`${name}:${this.axisOf(map, name, x, y)}`, `${name}:0`]);
    if (map && name === 'crosswalk') {
      const h = (this.same(map, name, x - 1, y) ? 1 : 0) + (this.same(map, name, x + 1, y) ? 1 : 0);
      const v = (this.same(map, name, x, y - 1) ? 1 : 0) + (this.same(map, name, x, y + 1) ? 1 : 0);
      return this.pickTex([h >= v ? 'crosswalk:0' : 'crosswalk_y:0', 'crosswalk:0']);
    }
    if (map && name === 'asphalt') {
      // centre line of a 3-wide road
      const a = (dx: number, dy: number): boolean => this.same(map, 'asphalt', x + dx, y + dy);
      if (a(-1, 0) && a(1, 0) && a(0, -1) && a(0, 1)) {
        if (!a(0, -2) && !a(0, 2)) return this.pickTex(['asphalt_lane_x:0', 'asphalt:0']);
        if (!a(-2, 0) && !a(2, 0)) return this.pickTex(['asphalt_lane_y:0', 'asphalt:0']);
      }
    }
    const n = CITY_VARIANTS[name] ?? Math.max(1, groundVariants(name));
    const v = variantOf(x, y, n);
    return this.pickTex([`${name}:${v}`, `${name}:0`, name]);
  }

  /** Draw a ground sprite for `name` at (x, y); unknown/missing art falls back to the map's dominant ground. */
  private drawGround(map: MapDef, name: TileName, x: number, y: number, depth = GROUND_DEPTH): void {
    const key = this.groundKey(name, x, y, map) ?? this.groundKey(dominantGround(map), x, y) ?? this.groundKey('grass', x, y);
    if (key) this.addImg(key, x, y, depth);
  }

  /** Slab texture for a thin wall tile (see world/engine/walls.ts), or null when the tile keeps its volumetric / prop art. */
  private thinWallKey(map: MapDef, name: TileName, x: number, y: number): string | null {
    const at = (tx: number, ty: number): TileName | null => tileNameAt(map, tx, ty);
    const family = thinFamily(at, name, x, y);
    if (!family) return null;
    const mask = wallMask(at, x, y);
    const low = wantsLow(family, x, y, map.width, map.height);
    return this.pickTex(wallKeys(family, mask, low, family === 'poster_aiact' ? posterBase(at, x, y) : undefined));
  }

  private blockKey(map: MapDef, name: TileName, x: number, y: number): string | null {
    if (name === 'signpost') return `signpost:${signVariant(signLines(map, x, y), variantOf(x, y, 4))}`;
    if (PROP_TILES.has(name) && !V04_PROP_TILES.has(name)) return `${name}:0`; // v0.4 props pick position variants in blockTex
    const roof = ROOF_TILE_COLOUR[name];
    if (roof) return `roof:${roof}:${roofShape(map, x, y)}`;
    switch (name) {
      case 'wall':
      case 'wall_window':
        return `${name}:${isNearWall(map, x, y) ? 'low' : '0'}`;
      case 'house_wall':
      case 'house_window':
      case 'house_door':
        return `${name}:${roofColourAbove(map, x, y)}`;
      case 'hub_wall':
      case 'hub_door':
        return `${name}:hub`;
      case 'store_wall':
      case 'store_door':
        return `${name}:store`;
      case 'bench_wall':
      case 'bench_door':
        return `${name}:bench`;
      default:
        return null;
    }
  }

  /** Texture for a tall tile: the family-specific key first, then the generic `<name>:<variant>` / `<name>:0`. */
  private blockTex(map: MapDef, name: TileName, x: number, y: number): string | null {
    const special = this.blockKey(map, name, x, y);
    if (AXIS_TILES.has(name)) return this.pickTex([`${name}:${this.axisOf(map, name, x, y)}`, `${name}:0`]);
    const n = CITY_VARIANTS[name] ?? 1;
    return this.pickTex([...(special ? [special] : []), `${name}:${variantOf(x, y, n)}`, `${name}:0`, name]);
  }

  private buildTiles(map: MapDef): void {
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        const raw = tileNameAt(map, x, y);
        if (raw === 'black') continue;
        if (raw === null) {
          // unknown tile char: plain ground
          this.drawGround(map, dominantGround(map), x, y);
          continue;
        }
        const name: TileName = raw;
        if (PUZZLE_TILES.has(name)) {
          this.drawGround(map, groundUnder(map, x, y), x, y);
          continue;
        }
        const thin = this.thinWallKey(map, name, x, y);
        if (thin) {
          // thin wall: floor under the slab (room floor taken from the neighbours), slab on the block layer
          this.drawGround(map, groundUnder(map, x, y), x, y);
          this.addImg(thin, x, y, depthKey(x, y, LAYER.block));
          continue;
        }
        if (FLAT.has(name)) {
          this.drawGround(map, name, x, y);
          if (name === 'water') this.maybeGlint(x, y);
          if (name === 'cable') this.addTuft(x, y, 'cable_tuft');
          if (name === 'data_stream') this.addTuft(x, y, 'stream_tuft');
          continue;
        }
        const footprint = LANDMARK_FOOTPRINT[name];
        if (footprint || name === 'blocker' || UNDERLAID.has(name)) this.drawGround(map, groundUnder(map, x, y), x, y);
        if (name === 'blocker') continue; // part of a landmark footprint: solid, draws nothing
        if (name === 'fence') {
          this.addFence(map, x, y);
          continue;
        }
            const key = this.blockTex(map, name, x, y);
        if (!key) {
          // no art for this tile (yet): solid tiles still get ground below so there is never a hole
          if (!UNDERLAID.has(name) && !footprint) this.drawGround(map, groundUnder(map, x, y), x, y);
          continue;
        }
        if (footprint) {
          // landmark: the sprite sits on the front corner (the anchor tile) and sorts by it
          this.addImg(key, x, y, depthKey(x, y, LAYER.block));
          continue;
        }
        const layer = PROP_TILES.has(name) && name !== 'counter' && name !== 'table' ? LAYER.prop : LAYER.block;
        this.addImg(key, x, y, depthKey(x, y, layer));
      }
    }
  }

  private addFence(map: MapDef, x: number, y: number): void {
    const d = depthKey(x, y, LAYER.prop);
    if (tileNameAt(map, x + 1, y) === 'fence' || tileNameAt(map, x + 1, y) === 'poster_aiact') this.addImg('fence_rail_x:0', x, y, d - 1);
    if (tileNameAt(map, x, y + 1) === 'fence') this.addImg('fence_rail_y:0', x, y, d - 1);
    this.addImg('fence_post:0', x, y, d);
  }

  private addTuft(x: number, y: number, prefix: string): void {
    const v = variantOf(x, y, 3);
    const ox = ((variantOf(x + 3, y + 7, 9) - 4) / 4) * 8;
    const oy = ((variantOf(x + 9, y + 2, 5) - 2) / 2) * 3;
    const img = this.addImg(`${prefix}:${v}`, x, y, depthKey(x, y, LAYER.prop), ox, oy + 6);
    if (!img) return;
    img.setScale(SPRITE_SCALE * 0.88).setAngle((variantOf(x, y + 1, 7) - 3) * 1.5);
    const tw = this.tweens.add({
      targets: img,
      angle: img.angle + (variantOf(x + 1, y, 2) ? 4 : -4),
      duration: 1500 + variantOf(x, y, 9) * 170,
      delay: variantOf(y, x, 12) * 130,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    this.mapTweens.push(tw);
  }

  private maybeGlint(x: number, y: number): void {
    if (variantOf(x, y, 5) !== 0) return;
    const p = project(x, y);
    const g = this.add.image(p.x + (variantOf(y, x, 7) - 3) * 4, p.y + (variantOf(x, x + y, 5) - 2) * 3, 'w:glint').setAlpha(0).setDepth(GROUND_DEPTH + 1).setScale(0.8);
    this.mapObjs.push(g);
    const tw = this.tweens.add({ targets: g, alpha: 0.75, x: g.x + 6, duration: 900 + variantOf(x, y, 6) * 200, delay: variantOf(x + y, y, 9) * 350, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.mapTweens.push(tw);
  }

  // ---------- puzzles (gates, switch plates, pushable crates) ----------

  /** Live puzzle view for the pure helpers (flags always point at the current save). */
  private view(): PuzzleView {
    this.pzView.flags = game.state.flags;
    return this.pzView;
  }

  private puzzleImg(keys: string[], fallback: string, gx: number, gy: number, depth: number): Phaser.GameObjects.Image {
    const k = this.pickTex(keys);
    const key = k ?? fallback;
    const a = anchorOf(key);
    const p = project(gx, gy);
    const img = this.add.image(p.x, p.y, worldKey(key)).setOrigin(a.x, a.y).setScale(k ? SPRITE_SCALE : 1).setDepth(depth);
    this.mapObjs.push(img);
    return img;
  }

  private setPuzzleTex(img: Phaser.GameObjects.Image, keys: string[], fallback: string): void {
    const k = this.pickTex(keys);
    const key = k ?? fallback;
    const a = anchorOf(key);
    img.setTexture(worldKey(key)).setOrigin(a.x, a.y).setScale(k ? SPRITE_SCALE : 1);
  }

  private buildPuzzle(): void {
    const map = this.map;
    const flags = game.state.flags;
    this.plates = [];
    this.gates = [];
    this.crateRecs = new Map();
    for (const sw of map.switches ?? []) {
      const img = this.puzzleImg(['switch_plate:0'], 'fb_plate', sw.x, sw.y, GROUND_DEPTH + 3);
      this.plates.push({ x: sw.x, y: sw.y, img, on: false });
    }
    const gateTiles = new Set((map.gates ?? []).map((g) => `${g.x},${g.y}`));
    for (const g of map.gates ?? []) {
      const open = gateIsOpen(map, flags, g);
      const img = this.puzzleImg(open ? ['gate_open:0'] : ['gate:0'], open ? 'fb_gate_open' : 'fb_gate', g.x, g.y, open ? GROUND_DEPTH + 3 : depthKey(g.x, g.y, LAYER.block));
      this.gates.push({ x: g.x, y: g.y, img, open });
    }
    // authored 'gate' / 'crate_push' tiles that have no definition stay as permanent solid props
    const homes = new Set((map.pushables ?? []).map((p) => `${p.x},${p.y}`));
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        const t = tileNameAt(map, x, y);
        if (t === 'gate' && !gateTiles.has(`${x},${y}`)) this.puzzleImg(['gate:0'], 'fb_gate', x, y, depthKey(x, y, LAYER.block));
        else if (t === 'crate_push' && !homes.has(`${x},${y}`)) this.puzzleImg([`crate_push:${variantOf(x, y, 3)}`, 'crate_push:0'], 'fb_crate', x, y, depthKey(x, y, LAYER.prop));
      }
    }
    for (const [id, pos] of this.crates) {
      const img = this.puzzleImg([`crate_push:${idVariant(id, 3)}`, 'crate_push:0'], 'fb_crate', pos.x, pos.y, depthKey(pos.x, pos.y, LAYER.prop));
      const p = project(pos.x, pos.y);
      const shadow = this.add.image(p.x, p.y + 2, 'w:shadow').setScale(0.5, 0.5).setAlpha(0.12).setDepth(depthKey(pos.x, pos.y, LAYER.shadow));
      this.mapObjs.push(shadow);
      this.crateRecs.set(id, { id, img, shadow, gx: pos.x, gy: pos.y, moving: false });
    }
  }

  private destroyPuzzle(): void {
    for (const c of this.crateRecs.values()) c.tween?.stop().remove();
    this.crateRecs = new Map();
    this.plates = [];
    this.gates = [];
  }

  private placeCrate(c: CrateRec, gx: number, gy: number): void {
    c.gx = gx;
    c.gy = gy;
    const p = project(gx, gy);
    c.img.setPosition(p.x, p.y).setDepth(depthKey(gx, gy, LAYER.prop));
    c.shadow.setPosition(p.x, p.y + 2).setDepth(depthKey(gx, gy, LAYER.shadow));
  }

  /** Re-evaluate switches from the player/crate positions, then refresh plate and gate visuals and the story flags. */
  private syncPuzzle(silent = false): void {
    if (!this.map || !hasPuzzle(this.map)) return;
    const v = this.view();
    const pt = tileOf(this.player);
    const changes = syncSwitches(this.map, this.crates, pt, v.flags);
    for (const pl of this.plates) {
      const sw = (this.map.switches ?? []).find((q) => q.x === pl.x && q.y === pl.y);
      const on = (pt.x === pl.x && pt.y === pl.y) || crateAt(this.crates, pl.x, pl.y) !== null || (!!sw && sw.flag.startsWith('latch_') && v.flags[sw.flag] === true);
      if (on !== pl.on) {
        pl.on = on;
        this.setPuzzleTex(pl.img, [on ? 'switch_plate_on:0' : 'switch_plate:0', 'switch_plate:0'], on ? 'fb_plate_on' : 'fb_plate');
      }
    }
    let opened = false;
    let closed = false;
    for (const gr of this.gates) {
      const def = (this.map.gates ?? []).find((q) => q.x === gr.x && q.y === gr.y);
      if (!def) continue;
      const open = gateIsOpen(this.map, v.flags, def);
      if (open === gr.open) continue;
      gr.open = open;
      if (open) opened = true;
      else closed = true;
      this.setPuzzleTex(gr.img, open ? ['gate_open:0'] : ['gate:0'], open ? 'fb_gate_open' : 'fb_gate');
      gr.img.setDepth(open ? GROUND_DEPTH + 3 : depthKey(gr.x, gr.y, LAYER.block));
    }
    if (changes.length === 0 && !opened && !closed) return;
    if (!silent) {
      const sw = changes.filter((c) => c.flag !== solvedFlag(this.map.id));
      if (sw.some((c) => c.on)) audio.sfx('buff');
      else if (sw.length > 0) audio.sfx('ui_confirm');
      if (opened) audio.sfx('door');
      if (changes.some((c) => c.flag === solvedFlag(this.map.id))) ui.toast('Énigme résolue.');
    }
    if (changes.length > 0) this.refreshNpcs();
  }

  private occupiedPts(): { x: number; y: number }[] {
    const out = [tileOf(this.player)];
    for (const n of this.npcs.values()) out.push(tileOf(n.actor));
    return out;
  }

  /** The crate the player is leaning on (4-neighbour, pushing roughly toward it, past the tile centre), if any. */
  private pushCandidate(wish: V2, minReach: number): { id: string; dx: number; dy: number; dot: number } | null {
    if (this.crates.size === 0 || len(wish) < 0.1) return null;
    const p = this.player;
    const t = tileOf(p);
    let best: { id: string; dx: number; dy: number; dot: number } | null = null;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const id = crateAt(this.crates, t.x + dx, t.y + dy);
      if (!id || this.crateRecs.get(id)?.moving) continue;
      const dot = wish.x * dx + wish.y * dy;
      if (dot < 0.5 || (p.x - t.x) * dx + (p.y - t.y) * dy < minReach) continue;
      if (!best || dot > best.dot) best = { id, dx, dy, dot };
    }
    return best;
  }

  /** While leaning on a crate the intent is locked to the push axis (and nudged onto its lane) so a diagonal key still pushes straight. */
  private axisLock(wish: V2): V2 {
    const c = this.pushCandidate(wish, 0);
    if (!c) return wish;
    const p = this.player;
    const t = tileOf(p);
    const off = c.dx !== 0 ? p.y - t.y : p.x - t.x; // distance from the lane centre
    const fix = Math.max(-1, Math.min(1, -off * 4));
    return normalize(c.dx !== 0 ? { x: c.dx, y: fix } : { x: fix, y: c.dy });
  }

  /** Player leans on a crate: after a short hold it slides one tile if the target is free. */
  private tryPush(dt: number, wish: V2, free: boolean): void {
    this.pushCool = Math.max(0, this.pushCool - dt);
    const best = free ? this.pushCandidate(wish, 0.2) : null;
    if (!best) {
      this.pushT = 0;
      return;
    }
    this.pushT += dt;
    if (this.pushT < PUSH_HOLD || this.pushCool > 0) return;
    this.pushT = 0;
    const to = planPush(this.view(), best.id, best.dx, best.dy, this.occupiedPts());
    if (!to) {
      this.pushCool = 0.9;
      audio.sfx('ui_error');
      const rec = this.crateRecs.get(best.id);
      if (rec) this.nudgeCrate(rec, best.dx, best.dy);
      return;
    }
    this.pushCrate(best.id, to);
  }

  private nudgeCrate(c: CrateRec, dx: number, dy: number): void {
    const o = project(c.gx, c.gy);
    const d = project(dx, dy);
    const k = 0.08;
    const tw = this.tweens.add({ targets: c.img, x: o.x + d.x * k, y: o.y + d.y * k, duration: 60, yoyo: true, ease: 'Sine.easeOut' });
    this.mapTweens.push(tw);
  }

  private pushCrate(id: string, to: { x: number; y: number }): void {
    const rec = this.crateRecs.get(id);
    const from = this.crates.get(id);
    if (!rec || !from) return;
    this.crates.set(id, to);
    storeCrate(game.state.flags, this.map, id, to);
    audio.sfx('ui_move');
    rec.moving = true;
    const tw = this.tweens.addCounter({
      from: 0,
      to: 1,
      duration: 190,
      ease: 'Sine.easeInOut',
      onUpdate: (t) => {
        const k = t.getValue() ?? 0;
        this.placeCrate(rec, from.x + (to.x - from.x) * k, from.y + (to.y - from.y) * k);
      },
      onComplete: () => {
        this.placeCrate(rec, to.x, to.y);
        rec.moving = false;
        this.syncPuzzle();
      },
    });
    rec.tween = tw;
  }

  /** Put every crate back on its authored tile (only meaningful before the puzzle is solved). */
  resetPuzzle(): void {
    if (!this.map || !this.map.pushables?.length) return;
    const flags = game.state.flags;
    resetCrates(flags, this.map);
    delete flags[solvedFlag(this.map.id)];
    for (const sw of this.map.switches ?? []) if (!sw.flag.startsWith('latch_')) flags[sw.flag] = false;
    this.destroyPuzzleObjects();
    this.crates = loadCrates(this.map, flags);
    this.pzView.crates = this.crates;
    const t = tileOf(this.player);
    if (crateAt(this.crates, t.x, t.y)) {
      const free = this.freeTileNear(t.x, t.y);
      this.player.x = free.x;
      this.player.y = free.y;
    }
    this.buildPuzzle();
    this.syncPuzzle(true);
    this.refreshNpcs();
  }

  /** Destroy only the dynamic puzzle sprites (the map's static tiles stay). */
  private destroyPuzzleObjects(): void {
    for (const c of this.crateRecs.values()) {
      c.tween?.stop().remove();
      c.img.destroy();
      c.shadow.destroy();
    }
    for (const p of this.plates) p.img.destroy();
    for (const g of this.gates) g.img.destroy();
    this.mapObjs = this.mapObjs.filter((o) => o.active);
    this.crateRecs = new Map();
    this.plates = [];
    this.gates = [];
  }

  // ---------- data lanes ----------

  /** Glowing packets flowing along every contiguous run of data_lane tiles. */
  private buildLanes(map: MapDef): void {
    const runs = laneRuns((x, y) => tileNameAt(map, x, y) === 'data_lane', map.width, map.height);
    const artKeys = packetKeys().filter((k) => this.hasTex(k));
    let total = 0;
    for (const run of runs) {
      const span = run.to - run.from + 1;
      const n = Math.max(1, Math.round(span / 3));
      const dir: 1 | -1 = (run.fixed + (run.axis === 'x' ? 0 : 1)) % 2 === 0 ? 1 : -1;
      for (let i = 0; i < n && total < MAX_PACKETS; i++, total++) {
        const k = artKeys.length ? (artKeys[variantOf(run.fixed + i, run.from, artKeys.length)] as string) : null;
        const img = this.add.image(0, 0, k ? worldKey(k) : 'w:packet').setDepth(GROUND_DEPTH + 2);
        if (k) {
          const a = anchorOf(k);
          img.setOrigin(a.x, a.y).setScale(SPRITE_SCALE);
        } else {
          img.setAngle(run.axis === 'x' ? 26.6 : -26.6);
          img.setTint(PUFF_COLOURS[variantOf(run.fixed, i, 3)] ?? 0xff48b0);
        }
        this.mapObjs.push(img);
        this.packets.push({
          img, run, dir,
          phase: (i * span) / n + variantOf(run.from, run.fixed + i, 7) * 0.2,
          speed: 1.8 + variantOf(run.fixed, run.from + i, 5) * 0.45,
        });
      }
    }
  }

  private updateLanes(dt: number): void {
    if (this.packets.length === 0) return;
    this.laneTime += dt;
    for (const k of this.packets) {
      const g = packetPos(k.run, k.phase, k.speed, k.dir, this.laneTime);
      const p = project(g.x, g.y);
      k.img.setPosition(p.x, p.y - 2).setDepth(depthKey(g.x, g.y, LAYER.prop) - 5);
    }
  }

  // ---------- map loading ----------

  private loadMap(mapId: string, x: number, y: number, facing: Direction, restore = false): void {
    this.clearMap();
    this.camFocus = null;
    this.camTau = CAM_TAU;
    this.map = db.map(mapId);
    this.charCache.clear();
    this.buildTiles(this.map);
    this.buildLanes(this.map);
    this.checkWarps(this.map);
    // crates keep their saved place when loading a save or once solved; otherwise entering resets the puzzle
    this.crates = enterMapCrates(this.map, game.state.flags, restore);
    this.pzView = { map: this.map, flags: game.state.flags, crates: this.crates };
    this.pushT = 0;
    this.pushCool = 0;
    // never spawn inside a wall: nudge to the nearest free tile
    const spawn = this.freeTileNear(x, y);
    const p = this.player;
    p.x = spawn.x;
    p.y = spawn.y;
    p.vx = 0;
    p.vy = 0;
    p.moving = false;
    p.running = false;
    p.clock = 0;
    p.frame = 0;
    const [fx, fy] = DIR_VEC[facing];
    p.face = normalize({ x: fx, y: fy });
    this.renderActor(p, 0);
    this.lastTile = tileOf(p);
    this.pzTile = this.lastTile;
    this.pzView.standing = this.lastTile;
    this.buildPuzzle();
    this.syncPuzzle(true);
    this.pendingArrival = true;
    this.refreshNpcs();
    const s = game.state;
    s.map = mapId;
    s.x = spawn.x;
    s.y = spawn.y;
    s.facing = facing;
    if (this.map.hub) setLastHub(s.flags, mapId);
    this.zoomTiles = Math.max(11, Math.min(16, (this.map.width + this.map.height) * 0.75));
    this.applyZoom();
    this.snapCamera();
    ui.mapBanner(interpolate(this.map.name, { player: s.playerName }));
    if (this.map.music) audio.music(this.map.music as TrackName);
    else audio.ambient(this.map.kind ?? 'route');
    this.minimap?.setMap(this.map);
    this.hideSignLabel();
    this.hintKey = '';
    this.refreshHints(true);
  }

  private freeTileNear(x: number, y: number): { x: number; y: number } {
    if (!this.solid(x, y)) return { x, y };
    for (let r = 1; r <= 4; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          if (!this.solid(x + dx, y + dy)) return { x: x + dx, y: y + dy };
        }
      }
    }
    return { x, y };
  }

  private applyZoom(): void {
    if (!this.map) return;
    const cam = this.cameras.main;
    cam.setZoom(Math.round(fitZoom(cam.width, cam.height, this.zoomTiles) * 20) / 20);
  }

  // ---------- camera ----------

  private cameraTarget(): { x: number; y: number } {
    const cam = this.cameras.main;
    const b = mapBounds(this.map);
    const f = this.camFocus ?? this.player;
    const p = project(f.x, f.y);
    const vw = cam.width / cam.zoom;
    const vh = cam.height / cam.zoom;
    const minY = b.minY - 110; // tall props rise above the top row
    const maxY = b.maxY + 20;
    const clampAxis = (v: number, lo: number, hi: number, view: number): number => (hi - lo <= view ? (lo + hi) / 2 : Math.min(hi - view / 2, Math.max(lo + view / 2, v)));
    return { x: clampAxis(p.x, b.minX - 40, b.maxX + 40, vw), y: clampAxis(p.y - 18, minY, maxY, vh) };
  }

  private snapCamera(): void {
    const t = this.cameraTarget();
    this.cam.x = t.x;
    this.cam.y = t.y;
    this.cam.init = true;
    this.cameras.main.centerOn(Math.round(t.x), Math.round(t.y));
  }

  private updateCamera(delta: number): void {
    const t = this.cameraTarget();
    const k = 1 - Math.exp(-delta / this.camTau);
    if (!this.cam.init) this.snapCamera();
    this.cam.x += (t.x - this.cam.x) * k;
    this.cam.y += (t.y - this.cam.y) * k;
    this.cameras.main.centerOn(Math.round(this.cam.x * 2) / 2, Math.round(this.cam.y * 2) / 2);
  }

  // ---------- NPCs ----------

  private npcVisible(def: MapNpc): boolean {
    if (game.flag(npcGoneFlag(this.map.id, def.id))) return false;
    return evalCondition(def.condition, (n) => game.flag(n));
  }

  refreshNpcs(): void {
    if (!this.map) return;
    for (const def of this.map.npcs) {
      const vis = this.npcVisible(def);
      const rec = this.npcs.get(def.id);
      if (vis && !rec) {
        const [fx, fy] = DIR_VEC[def.facing];
        const actor = this.makeActor(def.sprite, def.x, def.y, { x: fx, y: fy });
        const home = { x: def.x, y: def.y };
        const n: NpcRec = { def, actor, home, progressed: true, coolUntil: 0, coneSig: '' };
        if (def.patrol && def.patrol.length > 0) {
          n.waypoints = def.patrol.map((w) => ({ x: w.x, y: w.y }));
          n.patrol = newPatrol();
        } else if ((def.wander ?? 0) > 0 && !def.trainer) {
          n.wander = newWander(home, this.aiRng);
        }
        if (def.trainer) {
          n.cone = this.add.graphics().setDepth(GROUND_DEPTH + 20);
        }
        this.npcs.set(def.id, n);
      } else if (!vis && rec) {
        this.destroyNpc(rec);
        this.npcs.delete(def.id);
      }
    }
  }

  private wanderCtx(rec: NpcRec): WanderCtx {
    const warpAt = (x: number, y: number): boolean => this.map.warps.some((w) => w.x === x && w.y === y) || this.map.triggers.some((t) => x >= t.x && x < t.x + (t.w ?? 1) && y >= t.y && y < t.y + (t.h ?? 1));
    return {
      home: rec.home,
      radius: rec.def.wander ?? 2,
      canStand: (tx, ty) => !this.solid(tx, ty) && !warpAt(tx, ty),
      lineClear: (a, b) => {
        const d = Math.hypot(b.x - a.x, b.y - a.y);
        const n = Math.ceil(d / 0.25);
        for (let i = 1; i <= n; i++) if (boxBlocked(a.x + ((b.x - a.x) * i) / n, a.y + ((b.y - a.y) * i) / n, FEET_HALF, this.solid)) return false;
        return true;
      },
    };
  }

  private updateNpcs(dt: number, time: number): void {
    const pp = { x: this.player.x, y: this.player.y };
    for (const rec of this.npcs.values()) {
      const a = rec.actor;
      let wish = ZERO;
      let speed = WANDER_SPEED;
      if (a.ctl) {
        const c = a.ctl;
        const t = c.target();
        const d = Math.hypot(t.x - a.x, t.y - a.y);
        if (d <= c.stop || this.time.now > c.until) this.stopCtl(a);
        else {
          wish = unitToward(a, t);
          speed = c.speed;
        }
      } else if (this.busy === 0 && !this.cutsceneHeld) {
        if (rec.patrol && rec.waypoints) {
          const st = stepPatrol(rec.patrol, a, dt, rec.waypoints, rec.progressed);
          wish = st.wish;
          speed = PATROL_SPEED;
        } else if (rec.wander) {
          const st = stepWander(rec.wander, a, dt, this.wanderCtx(rec), this.aiRng, rec.progressed);
          wish = st.wish;
          if (st.justPaused && Math.hypot(pp.x - a.x, pp.y - a.y) < 3.5 && this.aiRng.chance(0.5)) this.faceToward(a, pp);
        }
      }
      const moved = this.drive(a, wish, speed, dt);
      rec.progressed = len(wish) === 0 || moved > speed * dt * 0.2;
      this.renderActor(a, time);
      this.drawCone(rec);
    }
  }

  // ---------- vision ----------

  private canSpot(rec: NpcRec): boolean {
    const t = rec.def.trainer;
    return !!t && !game.flag(trainerDefeatedFlag(t));
  }

  private drawCone(rec: NpcRec): void {
    const g = rec.cone;
    if (!g) return;
    const a = rec.actor;
    if (!this.canSpot(rec)) {
      if (rec.coneSig !== 'off') {
        g.clear();
        rec.coneSig = 'off';
      }
      return;
    }
    const sig = `${Math.round(a.x * 12)}|${Math.round(a.y * 12)}|${Math.round(a.face.x * 12)}|${Math.round(a.face.y * 12)}`;
    if (sig === rec.coneSig) return;
    rec.coneSig = sig;
    const range = rec.def.sightRange ?? DEFAULT_SIGHT;
    const poly = coneOutline(a, a.face, range, CONE_HALF, this.solid).map((p) => project(p.x, p.y));
    const pts = poly.map((p) => new Phaser.Math.Vector2(p.x, p.y));
    g.clear();
    g.fillStyle(0xff48b0, 0.13).fillPoints(pts, true);
    g.lineStyle(1.5, 0xff48b0, 0.32).strokePoints(pts, true);
  }

  private spotter(): NpcRec | null {
    const pp = { x: this.player.x, y: this.player.y };
    for (const rec of this.npcs.values()) {
      if (!this.canSpot(rec) || rec.actor.ctl || this.time.now < rec.coolUntil) continue;
      const range = rec.def.sightRange ?? DEFAULT_SIGHT;
      const a = rec.actor;
      if (inVisionCone(a, a.face, pp, range, CONE_HALF) && rayClear(a, pp, this.solid)) return rec;
    }
    return null;
  }

  private async sightEncounter(rec: NpcRec, trainerId: string): Promise<void> {
    const a = rec.actor;
    a.vx = 0;
    a.vy = 0;
    this.faceToward(a, this.player);
    audio.sfx('alert');
    await this.alertPop(a);
    const p = this.player;
    await this.walkActor(a, () => ({ x: p.x, y: p.y }), CHASE_SPEED, 1.2, 4000);
    this.faceToward(a, p);
    this.faceToward(p, a);
    try {
      await runTrainerEncounter(trainerId, this);
    } finally {
      rec.coolUntil = this.time.now + 4000;
    }
  }

  /** A pink "!" bubble that pops above an actor's head. */
  private alertPop(a: Actor, kind = '!', holdMs = 560): Promise<void> {
    const g = this.add.graphics();
    const objs: Phaser.GameObjects.GameObject[] = [g];
    const PINK = 0xff48b0;
    const PAPER = 0xf4efe4;
    const bubble = (fill: number): void => {
      g.fillStyle(INK, 1).fillCircle(2, 2, 12);
      g.fillStyle(fill, 1).fillCircle(0, 0, 12);
      g.lineStyle(2, INK, 1).strokeCircle(0, 0, 12);
    };
    switch (kind) {
      case '?': {
        bubble(0xffd23f);
        objs.push(this.add.text(0, -1, '?', { fontFamily: 'monospace', fontSize: '20px', fontStyle: '700', color: '#1d1a2b' }).setOrigin(0.5));
        break;
      }
      case '♥':
      case 'heart':
      case 'love': {
        bubble(PINK);
        g.fillStyle(PAPER, 1).fillCircle(-3.2, -2.5, 3.8).fillCircle(3.2, -2.5, 3.8).fillTriangle(-6.7, -0.6, 6.7, -0.6, 0, 7);
        break;
      }
      case '…':
      case '...':
      case 'dots': {
        bubble(PAPER);
        g.fillStyle(INK, 1).fillCircle(-6, 1, 2).fillCircle(0, 1, 2).fillCircle(6, 1, 2);
        break;
      }
      case '♪':
      case 'note':
      case 'music': {
        bubble(0x00a095);
        g.fillStyle(PAPER, 1).fillEllipse(-2.5, 5, 6.5, 4.6).fillRect(0.2, -7, 2, 12).fillTriangle(2.2, -7, 7, -3, 2.2, -2);
        break;
      }
      case '💢':
      case 'anger':
      case 'angry': {
        bubble(0xe23a3a);
        g.lineStyle(2.4, PAPER, 1);
        for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
          g.beginPath().moveTo(sx * 2.2, sy * 2.2).lineTo(sx * 3.6, sy * 5).strokePath();
          g.beginPath().moveTo(sx * 2.2, sy * 2.2).lineTo(sx * 5, sy * 3.6).strokePath();
        }
        break;
      }
      default: {
        bubble(PINK);
        g.fillStyle(PAPER, 1).fillRoundedRect(-2, -8, 4, 10, 1.5).fillCircle(0, 6, 2.2);
      }
    }
    const p = project(a.x, a.y);
    const c = this.add.container(p.x, p.y - 74, objs).setDepth(1e6).setScale(0);
    return new Promise<void>((resolve) => {
      this.tweens.add({
        targets: c,
        scale: 1,
        duration: 220,
        ease: 'Back.easeOut',
        onComplete: () => {
          this.tweens.add({ targets: c, y: c.y - 5, yoyo: true, repeat: 2, duration: 110 });
          this.time.delayedCall(holdMs, () => {
            c.destroy();
            resolve();
          });
        },
      });
    });
  }

  async moveNpc(npcId: string, path: Direction[]): Promise<void> {
    const rec = this.npcs.get(npcId);
    if (!rec) return;
    const a = rec.actor;
    for (const d of path) {
      const [dx, dy] = DIR_VEC[d];
      const t = { x: Math.round(a.x) + dx, y: Math.round(a.y) + dy };
      a.face = normalize({ x: dx, y: dy });
      await this.walkActor(a, () => t, WANDER_SPEED + 0.6, 0.06, 2500);
    }
  }


  // ---------- v0.5 cutscene port ----------

  /** Grid for scripted walking: terrain/gates/crates are solid, and so are other NPCs' tiles and the player's. */
  private walkGrid(self?: NpcRec): Grid {
    const taken = new Set<string>();
    for (const n of this.npcs.values()) if (n !== self) taken.add(`${tileOf(n.actor).x},${tileOf(n.actor).y}`);
    const pt = tileOf(this.player);
    taken.add(`${pt.x},${pt.y}`);
    return { width: this.map.width, height: this.map.height, walkable: (x, y) => !this.solid(x, y) && !taken.has(`${x},${y}`) };
  }

  /** Walk an actor over a list of tiles, one waypoint at a time (a blocked step times out and moves on). */
  private async walkTiles(a: Actor, path: V2[], speed = WANDER_SPEED + 0.9): Promise<void> {
    for (const t of path) {
      this.faceToward(a, t);
      await this.walkActor(a, () => t, speed, 0.08, 1800);
    }
  }

  async npcApproach(npcId: string): Promise<void> {
    const rec = this.npcs.get(npcId);
    if (!rec) return;
    const a = rec.actor;
    const target = tileOf(this.player);
    const path = approachPath(this.walkGrid(rec), tileOf(a), target);
    if (path === null) await this.walkActor(a, () => ({ x: this.player.x, y: this.player.y }), WANDER_SPEED + 0.9, 1.1, 3500);
    else await this.walkTiles(a, path);
    a.vx = 0;
    a.vy = 0;
    a.moving = false;
    this.faceToward(a, this.player);
    this.faceToward(this.player, a);
    this.renderActor(a, this.time.now);
    this.renderActor(this.player, this.time.now);
  }

  async npcLeave(npcId: string, to?: { x: number; y: number }, hide = false): Promise<void> {
    const rec = this.npcs.get(npcId);
    if (!rec) return;
    const a = rec.actor;
    const grid = this.walkGrid(rec);
    const exitAt = (x: number, y: number): boolean => this.map.warps.some((w) => w.x === x && w.y === y) || (this.map.exits ?? []).some((e) => e.x === x && e.y === y);
    const from = tileOf(a);
    const path = to ? bfsTo(grid, from, to) : exitPath(grid, from, exitAt, tileOf(this.player));
    if (path) await this.walkTiles(a, path, WANDER_SPEED + 0.6);
    a.vx = 0;
    a.vy = 0;
    a.moving = false;
    if (hide) {
      game.setFlag(npcGoneFlag(this.map.id, npcId), true);
      this.npcs.delete(npcId);
      this.destroyNpc(rec);
      return;
    }
    const at = tileOf(a);
    rec.home = at;
    rec.patrol = undefined;
    rec.waypoints = undefined;
    if (rec.wander) rec.wander = newWander(at, this.aiRng);
  }

  camera(target: { x: number; y: number } | 'player', ms = 700): Promise<void> {
    this.camTimer?.remove(false);
    this.camFocus = target === 'player' ? null : { x: target.x, y: target.y };
    this.camTau = Math.max(CAM_TAU, ms / 4);
    return new Promise<void>((resolve) => {
      this.camTimer = this.time.delayedCall(ms, () => {
        this.camTimer = null;
        this.camTau = CAM_TAU;
        resolve();
      });
    });
  }

  async emote(who: string, emote: string): Promise<void> {
    const a = who === 'player' ? this.player : this.npcs.get(who)?.actor;
    if (!a) return;
    await this.alertPop(a, emote, 680);
  }

  setCutscene(on: boolean): void {
    if (on === this.cutsceneHeld) return;
    this.cutsceneHeld = on;
    this.busy += on ? 1 : -1;
    if (!on) {
      this.camFocus = null;
      this.camTau = CAM_TAU;
      this.refreshHints(true);
    }
  }

  /** Dev only: warps must sit on a door / exit mat / map edge, otherwise players cannot find them. */
  private checkWarps(map: MapDef): void {
    if (!import.meta.env.DEV || warned.has(map.id)) return;
    warned.add(map.id);
    for (const w of map.warps) {
      const name = tileNameAt(map, w.x, w.y);
      const edge = w.x <= 0 || w.y <= 0 || w.x >= map.width - 1 || w.y >= map.height - 1;
      const doorLike = !!name && (name.endsWith('_door') || name === 'exit_mat');
      if (!doorLike && !edge) console.warn(`[map ${map.id}] warp (${w.x},${w.y}) -> ${w.to} sits on '${name ?? 'void'}', not a door/exit_mat/edge tile`);
      else if (name && SOLID_TILES.has(name)) console.warn(`[map ${map.id}] warp (${w.x},${w.y}) -> ${w.to} is on a solid tile '${name}'`);
    }
  }

  // ---------- input & frame update ----------

  private onAction(a: Action): void {
    if (this.busy > 0) return;
    if (a === 'confirm') void this.interact();
    else if (a === 'menu') void this.openMenu();
    else if (a === 'help') void this.openMenu('controls');
  }

  override update(time: number, delta: number): void {
    if (!this.map) return;
    const dt = Math.min(MAX_DT, delta / 1000);
    this.playAcc += delta;
    if (this.playAcc >= 1000) {
      game.state.playTimeSec += Math.floor(this.playAcc / 1000);
      this.playAcc %= 1000;
    }
    this.updatePlayer(dt, time);
    this.updateNpcs(dt, time);
    this.updateLanes(dt);
    this.updatePuffs(dt);
    if (this.busy === 0) {
      const rec = this.spotter();
      const t = rec?.def.trainer;
      if (rec && t) void this.locked(() => this.sightEncounter(rec, t));
    }
    this.updateCamera(delta);
    this.hintAcc += delta;
    if (this.hintAcc > 120) {
      this.hintAcc = 0;
      this.refreshHints();
      this.updateSignLabel();
    }
    this.mmAcc += delta;
    if (this.mmAcc > 200) {
      this.mmAcc = 0;
      this.minimap?.update(this.minimapFrame());
    }
  }

  // ---------- minimap & signpost preview ----------

  private minimapFrame(): MinimapFrame {
    const p = this.player;
    const npcs: MinimapFrame['npcs'][number][] = [];
    for (const rec of this.npcs.values()) {
      if (rec.def.ambient) continue;
      npcs.push({ x: rec.actor.x, y: rec.actor.y, kind: this.canSpot(rec) ? 'trainer' : 'npc' });
    }
    return {
      px: p.x,
      py: p.y,
      face: p.face,
      npcs,
      gates: this.gates.map((g) => ({ x: g.x, y: g.y, open: g.open })),
      switches: this.plates.map((q) => ({ x: q.x, y: q.y, on: q.on })),
      crates: [...this.crates.values()],
    };
  }

  private hideSignLabel(): void {
    this.signLabel?.setVisible(false);
    this.signLabelKey = '';
  }

  /** Floating destination preview above the signpost the player is standing next to. */
  private updateSignLabel(): void {
    if (!this.map || this.busy > 0) return this.hideSignLabel();
    const t = tileOf(this.player);
    let best: { x: number; y: number; d: number } | null = null;
    for (let dy = -3; dy <= 3; dy++) {
      for (let dx = -3; dx <= 3; dx++) {
        if (tileNameAt(this.map, t.x + dx, t.y + dy) !== 'signpost') continue;
        const d = Math.hypot(t.x + dx - this.player.x, t.y + dy - this.player.y);
        if (d <= SIGN_PREVIEW_RANGE && (!best || d < best.d)) best = { x: t.x + dx, y: t.y + dy, d };
      }
    }
    const lines = best ? signLines(this.map, best.x, best.y, 2) : [];
    if (!best || lines.length === 0) return this.hideSignLabel();
    const text = signText(lines, 2);
    const key = `${best.x},${best.y}|${text}`;
    if (!this.signLabel) {
      this.signLabel = this.add
        .text(0, 0, '', {
          fontFamily: '"IBM Plex Sans", system-ui, sans-serif', fontSize: '15px', fontStyle: '700', color: '#1d1a2b',
          backgroundColor: '#f4efe4', padding: { x: 8, y: 4 },
        })
        .setOrigin(0.5, 1)
        .setDepth(1e6)
        .setResolution(2);
    }
    if (key !== this.signLabelKey) {
      this.signLabelKey = key;
      const p = project(best.x, best.y);
      this.signLabel.setText(text).setPosition(Math.round(p.x), Math.round(p.y - 78));
    }
    this.signLabel.setVisible(true);
  }

  // ---------- player look ----------

  /** Rebuild the player's textures from `game.state.appearance` (also fired by the 'pokai:appearance' window event). */
  async refreshPlayerLook(): Promise<void> {
    const changed = await ensurePlayerTextures(this.textures, true);
    if (!changed || !this.player) return;
    this.charCache.clear();
    this.player.texKey = '';
    this.renderActor(this.player, 0);
  }

  private readIntent(): V2 {
    let ix = 0;
    let iy = 0;
    if (input.held('left', 'world')) ix -= 1;
    if (input.held('right', 'world')) ix += 1;
    if (input.held('up', 'world')) iy -= 1;
    if (input.held('down', 'world')) iy += 1;
    return screenToGrid(ix, iy);
  }

  private updatePlayer(dt: number, time: number): void {
    const p = this.player;
    const free = this.busy === 0 && !p.ctl;
    const intent = free ? this.readIntent() : ZERO;
    const wish = free ? this.axisLock(intent) : ZERO;
    const running = free && len(wish) > 0 && input.held('back', 'world');
    if (p.ctl) {
      const c = p.ctl;
      const t = c.target();
      if (Math.hypot(t.x - p.x, t.y - p.y) <= c.stop || this.time.now > c.until) this.stopCtl(p);
    }
    this.drive(p, wish, running ? RUN_SPEED : WALK_SPEED, dt, running);
    this.renderActor(p, time);
    if (p.running) this.spawnPuffs(dt);
    // state mirrors the feet tile
    const s = game.state;
    const t = tileOf(p);
    this.pzView.standing = t;
    this.tryPush(dt, intent, free);
    if (t.x !== this.pzTile.x || t.y !== this.pzTile.y) {
      this.pzTile = t;
      this.syncPuzzle();
    }
    s.x = t.x;
    s.y = t.y;
    s.facing = dirOfVector(p.face, s.facing);
    if (this.busy === 0 && this.pendingArrival) {
      this.pendingArrival = false;
      this.lastTile = t;
      this.enterTile(t.x, t.y, true);
    } else if (this.busy === 0 && (t.x !== this.lastTile.x || t.y !== this.lastTile.y)) {
      this.lastTile = t;
      this.enterTile(t.x, t.y);
    }
  }

  // ---------- data puffs (running) ----------

  private spawnPuffs(dt: number): void {
    this.puffAcc += dt;
    if (this.puffAcc < 0.07) return;
    this.puffAcc = 0;
    const p = this.player;
    const pr = project(p.x, p.y);
    const img = this.add.image(pr.x + (Math.random() - 0.5) * 8, pr.y + 2 + Math.random() * 3, 'w:puff')
      .setScale(0.4 + Math.random() * 0.3).setTint(PUFF_COLOURS[Math.floor(Math.random() * PUFF_COLOURS.length)] ?? 0xff48b0)
      .setDepth(depthKey(p.x, p.y, LAYER.fx));
    this.puffs.push({ img, life: 0.45, max: 0.45 });
  }

  private updatePuffs(dt: number): void {
    for (let i = this.puffs.length - 1; i >= 0; i--) {
      const f = this.puffs[i] as Puff;
      f.life -= dt;
      if (f.life <= 0) {
        f.img.destroy();
        this.puffs.splice(i, 1);
        continue;
      }
      f.img.y -= 22 * dt;
      f.img.setAlpha(f.life / f.max);
    }
  }

  // ---------- locking ----------

  /** Run an async world action with the player's input suspended. Errors are logged, never left hanging. */
  private async locked(fn: () => Promise<void>): Promise<void> {
    this.busy++;
    try {
      await fn();
    } catch (e) {
      console.error('[overworld]', e);
    } finally {
      this.busy--;
      if (this.cutsceneHeld && this.busy === 1) this.setCutscene(false); // script ended without cutscene:end
      this.refreshNpcs();
      this.refreshHints(true);
    }
  }

  // ---------- tile consequences ----------

  /** The player's feet just entered tile (tx, ty): story triggers, warps, wild encounters. */
  private enterTile(tx: number, ty: number, arrival = false): void {
    const trig = this.map.triggers.find((t) => {
      const inside = tx >= t.x && tx < t.x + (t.w ?? 1) && ty >= t.y && ty < t.y + (t.h ?? 1);
      if (!inside || !evalCondition(t.condition, (n) => game.flag(n))) return false;
      return !(t.once && game.flag(triggerFlag(this.map.id, t.x, t.y)));
    });
    const warp = arrival ? undefined : this.map.warps.find((w) => w.x === tx && w.y === ty);
    if (trig) {
      void this.locked(() => this.runTrigger(trig, tx, ty, warp, arrival));
      return;
    }
    if (arrival) return; // arriving on a warp or encounter tile does nothing until the next tile
    if (warp) {
      void this.locked(() => this.doWarp(warp));
      return;
    }
    const wild = this.rollWild(tx, ty);
    if (wild) void this.locked(() => this.wildBattle(wild));
  }

  private async runTrigger(t: MapTrigger, tx: number, ty: number, warp: MapWarp | undefined, arrival = false): Promise<void> {
    const mapBefore = this.map.id;
    await runScript(t.script, this);
    if (t.once) game.setFlag(triggerFlag(mapBefore, t.x, t.y), true);
    const now = tileOf(this.player);
    if (this.map.id !== mapBefore || now.x !== tx || now.y !== ty) return;
    if (arrival) return;
    if (warp) {
      await this.doWarp(warp);
      return;
    }
    const wild = this.rollWild(tx, ty);
    if (wild) await this.wildBattle(wild);
  }

  private async doWarp(w: MapWarp): Promise<void> {
    audio.sfx('door');
    await this.warp(w.to, w.toX, w.toY, w.facing ?? dirOfVector(this.player.face));
  }

  async warp(mapId: string, x: number, y: number, facing: Direction = dirOfVector(this.player.face)): Promise<void> {
    const cam = this.cameras.main;
    await new Promise<void>((resolve) => {
      cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => resolve());
      cam.fadeOut(200, ...FADE);
    });
    const target = db.hasMap(mapId) ? mapId : fallbackMapId();
    await ensureCharacters(this.textures, charactersForMap(target));
    this.loadMap(target, x, y, facing);
    game.save();
    cam.fadeIn(220, ...FADE);
  }

  private async handleWipe(): Promise<void> {
    game.healParty();
    const hubMap = lastHubMap(game.state.flags);
    const m = db.hasMap(hubMap) ? db.map(hubMap) : db.map(fallbackMapId());
    const hub = m.hub ?? { x: 4, y: 5 };
    await this.warp(m.id, hub.x, hub.y, 'down');
    ui.toast('Tes PokAI ont été redémarrés au Hub.');
  }

  // ---------- interaction ----------

  private facingTarget(): Target | null {
    const p = this.player;
    const o = { x: p.x, y: p.y };
    const cands: V2[] = [];
    const items: Target[] = [];
    for (const rec of this.npcs.values()) {
      const a = rec.actor;
      let c: V2 = { x: a.x, y: a.y };
      const d = Math.hypot(c.x - o.x, c.y - o.y);
      if (d > 1.3 && d <= 2.6) {
        // an NPC behind a counter is reachable across it
        const mid = tileOf({ x: (c.x + o.x) / 2, y: (c.y + o.y) / 2 });
        if (tileNameAt(this.map, mid.x, mid.y) === 'counter' || tileNameAt(this.map, mid.x, mid.y) === 'hub_reception') c = { x: o.x + ((c.x - o.x) / d) * (d - 1), y: o.y + ((c.y - o.y) / d) * (d - 1) };
      }
      cands.push(c);
      items.push({ kind: 'npc', rec });
    }
    const t = tileOf(o);
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const tx = t.x + dx;
        const ty = t.y + dy;
        const name = tileNameAt(this.map, tx, ty);
        if (!name) continue;
        const id = `sign_${this.map.id}_${tx}_${ty}`;
        if (SIGN_TILES.has(name)) {
          const script = db.hasScript(id) ? id : null;
          if (USE_TILES.has(name) && !script) continue;
          // a signpost without an authored script reads out the nearest map exits
          if (!script && !(name === 'signpost' && signLines(this.map, tx, ty).length > 0)) continue;
          cands.push({ x: tx, y: ty });
          items.push({ kind: 'sign', script, x: tx, y: ty, tile: name });
        } else if (name === 'terminal') {
          const tid = `terminal_${this.map.id}_${tx}_${ty}`;
          const script = db.hasScript(id) ? id : db.hasScript(tid) ? tid : null;
          if (!script && !this.map.pushables?.length) continue;
          cands.push({ x: tx, y: ty });
          items.push({ kind: 'terminal', script });
        }
      }
    }
    const i = pickInFront(o, p.face, cands);
    return i < 0 ? null : (items[i] ?? null);
  }

  private async interact(): Promise<void> {
    const target = this.facingTarget();
    if (!target) return;
    await this.locked(async () => {
      if (target.kind === 'sign') {
        if (target.script) await runScript(target.script, this);
        else await ui.say({ speaker: 'Panneau', text: signText(signLines(this.map, target.x, target.y)) });
        return;
      }
      if (target.kind === 'terminal') {
        await this.useTerminal(target.script);
        return;
      }
      const rec = target.rec;
      const a = rec.actor;
      const original = a.face;
      a.vx = 0;
      a.vy = 0;
      this.faceToward(a, this.player);
      const tr = rec.def.trainer;
      if (tr && !game.flag(trainerDefeatedFlag(tr))) await runTrainerEncounter(tr, this);
      else await runScript(rec.def.dialogue, this);
      if (this.npcs.get(rec.def.id) === rec) a.face = original;
    });
  }

  /** Terminal with an authored script runs it; otherwise it offers to reset the room's crate puzzle. */
  private async useTerminal(script: string | null): Promise<void> {
    if (script) {
      await runScript(script, this);
      return;
    }
    if (isSolved(this.map, game.state.flags)) {
      await ui.say({ speaker: 'Terminal', text: 'Tous les tests passent. Rien à réinitialiser.' });
      return;
    }
    const i = await ui.choice(['Réinitialiser l\u2019énigme', 'Laisser tel quel'], { speaker: 'Terminal', text: 'Remettre les caisses à leur place de départ ?' });
    if (i === 0) {
      this.resetPuzzle();
      ui.toast('Énigme réinitialisée.');
    }
  }

  private async openMenu(tab?: 'controls'): Promise<void> {
    await this.locked(() => (tab ? ui.menu(tab) : ui.menu()));
  }

  private refreshHints(force = false): void {
    const talk = this.map && this.busy === 0 ? this.facingTarget() : null;
    const hints: [Action, string][] = [];
    if (talk) hints.push(['confirm', talk.kind === 'sign' ? (USE_TILES.has(talk.tile) ? 'Utiliser' : 'Lire') : talk.kind === 'terminal' ? 'Utiliser' : 'Parler']);
    hints.push(['menu', 'Menu'], ['help', 'Commandes'], ['back', 'Courir']);
    const key = hints.map((h) => h.join(':')).join('|');
    if (!force && key === this.hintKey) return;
    this.hintKey = key;
    ui.setHints(hints);
  }

  // ---------- wild encounters ----------

  /** Roll once per entered encounter tile. Returns the encounter or null. */
  private rollWild(tx: number, ty: number): { form: string; level: number } | null {
    const tile = tileNameAt(this.map, tx, ty);
    if (!tile || !ENCOUNTER_TILES.has(tile)) return null;
    if (!game.state.party.some((p) => p.context > 0)) return null;
    return rollEncounter(this.map, isNightAt(), this.rng);
  }

  private async wildBattle(enc: { form: string; level: number }): Promise<void> {
    audio.sfx('encounter');
    this.cameras.main.flash(260, 244, 239, 228);
    this.cameras.main.shake(180, 0.004);
    await this.alertPop(this.player);
    game.markSeen(enc.form);
    const result = await ui.battle({ kind: 'wild', wild: enc, canFlee: true });
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
  }
}

/** BFS to an exact tile; the goal is allowed even if currently marked unwalkable (e.g. a door). */
function bfsTo(g: Grid, from: V2, to: V2): V2[] | null {
  const open: Grid = { ...g, walkable: (x, y) => (x === to.x && y === to.y) || g.walkable(x, y) };
  return bfsPath(open, from, (x, y) => x === to.x && y === to.y);
}
