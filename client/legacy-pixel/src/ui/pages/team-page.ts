// Team: list + summary of the highlighted PokAI. A picks up / swaps for reordering.
import Phaser from 'phaser';
import { C, GAME_HEIGHT, GAME_WIDTH, TEXT, hex } from '../theme';
import { Panel } from '../panel';
import { PartyPicker } from '../party-picker';
import { XpBar } from '../bars';
import { typeBadge, typeBadges } from '../badges';
import { pokaiTex } from '../gfx';
import { LICENCE_LABEL, STAT_LABEL, STAT_ORDER, STATUS_LABEL } from '../labels';
import { fmtInt } from '../format';
import { txt } from '../text';
import type { Action } from '../input';
import { db } from '../../data/db';
import { game } from '../../state/store';
import { displayName, pokaiStats } from '../../systems/pokai';
import { xpForLevel } from '../../systems/stats';
import type { Page, PageCtx } from './page';

const SUM = { x: 156, y: 14, w: 161, h: 156 };

export class TeamPage implements Page {
  private readonly root: Phaser.GameObjects.Container;
  private readonly picker: PartyPicker;
  private summary: Phaser.GameObjects.GameObject[] = [];
  private readonly hint: Phaser.GameObjects.Text;

  constructor(private readonly ctx: PageCtx) {
    const sc = ctx.scene;
    this.root = sc.add.container(0, 0).setDepth(100);
    const bg = sc.add.graphics();
    bg.fillStyle(hex(C.ink), 1).fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.root.add(bg);
    this.root.add(new Panel(sc, 0, 0, GAME_WIDTH, 11, { style: 'terminal', title: 'equipe', shadow: false }));
    this.picker = new PartyPicker(sc, {
      x: 3,
      y: 14,
      party: game.state.party,
      columns: 1,
      cellW: 150,
      cellH: 24,
      spriteScale: 0.5,
      onSelect: (i) => this.pick(i),
      onCancel: () => this.back(),
      onChange: () => this.renderSummary(),
    });
    this.hint = txt(sc, 4, GAME_HEIGHT - 9, '', { ...TEXT.log, color: C.fog });
    this.root.add([this.picker, this.hint]);
    this.renderSummary();
    this.setHint();
  }

  private setHint(): void {
    this.hint.setText(this.picker.marked === null ? 'A : déplacer   B : retour' : 'A : échanger avec…   B : annuler');
  }

  private back(): void {
    if (this.picker.marked !== null) {
      this.picker.marked = null;
      this.picker.refresh();
      this.setHint();
      return;
    }
    this.ctx.close();
  }

  private pick(i: number): void {
    const party = game.state.party;
    if (this.picker.marked === null) {
      this.picker.marked = i;
    } else {
      const m = this.picker.marked;
      if (m !== i) {
        const a = party[m];
        const b = party[i];
        if (a && b) {
          party[m] = b;
          party[i] = a;
        }
      }
      this.picker.marked = null;
    }
    this.picker.setParty(party);
    this.renderSummary();
    this.setHint();
  }

  private renderSummary(): void {
    this.summary.forEach((o) => o.destroy());
    this.summary = [];
    const sc = this.ctx.scene;
    const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
      this.summary.push(o);
      this.root.add(o);
      return o;
    };
    add(new Panel(sc, SUM.x, SUM.y, SUM.w, SUM.h, { style: 'night' }));
    const p = this.picker.current;
    if (!p) {
      add(txt(sc, SUM.x + 8, SUM.y + 8, 'Aucun PokAI. Quelle solitude.', { ...TEXT.small, color: C.fog }));
      return;
    }
    const f = db.form(p.form);
    const st = pokaiStats(p);
    const x = SUM.x + 6;
    add(sc.add.image(x + 16, SUM.y + 22, pokaiTex(sc, p.form, { sealed: p.sealed === true })));
    add(txt(sc, x + 38, SUM.y + 5, displayName(p), { ...TEXT.small, color: C.cream }));
    add(txt(sc, SUM.x + SUM.w - 6, SUM.y + 6, `Nv.${p.level}`, { ...TEXT.log, color: C.gold }).setOrigin(1, 0));
    add(typeBadges(sc, x + 38, SUM.y + 16, f.types));
    add(txt(sc, x + 38, SUM.y + 27, `${LICENCE_LABEL[f.licence]}${p.status ? ` · ${STATUS_LABEL[p.status]}` : ''}`, { ...TEXT.log, color: C.fog }));
    // stats
    let y = SUM.y + 42;
    for (const k of STAT_ORDER) {
      add(txt(sc, x, y, STAT_LABEL[k], { ...TEXT.log, color: C.fog }));
      const v = k === 'context' ? `${Math.max(0, p.context)}/${st.context}` : String(st[k]);
      add(txt(sc, SUM.x + SUM.w - 6, y, v, { ...TEXT.log, color: C.cream }).setOrigin(1, 0));
      y += 8;
    }
    // moves
    y += 3;
    for (let i = 0; i < 4; i++) {
      const slot = p.moves[i];
      if (!slot) {
        add(txt(sc, x, y + i * 10, '-', { ...TEXT.log, color: C.dusk }));
        continue;
      }
      const mv = db.move(slot.move);
      add(typeBadge(sc, x, y + i * 10 - 1, mv.type));
      add(txt(sc, x + 36, y + i * 10, mv.name, { ...TEXT.log, color: C.cream }));
      add(txt(sc, SUM.x + SUM.w - 6, y + i * 10, `${slot.tokens}/${mv.tokens}`, { ...TEXT.log, color: slot.tokens === 0 ? C.ember : C.fog }).setOrigin(1, 0));
    }
    y += 44;
    // xp
    const lo = xpForLevel(p.level);
    const hi = xpForLevel(p.level + 1);
    const next = Math.max(0, hi - p.xp);
    add(txt(sc, x, y, `XP ${fmtInt(p.xp)}`, { ...TEXT.log, color: C.sky }));
    add(txt(sc, SUM.x + SUM.w - 6, y, `niv. suivant : ${fmtInt(next)}`, { ...TEXT.log, color: C.sky }).setOrigin(1, 0));
    const bar = new XpBar(sc, x, y + 10, SUM.w - 14);
    bar.setRatio(hi > lo ? (p.xp - lo) / (hi - lo) : 0);
    add(bar);
  }

  handle(a: Action): void {
    this.picker.handle(a);
  }

  destroy(): void {
    this.root.destroy();
  }
}
