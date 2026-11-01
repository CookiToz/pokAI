import Phaser from 'phaser';
import { SCENES } from './keys';
import type { DialogueSceneData } from './contracts';
import { DialogBox } from '../ui/dialog-box';
import { Controls } from '../story/controls';
import { runScript } from '../story/script-runner';

/** Transparent overlay hosting the dialogue box. With a scriptId it runs the script itself; otherwise it is a passive host used by runScript. */
export class DialogueScene extends Phaser.Scene {
  box!: DialogBox;
  controls!: Controls;
  ready = false;

  constructor() {
    super(SCENES.Dialogue);
  }

  create(data?: DialogueSceneData): void {
    this.ready = false;
    this.controls = new Controls(this);
    this.box = new DialogBox(this, this.controls);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.ready = false;
    });
    this.ready = true;
    if (data?.scriptId) {
      void runScript(this, data.scriptId).finally(() => {
        data.onDone();
        this.scene.stop();
      });
    }
  }
}
