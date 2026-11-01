// Battle UI entry: registers the duel, evolution and starter screens on the UI facade.
import { provideUi, ui } from '../facade';
import { openDuel } from './duel';
import { openEvolution } from './evolution';
import { openStarter } from './starter';

provideUi({
  battle: (req) => openDuel(req),
  evolution: (uid, options) => openEvolution(uid, options),
  starter: () => openStarter(),
});

// Dev-only previews (no world needed): ?battle-preview, ?trainer-preview, ?onboard-preview, ?evo-preview, ?evo2-preview, ?starter-preview
if (import.meta.env.DEV && typeof location !== 'undefined' && /(battle|trainer|onboard|evo|evo2|starter|fx)-preview/.test(location.search)) {
  void import('./preview').then((m) => m.runPreview(location.search, ui));
}
