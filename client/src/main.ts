import Phaser from 'phaser';
import './ui-dom/tokens.css';
import './ui-dom/shell';
import './ui-dom/battle';
import { input } from './input/input';
import { BootScene } from './scenes/boot-scene';
import { OverworldScene } from './scenes/overworld-scene';

input.start();

// Phaser renders only the isometric world; all interface lives in the DOM layer (#ui).
new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#1d1a2b',
  antialias: true,
  scale: { mode: Phaser.Scale.RESIZE, width: window.innerWidth, height: window.innerHeight },
  scene: [BootScene, OverworldScene],
});
