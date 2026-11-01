// LatentOS shell: implements title, dialogue, menus, store, toasts, banners and controls hints via provideUi().
import './shell.css';
import { provideUi, ui, type MenuTab } from '../facade';
import { initChrome, mapBanner, refreshChrome, setDockHandler, startSession, toast } from './chrome';
import { choice, say } from './dialogue';
import { initHints, setBaseHints } from './hints';
import { menuIsOpen, gotoMenuTab, openMenu } from './menu';
import { openStore } from './store';
import { openRepo } from './repo';
import { openVending } from './vending';
import { introCard, setCutscene } from '../cutscene';
import { runTitle } from './title';
import { initAchievementToasts } from './achievement-toast';
import { initObjectivesHud } from '../objectives';
import { installProgression } from '../../state/progression-runtime';

const PREVIEW = import.meta.env.DEV ? new URLSearchParams(location.search).get('shell-preview') : null;

async function title(): Promise<void> {
  // Preview scenes skip the real title (the world boot may still ask for it).
  if (PREVIEW && PREVIEW !== 'title') return;
  await runTitle();
  startSession();
}

function boot(): void {
  initChrome();
  initHints(toast);
  installProgression();
  initAchievementToasts();
  initObjectivesHud(toast);
  setDockHandler((tab: MenuTab) => {
    if (menuIsOpen()) gotoMenuTab(tab);
    else void openMenu(tab);
  });
  provideUi({
    title,
    say,
    choice,
    store: openStore,
    menu: (tab) => (tab === 'repo' ? openRepo() : openMenu(tab ?? 'team')),
    vending: openVending,
    cutscene: setCutscene,
    introCard,
    toast,
    mapBanner,
    setHints: setBaseHints,
  });
  refreshChrome();
  if (PREVIEW !== null) {
    void import('./preview').then((m) => m.runPreview(ui));
  }
}

boot();
