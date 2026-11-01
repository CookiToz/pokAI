// Contract between MenuScene and its sub-pages (team, bag, neurodex, badges).
import Phaser from 'phaser';
import type { Action, InputRouter } from '../input';

export interface PageCtx {
  scene: Phaser.Scene;
  router: InputRouter;
  /** Ask the menu to close this page. */
  close(): void;
  /** Opens the Evolution overlay on top of the menu; resolves when it is done. */
  evolve(uid: string, options: string[]): Promise<void>;
}

export interface Page {
  handle(a: Action): void;
  destroy(): void;
}
