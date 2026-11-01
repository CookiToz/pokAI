// Spatial focus navigation shared by every window: arrows/d-pad/stick move a pink focus ring between `.fx` elements.
import { audio } from '../../audio/audio';
import type { Action } from '../../input/input';

type Dir = 'up' | 'down' | 'left' | 'right';
export const isDir = (a: Action): a is Dir => a === 'up' || a === 'down' || a === 'left' || a === 'right';

const visible = (el: HTMLElement): boolean => el.offsetParent !== null && !el.hasAttribute('data-disabled');

export class FocusGroup {
  current: HTMLElement | null = null;
  onChange: ((el: HTMLElement | null) => void) | null = null;

  constructor(private readonly root: HTMLElement, private readonly selector = '.fx') {
    // Mouse: hover moves the ring so keyboard and mouse never disagree about "current".
    root.addEventListener('mouseover', (e) => {
      const el = (e.target as HTMLElement | null)?.closest<HTMLElement>(this.selector);
      if (el && root.contains(el) && visible(el) && el !== this.current) this.set(el, false);
    });
  }

  items(): HTMLElement[] {
    return [...this.root.querySelectorAll<HTMLElement>(this.selector)].filter(visible);
  }

  set(el: HTMLElement | null, scroll = true): void {
    if (this.current === el) return;
    this.current?.classList.remove('is-focus');
    this.current = el;
    if (el) {
      el.classList.add('is-focus');
      if (scroll) el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
    this.onChange?.(el);
  }

  /** Focus the first item (or the one matching `pick`). */
  reset(pick?: (el: HTMLElement) => boolean): void {
    const list = this.items();
    this.set(list.find((e) => pick?.(e)) ?? list[0] ?? null);
  }

  clear(): void {
    this.set(null);
  }

  /** Ensure the current element still exists in the DOM. */
  revalidate(): void {
    if (this.current && !this.root.contains(this.current)) {
      this.current = null;
    }
    if (!this.current) this.set(this.items()[0] ?? null);
  }

  /** Moves the ring. Returns false when nothing lies in that direction. */
  move(dir: Dir): boolean {
    const list = this.items();
    if (!this.current || !list.includes(this.current)) {
      this.set(list[0] ?? null);
      return list.length > 0;
    }
    const r = this.current.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    let best: HTMLElement | null = null;
    let bestScore = Infinity;
    for (const el of list) {
      if (el === this.current) continue;
      const o = el.getBoundingClientRect();
      const dx = o.left + o.width / 2 - cx;
      const dy = o.top + o.height / 2 - cy;
      let primary: number;
      let secondary: number;
      if (dir === 'left' || dir === 'right') {
        if (dir === 'left' ? dx >= -2 : dx <= 2) continue;
        if (Math.abs(dy) > Math.max(r.height, o.height) * 0.6) continue; // same row band only
        primary = Math.abs(dx);
        secondary = Math.abs(dy);
      } else {
        if (dir === 'up' ? dy >= -2 : dy <= 2) continue;
        primary = Math.abs(dy);
        secondary = Math.abs(dx);
      }
      const score = primary + secondary * 2.5;
      if (score < bestScore) {
        bestScore = score;
        best = el;
      }
    }
    if (!best) return false;
    this.set(best);
    audio.sfx('ui_move');
    return true;
  }

  activate(): void {
    if (this.current) audio.sfx('ui_confirm');
    this.current?.click();
  }

  /** Common handling: directions move, confirm clicks. Returns true if consumed. */
  handle(a: Action): boolean {
    if (isDir(a)) return this.move(a);
    if (a === 'confirm' && this.current) {
      this.activate();
      return true;
    }
    return false;
  }
}
