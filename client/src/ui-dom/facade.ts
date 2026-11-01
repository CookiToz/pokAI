// The UI facade: everything the world/story layer may ask of the interface.
// Implementations are provided by ui-dom/shell (dialogue, menus, title...) and ui-dom/battle (duel, onboarding...).
import type { BattleOutcome } from '../scenes/contracts';

export interface SayLine {
  text: string;
  speaker?: string;
  portrait?: string; // character id -> art/svg/portraits
}

export interface BattleRequest {
  kind: 'wild' | 'trainer';
  wild?: { form: string; level: number };
  trainerId?: string;
  canFlee: boolean;
}

export type MenuTab = 'team' | 'bag' | 'dex' | 'badges' | 'achievements' | 'save' | 'controls' | 'repo';

export interface UiFacade {
  /** Title screen; resolves once a game is loaded or created (game.state ready). */
  title(): Promise<void>;
  say(line: SayLine): Promise<void>;
  choice(options: string[], line?: SayLine): Promise<number>;
  battle(req: BattleRequest): Promise<BattleOutcome>;
  evolution(pokaiUid: string, options: string[]): Promise<string | null>;
  starter(): Promise<string>; // chosen Form.id (already added to party)
  store(): Promise<void>;
  /** v0.5 vending machine: small buy menu, resolves when closed. */
  vending(items: { item: string; price: number }[]): Promise<void>;
  /** v0.5 cutscene chrome: letterbox on/off and a big character name card. */
  cutscene(on: boolean): void;
  introCard(card: { name: string; title: string; portrait?: string }): Promise<void>;
  menu(tab?: MenuTab): Promise<void>;
  toast(text: string): void;
  mapBanner(name: string): void;
  /** Contextual controls hint, e.g. [['confirm','Parler'],['menu','Menu']]. */
  setHints(hints: [import('../input/input').Action, string][]): void;
}

const missing = (name: string) => (): never => {
  throw new Error(`ui.${name}() not provided yet`);
};

export const ui: UiFacade = {
  title: missing('title'), say: missing('say'), choice: missing('choice'), battle: missing('battle'),
  evolution: missing('evolution'), starter: missing('starter'), store: missing('store'), menu: missing('menu'),
  vending: missing('vending'), cutscene: () => undefined, introCard: () => Promise.resolve(),
  toast: () => undefined, mapBanner: () => undefined, setHints: () => undefined,
};

export function provideUi(part: Partial<UiFacade>): void {
  Object.assign(ui, part);
}
