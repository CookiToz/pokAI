// "Créer un profil utilisateur": LatentOS window where the player picks name + look.
// Five tabs (Corps · Visage · Cheveux · Tenue · Accessoires), thumbnail carousels, 6 presets, undo/redo, a turntable
// preview (4 views, walk toggle, portrait zoom) and an ID card. Keyboard, gamepad and mouse all drive the same rows.
import './creator.css';
import { audio } from '../../audio/audio';
import { input, type Action } from '../../input/input';
import type { PlayerAppearance } from '../../state/types';
import {
  BAGS, BROWS, EYES, FACIALS, GLASSES, HAIR_COLORS, HAIR_STYLES, HEADWEARS, LOWERS, MOUTHS, OUTFITS, OUTFIT_COLORS, PATTERNS, SHOE_COLORS, SKIN_TONES,
  normalizeAppearance, playerPortraitSvg, playerSpriteSvg,
} from '../../world/art/characters';
import { h, uiRoot } from '../dom';
import { pushHints, type HintHandle } from '../shell/hints';
import { icon } from '../shell/icons';
import { hs, sleep } from '../shell/widgets';
import { HAIR_NAMES, LookHistory, OUTFIT_NAMES, PRESETS, SHOE_NAMES, SKIN_NAMES, randomAppearance } from './appearance';

export interface CreatorResult { name: string; appearance: PlayerAppearance }

type Facing = 'front' | 'side' | 'back' | 'side-l';
const FACINGS: { id: Facing; label: string }[] = [
  { id: 'front', label: 'Face' }, { id: 'side', label: 'Profil' }, { id: 'back', label: 'Dos' }, { id: 'side-l', label: 'Profil G' },
];
interface Opt { id: string; label: string }
type Look = Required<PlayerAppearance>;

interface Row {
  id: string;
  el: HTMLElement;
  /** -1 / +1: change the value (or move between the buttons of the row). */
  nudge(d: -1 | 1): void;
  refresh(): void;
  /** Called on confirm; return true when the row consumed it (otherwise focus moves on). */
  activate?(): boolean;
}

const wrapIdx = (i: number, n: number): number => (i + n) % n;
const HEAD_VB = '8 -6 112 112';

export function runCreator(init: { name: string; appearance: PlayerAppearance }): Promise<CreatorResult | null> {
  return new Promise<CreatorResult | null>((resolve) => {
    let name = init.name;
    let look: Look = normalizeAppearance(init.appearance);
    const hist = new LookHistory();
    let facing: Facing = 'front';
    let autoTurn = true;
    let walking = true;
    let zoomed = false;
    let rowIdx = 0;
    let tabIdx = 0;
    let done = false;
    let hints: HintHandle | null = null;

    // ------------------------------------------------------------ preview (left column)
    const sprite = h('div.cr-sprite', { 'aria-hidden': 'true' });
    const big = h('div.cr-bigportrait', { 'aria-hidden': 'true' });
    const stage = h('div.cr-stage', { title: 'Glisser pour tourner · molette pour zoomer' },
      h('i.cr-blob.is-yellow'), h('i.cr-blob.is-blue'), h('i.cr-plat'), sprite, big,
      h('span.cr-stage-tag', null, 'Aperçu · en direct'),
    );
    let dragX = 0;
    let dragging = false;
    stage.addEventListener('pointerdown', (e) => {
      dragging = true;
      dragX = e.clientX;
      stage.setPointerCapture(e.pointerId);
    });
    stage.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - dragX;
      if (Math.abs(dx) > 34) {
        dragX = e.clientX;
        setFacing(shiftFacing(dx > 0 ? 1 : -1), true);
      }
    });
    const endDrag = (): void => { dragging = false; };
    stage.addEventListener('pointerup', endDrag);
    stage.addEventListener('pointercancel', endDrag);
    stage.addEventListener('wheel', (e) => {
      e.preventDefault();
      setZoom(e.deltaY < 0);
    }, { passive: false });

    const viewBtns = FACINGS.map((f) => h('button.cr-chip', { type: 'button', 'data-v': f.id, onclick: () => setFacing(f.id, true) }, f.label));
    const autoBtn = h('button.cr-chip.cr-tog', { type: 'button', onclick: () => { autoTurn = !autoTurn; paintCtl(); } }, 'Tourner');
    const walkBtn = h('button.cr-chip.cr-tog', { type: 'button', onclick: () => { walking = !walking; renderSprite(); paintCtl(); } }, 'Marcher');
    const zoomBtn = h('button.cr-chip.cr-tog', { type: 'button', onclick: () => setZoom(!zoomed) }, 'Portrait');
    const ctl = h('div.cr-ctl', null, h('div.cr-chips', null, ...viewBtns), h('div.cr-chips', null, autoBtn, walkBtn, zoomBtn));

    const portrait = h('div.cr-portrait', { 'aria-hidden': 'true' });
    const cardName = h('b.cr-card-name');
    const card = h('div.cr-card', null,
      portrait,
      h('div.cr-card-txt', null,
        h('small', null, 'Carte de Vibeur'),
        cardName,
        h('span', null, 'Session invité · N° 0007'),
        h('i.cr-bars'),
      ),
    );

    function shiftFacing(d: 1 | -1): Facing {
      const i = FACINGS.findIndex((f) => f.id === facing);
      return FACINGS[wrapIdx(i + d, FACINGS.length)]!.id;
    }
    function setFacing(f: Facing, manual: boolean): void {
      facing = f;
      if (manual) autoTurn = false;
      renderSprite();
      paintCtl();
    }
    function setZoom(on: boolean): void {
      zoomed = on;
      stage.classList.toggle('is-zoom', zoomed);
      if (zoomed) big.innerHTML = playerPortraitSvg(look);
      paintCtl();
    }
    function paintCtl(): void {
      viewBtns.forEach((b) => b.classList.toggle('is-on', b.dataset['v'] === facing));
      autoBtn.classList.toggle('is-on', autoTurn);
      walkBtn.classList.toggle('is-on', walking);
      zoomBtn.classList.toggle('is-on', zoomed);
      for (const b of [autoBtn, walkBtn, zoomBtn]) b.setAttribute('aria-pressed', String(b.classList.contains('is-on')));
    }
    function renderSprite(): void {
      const view = facing === 'side-l' ? 'side' : facing;
      sprite.classList.toggle('is-flip', facing === 'side-l');
      sprite.classList.toggle('is-still', !walking);
      const frames = walking ? [0, 1, 2, 3, 4] : [0];
      sprite.replaceChildren(
        ...frames.map((f) => {
          const d = hs('div.cr-frame' + (f === 0 ? '.is-idle' : ''), { style: `--i:${f}` });
          d.innerHTML = playerSpriteSvg(look, view, f);
          return d;
        }),
      );
    }
    function renderCard(): void {
      portrait.innerHTML = playerPortraitSvg(look);
      cardName.textContent = name.trim() || 'Vibeur';
      if (zoomed) big.innerHTML = playerPortraitSvg(look);
    }

    // ------------------------------------------------------------ look state (with history)
    function commit(next: Look): void {
      if (JSON.stringify(next) === JSON.stringify(look)) return;
      hist.push(look);
      look = next;
      renderAll();
    }
    function setLook(patch: Partial<PlayerAppearance>): void {
      commit(normalizeAppearance({ ...look, ...patch }));
    }
    function undo(): void {
      const p = hist.undo(look);
      if (!p) return audio.sfx('ui_back');
      audio.sfx('ui_move');
      look = normalizeAppearance(p);
      renderAll();
    }
    function redo(): void {
      const p = hist.redo(look);
      if (!p) return audio.sfx('ui_back');
      audio.sfx('ui_move');
      look = normalizeAppearance(p);
      renderAll();
    }
    function randomise(): void {
      audio.sfx('ui_confirm');
      commit(normalizeAppearance(randomAppearance()));
    }
    function renderAll(): void {
      renderSprite();
      renderCard();
      for (const r of paneRows()) r.refresh();
      for (const r of fixedRows) r.refresh();
    }

    // ------------------------------------------------------------ row builders
    const label = (t: string, val?: HTMLElement): HTMLElement => h('div.cr-lab', null, h('span', null, t), val);
    const rowEl = (id: string, ...kids: (Node | string)[]): HTMLElement => {
      const el = h('div.cr-row', { 'data-id': id, role: 'group' }, ...kids);
      el.addEventListener('mousedown', () => {
        const i = navRows().findIndex((r) => r.el === el);
        if (i >= 0) focusRow(i, false);
      });
      return el;
    };

    // name
    const nameInput = h('input.name-input.cr-name', { type: 'text', maxlength: 14, value: name, spellcheck: 'false', autocomplete: 'off', 'aria-label': "Nom d'utilisateur" });
    nameInput.addEventListener('keydown', (e) => {
      if (e.code === 'ArrowDown' || e.code === 'Tab') {
        e.preventDefault();
        e.stopPropagation();
        moveRow(1);
      } else if (e.code === 'ArrowUp') {
        e.preventDefault();
        e.stopPropagation();
        moveRow(-1);
      } else if (e.code !== 'Enter' && e.code !== 'Escape') e.stopPropagation();
    });
    nameInput.addEventListener('input', () => {
      name = nameInput.value;
      renderCard();
    });
    const nameRow: Row = { id: 'name', el: rowEl('name', label("Nom d'utilisateur"), nameInput), nudge: () => undefined, refresh: () => undefined };

    // 2-way segmented control
    function segRow<T extends string>(id: string, title: string, opts: { v: T; label: string }[], get: () => T, set: (v: T) => void): Row {
      const btns = opts.map((o) => h('button.cr-seg', { type: 'button', 'data-v': o.v, onclick: () => pickSeg(o.v) }, o.label));
      const pickSeg = (v: T): void => {
        if (get() === v) return;
        audio.sfx('ui_move');
        set(v);
      };
      return {
        id,
        el: rowEl(id, label(title), h('div.cr-segs', null, ...btns)),
        nudge: (d) => pickSeg(opts[wrapIdx(Math.max(0, opts.findIndex((o) => o.v === get())) + d, opts.length)]!.v),
        refresh: () => btns.forEach((b) => b.classList.toggle('is-on', b.dataset['v'] === get())),
      };
    }

    // swatch rows
    type ColourKey = 'skin' | 'hairColor' | 'top' | 'bottom' | 'shoes';
    function swatchRow(id: string, title: string, colours: string[], names: string[], key: ColourKey): Row {
      const val = h('em.cr-val');
      const sws = colours.map((c, i) =>
        h('button.cr-sw', { type: 'button', style: `--c:${c}`, title: names[i], 'aria-label': names[i], onclick: () => pickC(i) }),
      );
      const pickC = (i: number): void => {
        if (look[key].toLowerCase() === colours[i]!.toLowerCase()) return;
        audio.sfx('ui_move');
        setLook({ [key]: colours[i] } as Partial<PlayerAppearance>);
      };
      const cur = (): number => Math.max(0, colours.findIndex((c) => c.toLowerCase() === look[key].toLowerCase()));
      return {
        id,
        el: rowEl(id, label(title, val), h('div.cr-sws', null, ...sws)),
        nudge: (d) => pickC(wrapIdx(cur() + d, colours.length)),
        refresh: () => {
          sws.forEach((s, i) => s.classList.toggle('is-on', i === cur()));
          val.textContent = names[cur()] ?? '';
        },
      };
    }

    type OptKey = 'hairStyle' | 'eyes' | 'brows' | 'mouth' | 'facial' | 'glasses' | 'headwear' | 'outfit' | 'lower' | 'pattern' | 'bag';
    /** Carousel of thumbnails: each option is drawn on the current look (head crop, or a full sprite view). */
    function carouselRow(id: string, title: string, key: OptKey, opts: Opt[], mode: 'head' | 'bare' | 'bust' | 'body' | 'side'): Row {
      const val = h('em.cr-val');
      const strip = h('div.cr-thumbs');
      const thumb = (o: Opt): string => {
        // hats hide hair, faces and glasses: preview those on a bare head
        const base: Look = mode === 'head' || mode === 'bare' || mode === 'bust' ? { ...look, headwear: key === 'headwear' ? look.headwear : 'none' } : look;
        const lk = { ...base, [key]: o.id };
        if (mode === 'bust') return playerPortraitSvg(lk);
        if (mode === 'head' || mode === 'bare') return playerPortraitSvg(lk).replace('viewBox="0 0 128 128"', `viewBox="${HEAD_VB}"`);
        return playerSpriteSvg(lk, mode === 'side' ? 'side' : 'front', 0);
      };
      const cur = (): number => Math.max(0, opts.findIndex((o) => o.id === look[key]));
      const go = (d: -1 | 1): void => pickAt(wrapIdx(cur() + d, opts.length));
      const pickAt = (i: number): void => {
        if (i === cur()) return;
        audio.sfx('ui_move');
        setLook({ [key]: opts[i]!.id } as Partial<PlayerAppearance>);
      };
      return {
        id,
        el: rowEl(id, label(title, val), h('div.cr-step', null,
          h('button.cr-arr', { type: 'button', 'aria-label': 'Précédent', onclick: () => go(-1) }, '‹'),
          strip,
          h('button.cr-arr', { type: 'button', 'aria-label': 'Suivant', onclick: () => go(1) }, '›'),
        )),
        nudge: go,
        refresh: () => {
          const c = cur();
          const n = opts.length;
          const idxs = n <= 7 ? opts.map((_, i) => i) : [-2, -1, 0, 1, 2].map((d) => wrapIdx(c + d, n));
          strip.replaceChildren(...idxs.map((i) => {
            const b = hs('button.cr-th' + (i === c ? '.is-on' : ''), { type: 'button', title: opts[i]!.label, 'aria-label': opts[i]!.label, onclick: () => pickAt(i) });
            b.innerHTML = thumb(opts[i]!);
            return b;
          }));
          val.replaceChildren(opts[c]?.label ?? '', h('i', null, ` ${c + 1}/${n}`));
        },
      };
    }

    // presets: six cards with a mini portrait
    const presetBtns = PRESETS.map((p, i) => {
      const b = h('button.cr-preset', { type: 'button', title: p.blurb, onclick: () => applyPreset(i) });
      const pic = h('span.cr-preset-pic');
      pic.innerHTML = playerPortraitSvg(p.look).replace('viewBox="0 0 128 128"', `viewBox="${HEAD_VB}"`);
      b.append(pic, h('span.cr-preset-name', null, p.label));
      return b;
    });
    let presetIdx = -1;
    const presetNote = h('em.cr-val');
    function applyPreset(i: number): void {
      const p = PRESETS[wrapIdx(i, PRESETS.length)]!;
      presetIdx = wrapIdx(i, PRESETS.length);
      audio.sfx('ui_confirm');
      commit(normalizeAppearance(p.look));
      paintPresets();
    }
    function paintPresets(): void {
      const cur = JSON.stringify(look);
      const hit = PRESETS.findIndex((p) => JSON.stringify(p.look) === cur);
      presetBtns.forEach((b, i) => b.classList.toggle('is-on', i === hit));
      presetNote.textContent = hit >= 0 ? PRESETS[hit]!.blurb : 'Choisis un point de départ, puis retouche.';
    }
    const presetRow: Row = {
      id: 'presets',
      el: rowEl('presets', label('Looks prêts à l’emploi', presetNote), h('div.cr-presets', null, ...presetBtns)),
      nudge: (d) => applyPreset(presetIdx < 0 ? (d > 0 ? 0 : PRESETS.length - 1) : presetIdx + d),
      refresh: paintPresets,
    };

    // ------------------------------------------------------------ tabs
    const bodyRow = segRow<'masc' | 'fem'>('body', 'Morphologie', [{ v: 'masc', label: 'Masculine' }, { v: 'fem', label: 'Féminine' }], () => look.body, (v) => setLook({ body: v }));
    const TABS: { id: string; label: string; rows: Row[] }[] = [
      { id: 'body', label: 'Corps', rows: [presetRow, bodyRow, swatchRow('skin', 'Teint', SKIN_TONES, SKIN_NAMES, 'skin')] },
      {
        id: 'face', label: 'Visage', rows: [
          carouselRow('eyes', 'Yeux', 'eyes', EYES, 'head'),
          carouselRow('brows', 'Sourcils', 'brows', BROWS, 'head'),
          carouselRow('mouth', 'Expression', 'mouth', MOUTHS, 'head'),
          carouselRow('facial', 'Pilosité', 'facial', FACIALS, 'head'),
        ],
      },
      { id: 'hair', label: 'Cheveux', rows: [carouselRow('hair', 'Coiffure', 'hairStyle', HAIR_STYLES, 'bare'), swatchRow('hairc', 'Couleur', HAIR_COLORS, HAIR_NAMES, 'hairColor')] },
      {
        id: 'outfit', label: 'Tenue', rows: [
          carouselRow('outfit', 'Vêtement', 'outfit', OUTFITS, 'bust'),
          carouselRow('pattern', 'Motif', 'pattern', PATTERNS, 'bust'),
          swatchRow('top', 'Haut', OUTFIT_COLORS, OUTFIT_NAMES, 'top'),
          swatchRow('bottom', 'Bas', OUTFIT_COLORS, OUTFIT_NAMES, 'bottom'),
          carouselRow('lower', 'Coupe du bas', 'lower', LOWERS, 'body'),
          swatchRow('shoes', 'Chaussures', SHOE_COLORS, SHOE_NAMES, 'shoes'),
        ],
      },
      {
        id: 'acc', label: 'Accessoires', rows: [
          carouselRow('headwear', 'Couvre-chef', 'headwear', HEADWEARS, 'head'),
          carouselRow('glasses', 'Lunettes', 'glasses', GLASSES, 'head'),
          carouselRow('bag', 'Sac', 'bag', BAGS, 'side'),
        ],
      },
    ];
    const paneRows = (): Row[] => TABS[tabIdx]!.rows;
    const tabBtns = TABS.map((t, i) => h('button.cr-tab', { type: 'button', role: 'tab', 'data-i': i, onclick: () => { setTab(i); focusRow(2, false); } }, t.label));
    const tabsRow: Row = {
      id: 'tabs',
      el: rowEl('tabs', h('div.cr-tabs', { role: 'tablist' }, ...tabBtns)),
      nudge: (d) => setTab(wrapIdx(tabIdx + d, TABS.length)),
      refresh: () => tabBtns.forEach((b, i) => { b.classList.toggle('is-on', i === tabIdx); b.setAttribute('aria-selected', String(i === tabIdx)); }),
    };
    const pane = h('div.cr-pane', { role: 'tabpanel' });
    function setTab(i: number): void {
      if (i === tabIdx && pane.childElementCount) return;
      if (i !== tabIdx) audio.sfx('ui_move');
      tabIdx = i;
      pane.replaceChildren(...paneRows().map((r) => r.el));
      pane.scrollTop = 0;
      tabsRow.refresh();
      for (const r of paneRows()) r.refresh();
      // keep the focus ring on the tab strip while its content swaps
      focusRow(rowIdx === 0 ? 0 : 1, false);
    }

    // ------------------------------------------------------------ footer actions
    const undoBtn = h('button.btn.cr-btn', { type: 'button', onclick: () => undo() }, 'Annuler');
    const redoBtn = h('button.btn.cr-btn', { type: 'button', onclick: () => redo() }, 'Rétablir');
    const randomBtn = h('button.btn.cr-btn', { type: 'button', onclick: () => randomise() }, 'Au hasard');
    const okBtn = h('button.btn.btn-big.cr-btn.cr-ok', { type: 'button', onclick: () => finish(false) }, 'Suivant ▸');
    const actionBtns = [undoBtn, redoBtn, randomBtn, okBtn];
    let actionIdx = 3;
    const footRow: Row = {
      id: 'actions',
      el: rowEl('actions', h('div.cr-actions', null, h('div.cr-actions-l', null, undoBtn, redoBtn, randomBtn), okBtn)),
      nudge: (d) => {
        actionIdx = wrapIdx(actionIdx + d, actionBtns.length);
        paintActions();
      },
      refresh: paintActions,
      activate: () => {
        actionBtns[actionIdx]!.click();
        return true;
      },
    };
    function paintActions(): void {
      const on = navRows()[rowIdx]?.id === 'actions';
      actionBtns.forEach((b, i) => b.classList.toggle('is-focus', on && i === actionIdx));
      undoBtn.classList.toggle('is-off', !hist.canUndo);
      redoBtn.classList.toggle('is-off', !hist.canRedo);
      undoBtn.setAttribute('aria-disabled', String(!hist.canUndo));
      redoBtn.setAttribute('aria-disabled', String(!hist.canRedo));
    }
    const fixedRows: Row[] = [nameRow, tabsRow, footRow];

    // ------------------------------------------------------------ focus handling
    function navRows(): Row[] {
      return [nameRow, tabsRow, ...paneRows(), footRow];
    }
    function focusRow(i: number, sfx = true): void {
      const rs = navRows();
      if (i < 0 || i >= rs.length) return;
      if (sfx && i !== rowIdx) audio.sfx('ui_move');
      rowIdx = i;
      rs.forEach((r, k) => r.el.classList.toggle('is-focus', k === i));
      if (rs[i]!.id === 'name') setTimeout(() => nameInput.focus(), 0);
      else if (document.activeElement === nameInput) nameInput.blur();
      paintActions();
      rs[i]!.el.scrollIntoView({ block: 'nearest' });
    }
    function moveRow(d: -1 | 1): void {
      focusRow(wrapIdx(rowIdx + d, navRows().length));
    }

    // ------------------------------------------------------------ window
    const right = h('div.cr-right', null,
      nameRow.el,
      tabsRow.el,
      pane,
      footRow.el,
    );
    const body = h('div.win-body.cr-body', null, h('div.cr-left', null, stage, ctl, card), right);
    const win = h('section.win.win-creator', { role: 'dialog', 'aria-label': 'Créer un profil utilisateur' },
      h('div.win-bar', null, h('span.win-ico', null, icon('user')), h('span.win-title-text', null, 'Créer un profil utilisateur'), h('span.win-spacer'), h('i.win-btn.is-min'), h('i.win-btn.is-max'), h('i.win-btn.is-close')),
      body,
    );
    const root = h('div.creator', null, win,
      h('p.cr-note', { title: "Ton apparence est enregistrée dans la session. Aucun modèle n'a été consulté pour ton look." }, 'PgUp/PgDn onglets · [ ] tourner · R hasard · Ctrl+Z / Ctrl+Y annuler / rétablir'));
    uiRoot().append(root);
    setTab(0);
    renderAll();
    paintCtl();
    focusRow(0, false);
    requestAnimationFrame(() => {
      root.classList.add('is-open');
      win.classList.add('is-in');
    });

    // turntable
    const spin = window.setInterval(() => {
      if (!document.hidden && autoTurn) setFacing(shiftFacing(1), false);
    }, 2400);

    function setHints(): void {
      const list: [Action, string][] = [['up', 'Ligne'], ['left', 'Changer'], ['confirm', 'Valider'], ['menu', 'Au hasard'], ['help', 'Tourner'], ['back', 'Retour']];
      if (!hints) hints = pushHints(list);
      else hints.set(list);
    }
    setHints();

    const popLayer = input.push('intro:creator', (a) => {
      if (done) return true;
      if (a === 'back') {
        finish(true);
      } else if (a === 'menu') randomise();
      else if (a === 'help') setFacing(shiftFacing(1), true);
      else if (a === 'up') moveRow(-1);
      else if (a === 'down') moveRow(1);
      else if (a === 'left') navRows()[rowIdx]!.nudge(-1);
      else if (a === 'right') navRows()[rowIdx]!.nudge(1);
      else if (a === 'confirm') {
        const r = navRows()[rowIdx]!;
        if (!r.activate?.()) {
          audio.sfx('ui_confirm');
          moveRow(1);
        }
      }
      return true;
    });

    // extra shortcuts that have no input Action: tabs, turntable, undo/redo, random
    const onKey = (e: KeyboardEvent): void => {
      if (done) return;
      const inField = e.target instanceof HTMLInputElement;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.code === 'KeyZ' && !inField) {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (mod && e.code === 'KeyY' && !inField) {
        e.preventDefault();
        redo();
      } else if (inField || mod) return;
      else if (e.code === 'PageUp') { e.preventDefault(); tabsRow.nudge(-1); }
      else if (e.code === 'PageDown') { e.preventDefault(); tabsRow.nudge(1); }
      else if (e.code === 'BracketLeft') setFacing(shiftFacing(-1), true);
      else if (e.code === 'BracketRight') setFacing(shiftFacing(1), true);
      else if (e.code === 'KeyR') randomise();
    };
    window.addEventListener('keydown', onKey);

    // gamepad shoulders: LB/RB switch tabs, LT/RT undo/redo (edge-triggered)
    const padPrev: Record<number, boolean> = {};
    let raf = 0;
    const pollPad = (): void => {
      raf = requestAnimationFrame(pollPad);
      const pad = Array.from(navigator.getGamepads?.() ?? []).find((p): p is Gamepad => !!p);
      if (!pad) return;
      const edge = (i: number): boolean => {
        const on = !!pad.buttons[i]?.pressed;
        const hit = on && !padPrev[i];
        padPrev[i] = on;
        return hit;
      };
      if (edge(4)) tabsRow.nudge(-1);
      if (edge(5)) tabsRow.nudge(1);
      if (edge(6)) undo();
      if (edge(7)) redo();
    };
    raf = requestAnimationFrame(pollPad);

    function finish(cancel: boolean): void {
      if (done) return;
      done = true;
      window.clearInterval(spin);
      window.removeEventListener('keydown', onKey);
      cancelAnimationFrame(raf);
      popLayer();
      hints?.pop();
      audio.sfx(cancel ? 'ui_back' : 'onboard_success');
      root.classList.remove('is-open');
      void sleep(200).then(() => {
        root.remove();
        resolve(cancel ? null : { name: name.trim() || 'Vibeur', appearance: look });
      });
    }
  });
}
