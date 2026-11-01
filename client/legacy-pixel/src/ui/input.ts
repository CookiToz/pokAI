// Keyboard → abstract actions, with a handler stack and an animation lock.
//   arrows      → up/down/left/right
//   A           → Space / Enter / Z
//   B           → Esc / X / Backspace
// While locked, actions go to "skip" listeners only (used to fast-forward text),
// so input can never trigger game logic mid-animation, nor get stuck.
import Phaser from 'phaser';

export type Action = 'up' | 'down' | 'left' | 'right' | 'a' | 'b';
export type ActionHandler = (action: Action) => void;

const CODE_MAP: Record<string, Action> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  Space: 'a',
  Enter: 'a',
  NumpadEnter: 'a',
  KeyZ: 'a',
  Escape: 'b',
  KeyX: 'b',
  Backspace: 'b',
};

export class InputRouter {
  private stack: ActionHandler[] = [];
  private skipListeners = new Set<ActionHandler>();
  private lockCount = 0;
  private readonly held = new Set<Action>();

  constructor(private readonly scene: Phaser.Scene) {
    const kb = scene.input.keyboard;
    if (!kb) return;
    kb.addCapture([
      Phaser.Input.Keyboard.KeyCodes.SPACE,
      Phaser.Input.Keyboard.KeyCodes.UP,
      Phaser.Input.Keyboard.KeyCodes.DOWN,
      Phaser.Input.Keyboard.KeyCodes.LEFT,
      Phaser.Input.Keyboard.KeyCodes.RIGHT,
      Phaser.Input.Keyboard.KeyCodes.BACKSPACE,
    ]);
    kb.on('keydown', this.onKeyDown, this);
    kb.on('keyup', this.onKeyUp, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
  }

  get locked(): boolean {
    return this.lockCount > 0;
  }

  /** Is a direction / button currently held (for continuous movement). */
  isHeld(a: Action): boolean {
    return this.held.has(a);
  }

  push(handler: ActionHandler): void {
    this.stack.push(handler);
  }

  pop(handler?: ActionHandler): void {
    if (!handler) {
      this.stack.pop();
      return;
    }
    const i = this.stack.lastIndexOf(handler);
    if (i >= 0) this.stack.splice(i, 1);
  }

  /** Replace the whole stack with a single handler. */
  set(handler: ActionHandler): void {
    this.stack = [handler];
  }

  clear(): void {
    this.stack = [];
  }

  lock(): void {
    this.lockCount++;
  }

  unlock(): void {
    this.lockCount = Math.max(0, this.lockCount - 1);
  }

  /** Run an async block with the input locked; always unlocks. */
  async locking<T>(fn: () => Promise<T>): Promise<T> {
    this.lock();
    try {
      return await fn();
    } finally {
      this.unlock();
    }
  }

  onSkip(listener: ActionHandler): () => void {
    this.skipListeners.add(listener);
    return () => this.skipListeners.delete(listener);
  }

  private onKeyDown(ev: KeyboardEvent): void {
    const action = CODE_MAP[ev.code];
    if (!action) return;
    const isButton = action === 'a' || action === 'b';
    if (ev.repeat && isButton) return;
    this.held.add(action);
    // skip listeners always hear buttons (text fast-forward)
    if (isButton) this.skipListeners.forEach((l) => l(action));
    if (this.locked) return;
    const top = this.stack[this.stack.length - 1];
    if (top) top(action);
  }

  private onKeyUp(ev: KeyboardEvent): void {
    const action = CODE_MAP[ev.code];
    if (action) this.held.delete(action);
  }

  destroy(): void {
    const kb = this.scene.input.keyboard;
    kb?.off('keydown', this.onKeyDown, this);
    kb?.off('keyup', this.onKeyUp, this);
    this.stack = [];
    this.skipListeners.clear();
  }
}
