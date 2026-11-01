import Phaser from 'phaser';
import { buildAllTextures } from '../art/texture-factory';
import { C, FONT_PIXEL, GAME_HEIGHT, GAME_WIDTH, TEXT } from '../ui/theme';
import { SCENES } from './keys';

async function fontsReady(): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts) return;
  const load = Promise.all([
    document.fonts.load('10px "Pixelify Sans"'),
    document.fonts.load('7px "JetBrains Mono"'),
  ]).then(() => undefined, () => undefined);
  await Promise.race([load, new Promise<void>((r) => setTimeout(r, 2000))]);
}

export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENES.Boot);
  }

  create(): void {
    this.cameras.main.setBackgroundColor(C.ink);
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'Chargement des poids…', { ...TEXT.small, color: C.fog, fontFamily: FONT_PIXEL })
      .setOrigin(0.5);
    void fontsReady().then(() => {
      buildAllTextures(this);
      this.scene.start(SCENES.Title);
    });
  }
}
