// Réglages: session card + save (local, then cloud push).
import { audio } from '../../../audio/audio';
import { game } from '../../../state/store';
import { api } from '../../../net/api';
import { db } from '../../../data/db';
import { h } from '../../dom';
import { FocusGroup, isDir } from '../focus';
import { icon } from '../icons';
import { CLASS_LABEL, CLASS_PASSIVE, fmtInt, fmtTime } from '../labels';
import type { PageFactory } from './page';

export const SAVE_TOAST = 'Sauvegarde envoyée au cloud… ou presque.';

const STEP = 0.1;
const CHANNELS = [
  ['master', 'Général'],
  ['music', 'Musique'],
  ['sfx', 'Effets'],
] as const;

/** Keyboard / gamepad / mouse operable volume slider (a focusable `.fx` element). */
function volumeSlider(ch: 'master' | 'music' | 'sfx', label: string): { el: HTMLElement; adjust(dir: -1 | 1): void } {
  const fill = h('i');
  const val = h('b', null, '');
  const el = h('div.slider.fx', { role: 'slider', tabindex: -1, 'aria-label': label, 'aria-valuemin': '0', 'aria-valuemax': '100', dataset: { slider: ch } },
    h('span.slider-k', null, label), h('div.slider-bar', null, fill), val);
  const paint = (): void => {
    const v = Math.round(audio.getVolume(ch) * 100);
    fill.style.width = `${v}%`;
    val.textContent = `${v} %`;
    el.setAttribute('aria-valuenow', String(v));
  };
  const set = (v: number): void => {
    audio.setVolume(ch, Math.round(v * 20) / 20);
    paint();
    audio.sfx(ch === 'sfx' ? 'ui_confirm' : 'ui_move');
  };
  el.addEventListener('pointerdown', (e) => {
    const r = el.querySelector('.slider-bar')!.getBoundingClientRect();
    if (e.clientX >= r.left - 6 && e.clientX <= r.right + 6) set((e.clientX - r.left) / r.width);
  });
  paint();
  return { el, adjust: (dir) => set(audio.getVolume(ch) + dir * STEP) };
}

export const settingsPage: PageFactory = (host) => {
  const s = game.state;
  const status = h('div.page-log', { 'aria-live': 'polite' }, 'Dernière sauvegarde : jamais depuis cette session.');
  const cloud = h('span.cloud-state', null, 'Cloud : vérification…');
  void api.health().then((r) => {
    cloud.textContent = r.ok ? 'Cloud : en ligne' : 'Cloud : hors ligne (la sauvegarde locale suffit)';
  });

  async function save(): Promise<void> {
    const ok = game.save();
    if (!ok) {
      host.toast('Sauvegarde locale impossible : stockage bloqué.');
      status.textContent = 'Échec de la sauvegarde locale.';
      return;
    }
    status.textContent = `Sauvegardé à ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}. Envoi au cloud…`;
    host.toast(SAVE_TOAST);
    const pushed = await api.pushSave(game.state);
    status.textContent = pushed ? 'Sauvegarde locale et cloud à jour.' : 'Sauvegarde locale à jour. Le cloud n\'a pas répondu.';
  }

  const saveBtn = h('button.btn.btn-big.fx', { type: 'button', onclick: () => void save() }, icon('cloud'), 'Sauvegarder la session');
  const dexTotal = db.allForms().filter((f) => db.lineOfForm(f.id).mvp).length;
  const row = (k: string, v: string): HTMLElement => h('div.kv', null, h('span.k', null, k), h('span.v', null, v));
  const sliders = CHANNELS.map(([ch, label]) => volumeSlider(ch, label));
  const mute = h('button.btn.fx', { type: 'button', onclick: () => toggleMute() }, '');
  const paintMute = (): void => {
    mute.textContent = audio.isMuted() ? 'Son coupé : réactiver' : 'Couper le son';
  };
  function toggleMute(): void {
    audio.setMuted(!audio.isMuted());
    paintMute();
    if (!audio.isMuted()) audio.sfx('ui_confirm');
  }
  paintMute();
  const el = h('div.page.page-settings', null,
    h('section.card', null,
      h('h3', null, 'Session en cours'),
      row('Utilisateur', s.playerName),
      row('Classe', CLASS_LABEL[s.vibeurClass]),
      row('Passif', CLASS_PASSIVE[s.vibeurClass]),
      row('Crédits GPU', fmtInt(s.credits)),
      row('Temps de jeu', fmtTime(s.playTimeSec)),
      row('Modèles onboardés', `${s.caught.length} / ${dexTotal}`),
      row('Badges', String(s.badges.length)),
    ),
    h('section.card', null, h('h3', null, 'Audio'), ...sliders.map((x) => x.el), mute),
    h('section.card', null, h('h3', null, 'Sauvegarde'), saveBtn, cloud, status),
  );
  const group = new FocusGroup(el, '.fx');
  return {
    el,
    enter: () => group.reset(),
    leave: () => group.clear(),
    handle(a) {
      const idx = sliders.findIndex((x) => x.el === group.current);
      if (idx >= 0 && (a === 'left' || a === 'right')) {
        sliders[idx]!.adjust(a === 'left' ? -1 : 1);
        return true;
      }
      if (a === 'confirm') {
        group.activate();
        return true;
      }
      if (isDir(a)) return group.move(a) || a === 'right';
      return false;
    },
    hints: () => [['up', 'Choisir'], ['left', 'Régler le volume'], ['confirm', 'Valider'], ['back', 'Retour']],
  };
};
