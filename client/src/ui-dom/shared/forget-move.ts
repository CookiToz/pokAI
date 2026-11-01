// "Espace disque plein": the OS dialog that lets the player pick which technique to forget
// when a fifth one is offered (level-up, evolution, H100 / Dataset). Used by the duel, the
// evolution screen and the bag. Pure UI: the caller applies the choice with systems/pokai.learnMove().
import './forget-move.css';
import { audio } from '../../audio/audio';
import { db } from '../../data/db';
import { pokaiSvg } from '../../art/svg';
import { input, type Action } from '../../input/input';
import type { PokaiInstance } from '../../state/types';
import { displayName, learnMove, type ProgressEvent } from '../../systems/pokai';
import { h, uiRoot } from '../dom';
import { pushHints } from '../shell/hints';

const TYPE_NAME: Record<string, string> = {
  chat: 'Chat', code: 'Code', reasoning: 'Raisonnement', media: 'Média', agent: 'Agent', chaos: 'Chaos', legacy: 'Legacy',
};

interface CardInfo {
  id: string;
  tokens: number;
  max: number;
}

function moveCard(info: CardInfo, label: string, isNew: boolean): HTMLElement {
  const mv = db.move(info.id);
  const power = mv.power > 0 ? `Puissance ${mv.power}` : 'Statut';
  return h(
    isNew ? 'div.fm-card.is-new' : 'button.fm-card',
    { ...(isNew ? {} : { type: 'button' }), style: `--c:var(--type-${mv.type})` },
    h('div.fm-card-top', null, h('span.fm-slot', null, label), isNew ? h('span.fm-flag', null, 'à installer') : h('span.fm-flag.is-del', null, 'supprimer ?')),
    h('div.fm-name', null, mv.name),
    h('div.fm-tags', null, h('span.fm-tag', null, h('i'), TYPE_NAME[mv.type] ?? mv.type)),
    h('dl.fm-stats', null,
      h('dt', null, 'Puissance'), h('dd', null, mv.power > 0 ? String(mv.power) : '—'),
      h('dt', null, 'Précision'), h('dd', null, `${mv.accuracy} %`),
      h('dt', null, 'Jetons'), h('dd', null, isNew ? `${info.max}` : `${info.tokens}/${info.max}`),
    ),
    h('p.fm-desc', { title: power }, mv.description),
  );
}

/**
 * Resolves with the index (0-3) of the technique to forget, or null if the player prefers not to
 * learn the new one (always after an explicit confirmation).
 */
export function askForgetMove(p: PokaiInstance, newMoveId: string): Promise<number | null> {
  return new Promise((resolve) => {
    const newName = db.move(newMoveId).name;
    const cards = p.moves.map((m, i) => moveCard({ id: m.move, tokens: m.tokens, max: db.move(m.move).tokens }, `Technique ${i + 1}`, false));
    const fresh = moveCard({ id: newMoveId, tokens: db.move(newMoveId).tokens, max: db.move(newMoveId).tokens }, 'Nouvelle', true);
    const refuseBtn = h('button.fm-btn.fx', { type: 'button', onclick: () => askRefuse() }, `Ne pas apprendre ${newName}`);
    const keepBtn = h('button.fm-btn.is-primary', { type: 'button', onclick: () => leaveConfirm() }, 'Revenir au choix');
    const doRefuseBtn = h('button.fm-btn.is-danger', { type: 'button', onclick: () => done(null) }, `Oui, ne pas apprendre ${newName}`);
    const status = h('div.fm-status', { 'aria-live': 'polite' });
    const foot = h('div.fm-foot', null, status, h('div.fm-btns', null, refuseBtn));

    const grid = h('div.fm-grid', null, ...cards, h('div.fm-arrow', { 'aria-hidden': 'true' }, '→'), fresh);
    const win = h(
      'div.fm-win',
      { role: 'dialog', 'aria-label': 'Espace disque plein' },
      h('div.fm-bar', null, h('span.fm-dots', null, h('i'), h('i'), h('i')), h('span', null, 'Gestionnaire de techniques'), h('span.fm-bar-meta', null, 'disk_full.exe')),
      h('div.fm-head', null,
        h('div.fm-art', { html: pokaiSvg(p.form) }),
        h('div', null,
          h('h2', null, 'Espace disque plein'),
          h('p', null, `${displayName(p)} connaît déjà 4 techniques. Supprimer une technique pour installer « ${newName} » ?`),
        ),
      ),
      grid,
      foot,
    );
    const backdrop = h('div.fm-backdrop', null, win);
    uiRoot().append(backdrop);
    requestAnimationFrame(() => backdrop.classList.add('is-in'));

    // sel: 0..3 = a card, 4 = "Ne pas apprendre". In confirm mode sel: 0 = revenir, 1 = confirmer.
    let sel = 0;
    let confirming = false;
    const hints = pushHints([]);
    const release = input.push('shared:forget-move', onAction);
    let finished = false;

    function render(): void {
      cards.forEach((c, i) => {
        const on = !confirming && sel === i;
        c.classList.toggle('is-focus', on);
        c.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      refuseBtn.classList.toggle('is-focus', !confirming && sel === 4);
      keepBtn.classList.toggle('is-focus', confirming && sel === 0);
      doRefuseBtn.classList.toggle('is-focus', confirming && sel === 1);
      grid.classList.toggle('is-picking', !confirming && sel < 4);
      const old = !confirming && sel < 4 ? p.moves[sel] : undefined;
      if (confirming) status.textContent = `${displayName(p)} n'apprendra pas « ${newName} ». C'est définitif.`;
      else if (old) status.textContent = `« ${db.move(old.move).name} » sera supprimée et remplacée par « ${newName} ».`;
      else status.textContent = `Garder les 4 techniques actuelles et laisser passer « ${newName} ».`;
      hints.set(
        confirming
          ? [['left', 'Choisir'], ['confirm', 'Valider'], ['back', 'Revenir au choix']]
          : sel < 4
            ? [['left', 'Choisir'], ['confirm', `Oublier ${old ? db.move(old.move).name : 'cette technique'}`], ['down', `Ne pas apprendre`], ['back', `Ne pas apprendre ${newName}`]]
            : [['up', 'Techniques'], ['confirm', `Ne pas apprendre ${newName}`], ['back', 'Ne pas apprendre']],
      );
    }

    function askRefuse(): void {
      confirming = true;
      sel = 0;
      foot.querySelector('.fm-btns')?.replaceChildren(keepBtn, doRefuseBtn);
      render();
    }

    function leaveConfirm(): void {
      confirming = false;
      sel = 4;
      foot.querySelector('.fm-btns')?.replaceChildren(refuseBtn);
      render();
    }

    function done(v: number | null): void {
      if (finished) return;
      finished = true;
      release();
      hints.pop();
      backdrop.classList.remove('is-in');
      window.setTimeout(() => backdrop.remove(), 140);
      resolve(v);
    }

    cards.forEach((c, i) => {
      c.addEventListener('mouseenter', () => { if (!confirming) { sel = i; render(); } });
      c.addEventListener('click', () => { if (!confirming) { audio.sfx('ui_confirm'); done(i); } });
    });
    refuseBtn.addEventListener('mouseenter', () => { if (!confirming) { sel = 4; render(); } });
    keepBtn.addEventListener('mouseenter', () => { sel = 0; render(); });
    doRefuseBtn.addEventListener('mouseenter', () => { sel = 1; render(); });

    function onAction(a: Action): boolean {
      if (confirming) {
        if (a === 'left' || a === 'up') sel = 0;
        else if (a === 'right' || a === 'down') sel = 1;
        else if (a === 'back') { audio.sfx('ui_back'); leaveConfirm(); return true; }
        else if (a === 'confirm') { audio.sfx('ui_confirm'); sel === 0 ? leaveConfirm() : done(null); return true; }
        audio.sfx('ui_move');
        render();
        return true;
      }
      if (a === 'left') sel = sel === 4 ? cards.length - 1 : Math.max(0, sel - 1);
      else if (a === 'right') sel = sel === 4 ? 4 : Math.min(cards.length - 1, sel + 1);
      else if (a === 'down') sel = 4;
      else if (a === 'up') sel = sel === 4 ? cards.length - 1 : sel;
      else if (a === 'back') { audio.sfx('ui_back'); askRefuse(); return true; }
      else if (a === 'confirm') {
        audio.sfx('ui_confirm');
        if (sel === 4) askRefuse();
        else done(sel);
        return true;
      }
      audio.sfx('ui_move');
      render();
      return true;
    }

    render();
  });
}

export interface LearnOutcome {
  move: string;
  /** Move that was forgotten to make room. */
  replaced?: string;
  /** The player chose not to learn it. */
  refused: boolean;
}

/**
 * Walks progress events: moves learned into a free slot are reported as-is, every `learn_offer`
 * opens the "Espace disque plein" dialog and applies the answer with learnMove().
 */
export async function resolveLearnEvents(p: PokaiInstance, events: readonly ProgressEvent[]): Promise<LearnOutcome[]> {
  const out: LearnOutcome[] = [];
  for (const e of events) {
    if (e.kind === 'learn') {
      out.push(e.replaced !== undefined ? { move: e.move, replaced: e.replaced, refused: false } : { move: e.move, refused: false });
    } else if (e.kind === 'learn_offer') {
      const idx = await askForgetMove(p, e.move);
      const res = learnMove(p, e.move, idx);
      if (res && res.kind === 'learn') {
        out.push(res.replaced !== undefined ? { move: e.move, replaced: res.replaced, refused: false } : { move: e.move, refused: false });
      } else out.push({ move: e.move, refused: true });
    }
  }
  return out;
}

const moveName = (id: string): string => (db.hasMove(id) ? db.move(id).name : id);

/** Log line for an outcome, e.g. "Claude Sonnet a oublié Liste à puces… et appris Artefact !". */
export function learnLine(p: PokaiInstance, o: LearnOutcome): string {
  const name = displayName(p);
  if (o.refused) return `${name} n'apprend pas ${moveName(o.move)}.`;
  if (o.replaced) return `${name} a oublié ${moveName(o.replaced)}… et appris ${moveName(o.move)} !`;
  return `${name} apprend ${moveName(o.move)} !`;
}
