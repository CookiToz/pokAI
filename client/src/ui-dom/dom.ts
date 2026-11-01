// Tiny DOM helper: h('div.panel#id', { onclick, style }, children...)
type Child = Node | string | number | false | null | undefined;
type Props = Record<string, unknown> & { style?: Partial<CSSStyleDeclaration> | string; dataset?: Record<string, string> };

export function h<K extends keyof HTMLElementTagNameMap>(sel: K | `${K}.${string}` | `${K}#${string}`, props?: Props | null, ...children: Child[]): HTMLElementTagNameMap[K] {
  const [tagAndId, ...classes] = sel.split('.');
  const [tag, id] = (tagAndId ?? 'div').split('#');
  const el = document.createElement(tag as K);
  if (id) el.id = id;
  if (classes.length) el.className = classes.join(' ');
  for (const [k, v] of Object.entries(props ?? {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'style') typeof v === 'string' ? (el.style.cssText = v) : Object.assign(el.style, v);
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v as EventListener);
    else if (k === 'html') el.innerHTML = String(v);
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of children) if (c !== false && c !== null && c !== undefined) el.append(typeof c === 'number' ? String(c) : c);
  return el;
}

/** The DOM layer above the Phaser canvas. */
export function uiRoot(): HTMLElement {
  const el = document.getElementById('ui');
  if (!el) throw new Error('#ui root missing in index.html');
  return el;
}
