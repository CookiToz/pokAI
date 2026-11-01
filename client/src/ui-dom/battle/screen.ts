// A full-screen LatentOS window: DOM root + one input layer.
import { uiRoot } from '../dom';
import { h } from '../dom';
import { input, type Action } from '../../input/input';
import { ui } from '../facade';
import { sleep } from './util';

type Hint = [Action, string];

export class Screen {
  readonly root: HTMLElement;
  private release: () => void;
  private handler: (a: Action) => void = () => undefined;
  private closed = false;

  constructor(id: string, cls = '') {
    this.root = h('div.bt-screen', { id, class: `bt-screen ${cls}` });
    uiRoot().append(this.root);
    this.release = input.push(`battle:${id}`, (a) => {
      this.handler(a);
      return true;
    });
    requestAnimationFrame(() => requestAnimationFrame(() => this.root.classList.add('is-in')));
  }

  onAction(fn: (a: Action) => void): void {
    this.handler = fn;
  }

  hints(list: Hint[]): void {
    ui.setHints(list);
  }

  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    this.release();
    this.root.classList.remove('is-in');
    this.root.classList.add('is-out');
    await sleep(140);
    this.root.remove();
  }
}

export function titlebar(title: string, meta = '', aiact = false): HTMLElement {
  return h(
    aiact ? 'div.bt-titlebar.is-aiact' : 'div.bt-titlebar',
    null,
    h('span.bt-dots', null, h('i'), h('i'), h('i')),
    h('span.bt-title', null, title),
    meta ? h('span.bt-meta', null, meta) : null,
  );
}
