// LatentOS boot / login screen: misregistered wordmark, boot log, then Nouvelle / Reprendre → name → Vibeur class.
import { audio } from '../../audio/audio';
import { db } from '../../data/db';
import { game, SAVE_KEY } from '../../state/store';
import type { VibeurClass } from '../../state/types';
import { hasPokaiArt } from '../../art/svg';
import { input, type Action } from '../../input/input';
import { h, uiRoot } from '../dom';
import { toast } from './chrome';
import { FocusGroup, isDir } from './focus';
import { pushHints, type HintHandle } from './hints';
import { icon } from './icons';
import { CLASS_LABEL, CLASS_ORDER, CLASS_PASSIVE, CLASS_TAGLINE, fmtTime } from './labels';
import { art, sleep, hs } from './widgets';
import { runIntro } from '../intro/intro';
import { runCreator } from '../intro/creator';
import '../intro/creator.css';
import { DEFAULT_APPEARANCE, playerPortraitSvg } from '../../world/art/characters';
import type { PlayerAppearance } from '../../state/types';

const BOOT: [string, string][] = [
  ['ok', 'latentos 0.2 — noyau chargé'],
  ['ok', 'montage du Hub 🤗 … ok'],
  ['ok', 'lecture de tout Internet … terminé (c\'était long)'],
  ['warn', 'utilisateur : n\'a pas lu tout Internet'],
  ['ok', 'session invité prête. Aucun modèle n\'a été blessé.'],
];

interface SavePeek { name: string; cls: VibeurClass; badges: number; sec: number }
function peekSave(): SavePeek | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Partial<{ playerName: string; vibeurClass: VibeurClass; badges: string[]; playTimeSec: number }>;
    return { name: s.playerName ?? 'Vibeur', cls: s.vibeurClass ?? 'prompt_engineer', badges: s.badges?.length ?? 0, sec: s.playTimeSec ?? 0 };
  } catch {
    return null;
  }
}

function featuredForms(): string[] {
  const forms = db.allForms().filter((f) => f.stage === 1 && db.lineOfForm(f.id).mvp && hasPokaiArt(f.id));
  const out: string[] = [];
  const step = Math.max(1, Math.floor(forms.length / 6));
  for (let i = 0; i < forms.length && out.length < 6; i += step) out.push(forms[i]!.id);
  return out;
}

export function runTitle(): Promise<void> {
  audio.music('title');
  return new Promise<void>((resolve) => {
    let step: 'boot' | 'main' | 'class' = 'boot';
    let look: PlayerAppearance = { ...DEFAULT_APPEARANCE };
    let busy = false;
    let name = 'Vibeur';
    let hintHandle: HintHandle | null = null;
    let skipBoot = false;
    let done = false;
    const save = game.hasSave() ? peekSave() : null;

    const wm = (cls: string): HTMLElement => hs('span.wm.' + cls, { 'aria-hidden': 'true' }, 'PokAI');
    const log = h('div.boot-log', { 'aria-hidden': 'true' });
    const login = h('section.win.win-login', { role: 'dialog', 'aria-label': 'Ouverture de session' });
    const loginBody = h('div.win-body.login-body');
    login.append(
      h('div.win-bar', null, h('span.win-ico', null, icon('user')), h('span.win-title-text', null, 'Ouverture de session'), h('span.win-spacer'), h('i.win-btn.is-min'), h('i.win-btn.is-max'), h('i.win-btn.is-close')),
      loginBody,
    );
    const creatures = h('div.title-creatures', { 'aria-hidden': 'true' }, ...featuredForms().map((f) => art(f, 88)));
    const root = h(
      'div.title',
      null,
      h('div.title-main', null,
        h('div.title-brand', null, icon('logo'), h('span', null, 'LatentOS 0.2 — session invité')),
        h('h1.wordmark', { 'aria-label': 'PokAI' }, wm('wm-pink'), wm('wm-blue'), wm('wm-ink')),
        h('p.tagline', null, 'Ils ont lu tout Internet. Pas toi.'),
        log,
        creatures,
      ),
      login,
      h('footer.title-foot', null, 'Parodie non affiliée. Les marques et personnes évoquées le sont à titre satirique.'),
    );
    uiRoot().append(root);
    requestAnimationFrame(() => root.classList.add('is-open'));

    const group = new FocusGroup(loginBody, '.tfx');

    function setHints(): void {
      const list: [Action, string][] =
        step === 'main' ? [['up', 'Choisir'], ['confirm', 'Valider']]
          : step === 'class' ? [['up', 'Choisir'], ['confirm', 'Démarrer'], ['back', 'Modifier le profil']]
            : [['confirm', 'Passer']];
      if (!hintHandle) hintHandle = pushHints(list);
      else hintHandle.set(list);
    }

    function show(next: typeof step): void {
      step = next;
      login.classList.add('is-in');
      loginBody.replaceChildren();
      if (step === 'main') renderMain();
      else if (step === 'class') renderClass();
      setHints();
    }

    const bigBtn = (label: string, sub: string | null, fn: () => void): HTMLElement =>
      h('button.login-btn.tfx', { type: 'button', onclick: fn }, h('b', null, label), sub ? h('small', null, sub) : null);

    function renderMain(): void {
      loginBody.append(
        h('div.login-h', null, 'Bienvenue sur LatentOS'),
        h('p.login-p', null, 'Choisis une session. Les deux sont gratuites, pour l\'instant.'),
        bigBtn('Nouvelle session', 'Créer un compte Vibeur', () => void startNew()),
        bigBtn('Reprendre la session', save ? `${save.name} · ${CLASS_LABEL[save.cls]} · ${save.badges} badge${save.badges > 1 ? 's' : ''} · ${fmtTime(save.sec)}` : 'Aucune session enregistrée', () => resume()),
      );
      const resumeBtn = loginBody.querySelectorAll<HTMLElement>('.tfx')[1]!;
      if (!save) resumeBtn.setAttribute('data-disabled', '');
      group.current = null;
      group.set(save ? resumeBtn : group.items()[0] ?? null);
    }

    async function createProfile(): Promise<void> {
      const r = await runCreator({ name, appearance: look });
      if (!r) {
        show('main');
        return;
      }
      name = r.name;
      look = r.appearance;
      show('class');
    }

    async function startNew(): Promise<void> {
      if (busy) return;
      busy = true;
      try {
        await runIntro();
        audio.music('title');
        await createProfile();
      } finally {
        busy = false;
      }
    }

    function renderClass(): void {
      (document.activeElement as HTMLElement | null)?.blur();
      loginBody.append(
        h('div.login-head', null, h('div.login-portrait', { html: playerPortraitSvg(look), 'aria-hidden': 'true' }), h('div.login-h', null, `Quel Vibeur es-tu, ${name.trim() || 'Vibeur'} ?`)),
        h('div.class-grid', null,
          ...CLASS_ORDER.map((c) =>
            h('button.ccard.tfx', { type: 'button', 'data-c': c, onclick: () => begin(c) },
              h('b.ccard-name', null, CLASS_LABEL[c]),
              h('i.ccard-tag', null, CLASS_TAGLINE[c]),
              h('span.ccard-passive', null, h('em', null, 'Passif'), CLASS_PASSIVE[c]),
            ),
          ),
        ),
      );
      group.current = null;
      group.set(group.items()[0] ?? null);
    }

    function resume(): void {
      if (!save) return;
      if (!game.load()) {
        toast('Sauvegarde illisible. Elle a probablement été dépréciée.');
        return;
      }
      finish();
    }

    function begin(c: VibeurClass): void {
      game.newGame(name.trim() || 'Vibeur', c);
      game.state.appearance = { ...look };
      game.save();
      window.dispatchEvent(new Event('pokai:appearance'));
      finish();
    }

    function finish(): void {
      if (done) return;
      done = true;
      popLayer();
      hintHandle?.pop();
      root.classList.remove('is-open');
      setTimeout(() => {
        root.remove();
        resolve();
      }, 200);
    }

    const popLayer = input.push('shell:title', (a) => {
      if (step === 'boot') {
        if (a === 'confirm') skipBoot = true;
        return true;
      }
      if (a === 'back') {
        if (step === 'class') void createProfile();
        return true;
      }
      if (step === 'class' && (a === 'left' || a === 'right' || a === 'up' || a === 'down')) {
        group.move(a);
        return true;
      }
      if (isDir(a)) {
        group.move(a === 'left' ? 'up' : a === 'right' ? 'down' : a);
        return true;
      }
      if (a === 'confirm') {
        group.activate();
      }
      return true;
    });
    root.addEventListener('click', () => {
      if (step === 'boot') skipBoot = true;
    });

    setHints();
    void (async () => {
      await sleep(250);
      for (const [lvl, text] of BOOT) {
        const line = hs('div.boot-line.is-' + lvl, null, h('span.boot-tag', null, lvl === 'ok' ? 'OK' : '!!'), h('span.boot-text'));
        log.append(line);
        const target = line.querySelector('.boot-text')!;
        for (let i = 1; i <= text.length && !skipBoot; i += 2) {
          target.textContent = text.slice(0, i);
          await sleep(9);
        }
        target.textContent = text;
        if (!skipBoot) await sleep(70);
      }
      if (!skipBoot) await sleep(180);
      show('main');
    })();
  });
}
