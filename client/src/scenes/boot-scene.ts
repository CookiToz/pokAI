import Phaser from 'phaser';
import { game } from '../state/store';
import { ui } from '../ui-dom/facade';
import { buildWorldTextures, charactersForMap, ensureAuxTextures, ensureCharacters } from '../world/textures';
import { SCENES } from './keys';

const FONT_TIMEOUT_MS = 2000;

async function fontsReady(): Promise<void> {
  const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
  if (!fonts) return;
  await Promise.race([fonts.ready.then(() => undefined), new Promise<void>((r) => setTimeout(r, FONT_TIMEOUT_MS))]);
}

/** Loads fonts and the generated world textures, runs the DOM title screen, then starts the overworld. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENES.Boot);
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#1d1a2b');
    void this.run();
  }

  private async run(): Promise<void> {
    await Promise.all([fontsReady(), buildWorldTextures(this.textures)]);
    ensureAuxTextures(this.textures);
    try {
      await ui.title();
    } catch (e) {
      // The title screen is optional during development: fall back to the saved game, or a new one.
      console.warn('[boot] ui.title() unavailable, starting directly:', e);
      if (!(game.hasSave() && game.load())) game.newGame('Vibeur', 'prompt_engineer');
    }
    await ensureCharacters(this.textures, charactersForMap(game.state.map));
    this.scene.start(SCENES.Overworld);
  }
}
