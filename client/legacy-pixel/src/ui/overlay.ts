// Overlay plumbing shared by every scene that opens another scene on top of itself.
import Phaser from 'phaser';

/**
 * Pauses `parent`, launches `key` on top of it and resolves with whatever the
 * overlay passes to its onDone. `make` receives the done callback and returns the scene data.
 */
export function runOverlay<R>(parent: Phaser.Scene, key: string, make: (done: (r: R) => void) => object): Promise<R> {
  return new Promise<R>((resolve) => {
    parent.scene.pause();
    parent.scene.launch(
      key,
      make((r) => {
        parent.scene.resume();
        resolve(r);
      }),
    );
  });
}
