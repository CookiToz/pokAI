// What to print for an action on the current device (used by the controls helper).
import type { Action, Device } from './input';

export const ACTION_LABEL: Record<Action, string> = {
  up: 'Haut', down: 'Bas', left: 'Gauche', right: 'Droite',
  confirm: 'Valider', back: 'Retour', menu: 'Menu', help: 'Commandes',
};

const KEYBOARD: Record<Action, string> = {
  up: '↑', down: '↓', left: '←', right: '→',
  confirm: 'Entrée', back: 'Échap', menu: 'Tab', help: 'H',
};

const PADS: Record<Exclude<Device, 'keyboard'>, Record<Action, string>> = {
  xbox: { up: '✚↑', down: '✚↓', left: '✚←', right: '✚→', confirm: 'A', back: 'B', menu: '☰', help: '⧉' },
  playstation: { up: '✚↑', down: '✚↓', left: '✚←', right: '✚→', confirm: '✕', back: '○', menu: 'Options', help: 'Share' },
  switch: { up: '✚↑', down: '✚↓', left: '✚←', right: '✚→', confirm: 'B', back: 'A', menu: '+', help: '−' },
  gamepad: { up: '✚↑', down: '✚↓', left: '✚←', right: '✚→', confirm: '①', back: '②', menu: 'Start', help: 'Select' },
};

export function glyph(action: Action, device: Device): string {
  return device === 'keyboard' ? KEYBOARD[action] : PADS[device][action];
}

/** Every binding, for the full "Commandes" panel. */
export const KEYBOARD_ALTERNATIVES: Record<Action, string[]> = {
  up: ['↑', 'W'], down: ['↓', 'S'], left: ['←', 'A'], right: ['→', 'D'],
  confirm: ['Entrée', 'Espace', 'E'], back: ['Échap', 'Retour arrière', 'Q'], menu: ['Tab', 'M'], help: ['H', 'F1'],
};
