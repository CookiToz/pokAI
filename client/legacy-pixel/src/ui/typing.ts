// Token-by-token reveal of a string. Resolves true if the player skipped (A / B).
import Phaser from 'phaser';
import type { InputRouter } from './input';
import { tokenize } from './tokenize';
import { wait } from './gfx';

export async function typeTokens(
  scene: Phaser.Scene,
  router: InputRouter,
  text: string,
  onProgress: (shown: string) => void,
  tokenMs = 22,
): Promise<boolean> {
  let skipped = false;
  const off = router.onSkip(() => {
    skipped = true;
  });
  try {
    let shown = '';
    for (const tk of tokenize(text)) {
      if (skipped) break;
      shown += tk;
      onProgress(shown);
      const last = tk.trimEnd().slice(-1);
      await wait(scene, '.!?…:'.includes(last) ? tokenMs * 3 : tokenMs);
    }
    onProgress(text);
    return skipped;
  } finally {
    off();
  }
}
