import type { Action } from '../../../input/input';
import type { HintList } from '../hints';

export interface PageHost {
  toast(text: string): void;
  /** Runs the evolution UI (ui.evolution) then refreshes the chrome. */
  evolve(uid: string, options: string[]): Promise<void>;
  /** Re-render shared widgets (sidebar card, top bar). */
  refresh(): void;
  /** The page's hints changed without a key press (mouse): re-read Page.hints(). */
  hintsChanged(): void;
}

export interface Page {
  el: HTMLElement;
  /** Focus moved into this page. */
  enter(): void;
  /** Focus went back to the sidebar. */
  leave(): void;
  /** Returns true when the action was consumed; unconsumed left/back return to the sidebar. */
  handle(a: Action): boolean;
  hints(): HintList;
}

export type PageFactory = (host: PageHost) => Page;
