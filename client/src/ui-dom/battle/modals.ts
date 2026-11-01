// In-window modals: list picker ("sheet") and small confirmation. Each pushes its own input layer.
import { h } from '../dom';
import { input, type Action } from '../../input/input';
import { ui } from '../facade';

export interface SheetRow {
  title: string;
  sub?: string;
  right?: string;
  /** Inline SVG markup shown on the left. */
  art?: string;
  meter?: number; // 0..1
  disabled?: boolean;
}

export interface SheetOptions {
  title: string;
  rows: SheetRow[];
  index?: number;
  /** Cannot be cancelled with back. */
  forced?: boolean;
  /** Return a message to refuse the selection (shown in the sheet). */
  validate?: (index: number) => string | null;
  empty?: string;
  footer?: string;
}

let sheetCount = 0;

/** Resolves with the chosen index, or -1 when cancelled. */
export function pickSheet(host: HTMLElement, o: SheetOptions): Promise<number> {
  return new Promise((resolve) => {
    let idx = Math.max(0, Math.min(o.rows.length - 1, o.index ?? 0));
    const msg = h('div.bt-sheet-msg');
    const list = h('div.bt-sheet-list', { role: 'listbox' });
    const rowEls = o.rows.map((r, i) => {
      const body = h(
        'div.bt-row-body',
        null,
        h('div.bt-row-title', null, r.title),
        r.sub ? h('div.bt-row-sub', null, r.sub) : null,
        r.meter !== undefined ? h('div.bt-meter', null, h('i', { style: { width: `${Math.round(r.meter * 100)}%` } })) : null,
      );
      const el = h(
        'button.bt-row',
        { type: 'button', role: 'option', onclick: () => { idx = i; render(); confirm(); }, onmouseenter: () => { idx = i; render(); } },
        r.art ? h('div.bt-art.bt-row-art', { html: r.art }) : null,
        body,
        r.right ? h('div.bt-row-right', null, r.right) : null,
      );
      if (r.disabled) el.classList.add('is-disabled');
      list.append(el);
      return el;
    });
    if (o.rows.length === 0) list.append(h('div.bt-row-sub', { style: { padding: '0.8em' } }, o.empty ?? 'Rien ici.'));

    const sheet = h(
      'div.bt-sheet',
      { onclick: (e: Event) => e.stopPropagation() },
      h('div.bt-sheet-head', null, h('span', null, o.title), h('span', null, o.forced ? 'obligatoire' : 'Échap : retour')),
      list,
      msg,
      o.footer ? h('div.bt-sheet-foot', null, o.footer) : null,
    );
    const backdrop = h('div.bt-backdrop', { onclick: () => cancel() }, sheet);
    host.append(backdrop);
    const id = `battle:sheet:${++sheetCount}`;
    const release = input.push(id, onAction);
    ui.setHints([['up', 'Choisir'], ['confirm', 'Valider'], ...(o.forced ? [] : ([['back', 'Retour']] as [Action, string][]))]);

    function render(): void {
      rowEls.forEach((el, i) => el.classList.toggle('is-focus', i === idx));
      rowEls[idx]?.scrollIntoView({ block: 'nearest' });
    }
    function say(text: string): void {
      msg.textContent = text;
      msg.classList.remove('is-shake');
      void msg.offsetWidth;
      msg.classList.add('is-shake');
    }
    function done(v: number): void {
      release();
      backdrop.remove();
      resolve(v);
    }
    function confirm(): void {
      if (o.rows.length === 0) return;
      const row = o.rows[idx];
      const why = o.validate?.(idx) ?? null;
      if (why || row?.disabled) {
        say(why ?? 'Indisponible.');
        return;
      }
      done(idx);
    }
    function cancel(): void {
      if (o.forced) {
        say('Tu dois choisir un PokAI.');
        return;
      }
      done(-1);
    }
    function onAction(a: Action): boolean {
      if (a === 'up') idx = Math.max(0, idx - 1);
      else if (a === 'down') idx = Math.min(o.rows.length - 1, idx + 1);
      else if (a === 'confirm') confirm();
      else if (a === 'back') cancel();
      render();
      return true;
    }
    render();
  });
}

export interface ConfirmOptions {
  title?: string;
  message: string;
  options: string[];
  cancelIndex?: number;
  index?: number;
  primary?: number;
}

/** Small dialog with buttons. Resolves with the chosen index. */
export function modalChoice(host: HTMLElement, o: ConfirmOptions): Promise<number> {
  return new Promise((resolve) => {
    let idx = o.index ?? 0;
    const btns = o.options.map((label, i) => {
      const b = h('button.bt-btn', { type: 'button', onclick: () => done(i), onmouseenter: () => { idx = i; render(); } }, label);
      if (i === (o.primary ?? 0)) b.classList.add('is-primary');
      return b;
    });
    const sheet = h(
      'div.bt-sheet',
      { onclick: (e: Event) => e.stopPropagation() },
      h('div.bt-sheet-head', null, h('span', null, o.title ?? 'Confirmation')),
      h('div.bt-confirm', null, h('p', null, o.message), h('div.bt-confirm-opts', null, ...btns)),
    );
    const backdrop = h('div.bt-backdrop', null, sheet);
    host.append(backdrop);
    const release = input.push('battle:confirm', onAction);
    ui.setHints([['left', 'Choisir'], ['confirm', 'Valider'], ...(o.cancelIndex !== undefined ? ([['back', 'Annuler']] as [Action, string][]) : [])]);
    function render(): void {
      btns.forEach((b, i) => b.classList.toggle('is-focus', i === idx));
    }
    function done(v: number): void {
      release();
      backdrop.remove();
      resolve(v);
    }
    function onAction(a: Action): boolean {
      if (a === 'left' || a === 'up') idx = Math.max(0, idx - 1);
      else if (a === 'right' || a === 'down') idx = Math.min(btns.length - 1, idx + 1);
      else if (a === 'confirm') return (done(idx), true);
      else if (a === 'back' && o.cancelIndex !== undefined) return (done(o.cancelIndex), true);
      render();
      return true;
    }
    render();
  });
}
