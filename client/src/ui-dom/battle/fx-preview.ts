// Dev-only: a static arena with two cards where every move effect can be triggered (window.__fx).
import { h } from '../dom';
import { uiRoot } from '../dom';
import { game } from '../../state/store';
import { createPokai } from '../../systems/pokai';
import { createRng } from '../../systems/rng';
import type { MoveCategory, StatusId, TypeId } from '../../data/types';
import { Backdrop, arenaTheme } from './backdrop';
import { FxLayer } from './fx';
import { ModelCard } from './model-card';
import { Pacer } from './util';
import './common.css';
import './duel.css';

export async function runFxPreview(q: URLSearchParams): Promise<void> {
  const root = h('div.bt-screen.is-in', { id: 'duel' });
  uiRoot().append(root);
  const rng = createRng(3);
  const cards = { player: new ModelCard('player'), foe: new ModelCard('foe') };
  cards.player.show(createPokai('claude_haiku', 14, rng), 60);
  cards.foe.show(createPokai(q.get('form') ?? 'gpt_4o', 12, rng), 60);
  const body = h('div.bt-duel-body', null, h('div.bt-arena', null, cards.player.el, h('div.bt-vs', null, 'VS'), cards.foe.el));
  new Backdrop(root).set((q.get('bg') as ReturnType<typeof arenaTheme> | null) ?? 'cables');
  root.append(h('div.bt-titlebar', null, h('span.bt-title', null, 'fx preview')), body);
  const fx = new FxLayer(root, new Pacer(), (s) => cards[s].el.querySelector('.bt-mart-wrap') as HTMLElement, body);
  const w = window as unknown as Record<string, unknown>;
  w['__fx'] = async (type: TypeId, category: MoveCategory, eff = 1, crit = false, miss = false): Promise<void> => {
    const self = category === 'heal' || category === 'shield' || category === 'buff';
    await fx.move({ from: 'player', to: self ? 'player' : 'foe', type, category, eff, crit, miss });
    if (category === 'damage' && !miss) await fx.impact('foe', eff, crit);
  };
  w['__status'] = (s: StatusId | null): void => cards.foe.setStatus(s);
  void game;
}
