// Unified input: keyboard + Gamepad API -> abstract actions, dispatched to a stack of layers.
// Only the top layer receives actions (a modal UI window blocks the world underneath).

export type Action = 'up' | 'down' | 'left' | 'right' | 'confirm' | 'back' | 'menu' | 'help';
export type Device = 'keyboard' | 'xbox' | 'playstation' | 'switch' | 'gamepad';

/** Return true to mark the action consumed (no-op for now, kept for future bubbling). */
export type ActionHandler = (action: Action) => boolean | void;

const KEYMAP: Record<string, Action> = {
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  Enter: 'confirm', Space: 'confirm', KeyE: 'confirm',
  Escape: 'back', Backspace: 'back', KeyQ: 'back',
  Tab: 'menu', KeyM: 'menu',
  KeyH: 'help', F1: 'help',
};

// Standard Gamepad mapping (https://w3c.github.io/gamepad/#remapping).
const PAD_BUTTONS: Record<number, Action> = {
  0: 'confirm', 1: 'back', 9: 'menu', 8: 'help', 3: 'menu',
  12: 'up', 13: 'down', 14: 'left', 15: 'right',
};

const DIRS: readonly Action[] = ['up', 'down', 'left', 'right'];
const REPEAT_DELAY = 320;
const REPEAT_RATE = 95;
const STICK_DEADZONE = 0.5;

interface Layer {
  id: string;
  handler: ActionHandler;
}

function detectDevice(id: string): Device {
  const s = id.toLowerCase();
  if (/(054c|playstation|dualshock|dualsense|ps[345])/.test(s)) return 'playstation';
  if (/(057e|nintendo|switch|joy-con|pro controller)/.test(s)) return 'switch';
  if (/(045e|xbox|xinput)/.test(s)) return 'xbox';
  return 'gamepad';
}

class InputBus {
  private layers: Layer[] = [];
  private keyHeld = new Set<Action>();
  private padHeld = new Set<Action>();
  private padRepeatAt = new Map<Action, number>();
  private deviceListeners = new Set<(d: Device) => void>();
  private started = false;
  device: Device = 'keyboard';

  start(): void {
    if (this.started) return;
    this.started = true;
    window.addEventListener('keydown', (e) => {
      const action = KEYMAP[e.code];
      if (!action) return;
      // Let text fields type freely (name entry): only Enter/Escape escape them.
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA') && e.code !== 'Enter' && e.code !== 'Escape') return;
      e.preventDefault();
      this.setDevice('keyboard');
      this.keyHeld.add(action);
      this.emit(action); // browser key-repeat drives menu repeat
    });
    window.addEventListener('keyup', (e) => {
      const action = KEYMAP[e.code];
      if (action) this.keyHeld.delete(action);
    });
    window.addEventListener('blur', () => this.keyHeld.clear());
    window.addEventListener('gamepadconnected', (e) => this.setDevice(detectDevice(e.gamepad.id)));
    const poll = (now: number): void => {
      this.pollPads(now);
      requestAnimationFrame(poll);
    };
    requestAnimationFrame(poll);
  }

  /** Push a layer on top; returns a function that removes it. */
  push(id: string, handler: ActionHandler): () => void {
    const layer: Layer = { id, handler };
    this.layers.push(layer);
    return () => {
      this.layers = this.layers.filter((l) => l !== layer);
    };
  }

  topLayer(): string | undefined {
    return this.layers[this.layers.length - 1]?.id;
  }

  /** Continuous state, for movement. True only if `layerId` is the top layer. */
  held(action: Action, layerId: string): boolean {
    if (this.topLayer() !== layerId) return false;
    return this.keyHeld.has(action) || this.padHeld.has(action);
  }

  onDeviceChange(cb: (d: Device) => void): () => void {
    this.deviceListeners.add(cb);
    return () => this.deviceListeners.delete(cb);
  }

  private setDevice(d: Device): void {
    if (d === this.device) return;
    this.device = d;
    for (const cb of this.deviceListeners) cb(d);
  }

  private emit(action: Action): void {
    this.layers[this.layers.length - 1]?.handler(action);
  }

  private pollPads(now: number): void {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const pressed = new Set<Action>();
    for (const pad of pads) {
      if (!pad) continue;
      pad.buttons.forEach((b, i) => {
        const a = PAD_BUTTONS[i];
        if (a && b.pressed) pressed.add(a);
      });
      const [ax = 0, ay = 0] = pad.axes;
      if (ax < -STICK_DEADZONE) pressed.add('left');
      if (ax > STICK_DEADZONE) pressed.add('right');
      if (ay < -STICK_DEADZONE) pressed.add('up');
      if (ay > STICK_DEADZONE) pressed.add('down');
      if (pressed.size > 0) this.setDevice(detectDevice(pad.id));
    }
    for (const a of pressed) {
      if (!this.padHeld.has(a)) {
        this.emit(a);
        this.padRepeatAt.set(a, now + REPEAT_DELAY);
      } else if (DIRS.includes(a) && now >= (this.padRepeatAt.get(a) ?? Infinity)) {
        this.emit(a);
        this.padRepeatAt.set(a, now + REPEAT_RATE);
      }
    }
    this.padHeld = pressed;
  }
}

export const input = new InputBus();
