// Succès: grid of satirical achievements. Locked ones show "???" and a vague hint; secret ones also hide their icon.
import { hs } from '../widgets';
import { db } from '../../../data/db';
import { game } from '../../../state/store';
import { snapshot, unlockedSet } from '../../../state/progression-runtime';
import { ACHIEVEMENTS, progressOf, type AchievementDef } from '../../../systems/progression';
import { h } from '../../dom';
import { FocusGroup, isDir } from '../focus';
import { achievementIcon } from './achievements-icons';
import type { PageFactory } from './page';

const INKS = ['var(--pink)', 'var(--blue)', 'var(--yellow)', 'var(--teal)', 'var(--orange)'];

function rewardText(d: AchievementDef): string {
  const parts: string[] = [];
  if (d.reward?.credits) parts.push(`${d.reward.credits} GPU`);
  for (const [id, n] of Object.entries(d.reward?.items ?? {})) if (db.hasItem(id)) parts.push(`${n > 1 ? `${n}× ` : ''}${db.item(id).name}`);
  return parts.length ? `Récompense : ${parts.join(', ')}` : '';
}

export const achievementsPage: PageFactory = () => {
  const have = unlockedSet();
  const snap = snapshot();
  const list = [...ACHIEVEMENTS].sort((a, b) => Number(have.has(b.id)) - Number(have.has(a.id)));
  const grid = h('div.badge-grid.ach-grid');
  const el = h('div.page.page-achievements', null,
    h('div.page-h', null, h('b', null, `${list.filter((d) => have.has(d.id)).length} / ${list.length}`), ' succès débloqués'),
    grid,
  );
  const group = new FocusGroup(grid, '.badge-card');
  list.forEach((d, i) => {
    const got = have.has(d.id);
    const mask = !got && d.secret === true;
    const ink = INKS[i % INKS.length]!;
    const plate = h('div.badge-plate', { style: `--ink-badge:${ink}` });
    plate.innerHTML = achievementIcon(got ? d.icon : mask ? 'lock' : d.icon);
    const pct = Math.round(progressOf(snap, d) * 100);
    grid.append(
      hs('div.badge-card.fx.ach-card' + (got ? '.is-got' : '.is-locked'), { tabindex: -1 },
        plate,
        h('div.badge-txt', null,
          h('div.badge-name', null, got ? d.title : '???'),
          h('div.badge-sub', null, got ? d.description : d.hint),
          got ? h('div.badge-sub.ach-reward', null, rewardText(d)) : mask ? null : h('div.badge-sub.ach-progress', null, `Progression : ${pct} %`),
        ),
      ),
    );
  });
  void game; // the page is rebuilt from the save each time it opens
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
