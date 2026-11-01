// Badges: one plaque per Benchmark; obtained ones are inked, others are locked.
import { hs } from '../widgets';
import { db } from '../../../data/db';
import { game } from '../../../state/store';
import { h } from '../../dom';
import { FocusGroup, isDir } from '../focus';
import { icon } from '../icons';
import { BADGES, badgeName, type BadgeInfo } from '../labels';
import type { PageFactory } from './page';

const INKS = ['var(--pink)', 'var(--blue)', 'var(--yellow)', 'var(--teal)', 'var(--orange)'];

function allBadges(): BadgeInfo[] {
  const list = [...BADGES];
  for (const t of db.allTrainers()) {
    if (t.badge && !list.some((b) => b.id === t.badge)) list.push({ id: t.badge, name: badgeName(t.badge), bench: 'Benchmark', leader: t.name });
  }
  for (const id of game.state.badges) if (!list.some((b) => b.id === id)) list.push({ id, name: badgeName(id), bench: 'Benchmark', leader: '?' });
  return list;
}

export const badgesPage: PageFactory = () => {
  const have = new Set(game.state.badges);
  const list = allBadges();
  const grid = h('div.badge-grid');
  const el = h('div.page.page-badges', null,
    h('div.page-h', null, h('b', null, `${list.filter((b) => have.has(b.id)).length} / ${list.length}`), ' badges obtenus'),
    grid,
  );
  const group = new FocusGroup(grid, '.badge-card');
  list.forEach((b, i) => {
    const got = have.has(b.id);
    const ink = INKS[i % INKS.length]!;
    grid.append(
      hs('div.badge-card.fx' + (got ? '.is-got' : '.is-locked'), { tabindex: -1 },
        h('div.badge-plate', { style: `--ink-badge:${ink}` }, got ? icon('badge') : icon('lock')),
        h('div.badge-txt', null,
          h('div.badge-name', null, got ? b.name : '???'),
          h('div.badge-sub', null, got ? `${b.bench}, battu : ${b.leader}` : 'Pas encore obtenu'),
        ),
      ),
    );
  });
  return {
    el,
    enter() {
      group.reset();
    },
    leave() {
      group.clear();
    },
    handle(a) {
      if (isDir(a)) return a === 'left' ? group.move(a) : (group.move(a), true);
      return a === 'confirm';
    },
    hints: () => [['up', 'Parcourir'], ['back', 'Retour']],
  };
};
