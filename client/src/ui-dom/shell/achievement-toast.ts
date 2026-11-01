// "Succès débloqué" OS notification, queued one at a time. Fed by state/progression-runtime notices.
import { audio } from '../../audio/audio';
import { onProgressNotice } from '../../state/progression-runtime';
import type { AchievementDef } from '../../systems/progression';
import { db } from '../../data/db';
import { h, uiRoot } from '../dom';
import { toast } from './chrome';
import { achievementIcon } from './pages/achievements-icons';

const SHOW_MS = 3600;
let host: HTMLElement | null = null;
const queue: AchievementDef[] = [];
let showing = false;

function rewardLine(d: AchievementDef): string {
  const parts: string[] = [];
  if (d.reward?.credits) parts.push(`+${d.reward.credits} GPU`);
  for (const [id, n] of Object.entries(d.reward?.items ?? {})) if (db.hasItem(id)) parts.push(`${n > 1 ? `${n}× ` : '+ '}${db.item(id).name}`);
  return parts.join(' · ');
}

function next(): void {
  const d = queue.shift();
  if (!d) {
    showing = false;
    return;
  }
  showing = true;
  host ??= uiRoot().appendChild(h('div.ach-toasts'));
  const plate = h('span.ach-toast-ico');
  plate.innerHTML = achievementIcon(d.icon);
  const rl = rewardLine(d);
  const el = h('div.ach-toast', { role: 'status' },
    plate,
    h('div.ach-toast-txt', null,
      h('div.ach-toast-h', null, 'Succès débloqué'),
      h('div.ach-toast-title', null, d.title),
      rl ? h('div.ach-toast-rw', null, rl) : null,
    ),
  );
  host.append(el);
  audio.sfx('badge');
  requestAnimationFrame(() => el.classList.add('is-in'));
  setTimeout(() => {
    el.classList.remove('is-in');
    setTimeout(() => {
      el.remove();
      next();
    }, 220);
  }, SHOW_MS);
}

let installed = false;
export function initAchievementToasts(): void {
  if (installed) return;
  installed = true;
  onProgressNotice((n) => {
    if (n.kind === 'info') {
      toast(n.text);
      return;
    }
    queue.push(n.def);
    if (!showing) next();
  });
}
