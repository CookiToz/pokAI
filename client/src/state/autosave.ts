// Autosave: progress lives in the player's browser (localStorage), so it survives every redeploy of the site.
// Saves periodically while the player is free in the world, and whenever the tab is hidden or closed.
import { game } from './store';

const AUTOSAVE_MS = 15_000;

export function installAutosave(canSave: () => boolean): void {
  if (typeof window === 'undefined') return;
  const tick = (): void => {
    if (canSave()) game.save();
  };
  window.setInterval(tick, AUTOSAVE_MS);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') tick();
  });
  window.addEventListener('pagehide', tick);
  // Ask the browser not to evict our storage under pressure (best effort, silently ignored when refused).
  void navigator.storage?.persist?.().catch(() => false);
}
