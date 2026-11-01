// Registry over the art modules (lead-owned). UI code only imports from here.
import { POKAI as POKAI_A } from './pokai-a';
import { POKAI as POKAI_B } from './pokai-b';
import { PORTRAITS as PORTRAITS_A } from './portraits-a';
import { PORTRAITS as PORTRAITS_B } from './portraits-b';
import { PORTRAITS as PORTRAITS_C } from './portraits-c';

const POKAI: Record<string, string> = { ...POKAI_A, ...POKAI_B };
const PORTRAITS: Record<string, string> = { ...PORTRAITS_A, ...PORTRAITS_B, ...PORTRAITS_C };

const UNKNOWN =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><path d="M64 22c-24 0-38 18-38 42 0 20 10 34 22 42h32c12-8 22-22 22-42 0-24-14-42-38-42z" fill="#3a3550" transform="translate(4 4)"/><path d="M64 22c-24 0-38 18-38 42 0 20 10 34 22 42h32c12-8 22-22 22-42 0-24-14-42-38-42z" fill="#1d1a2b"/><text x="64" y="78" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="34" font-weight="700" fill="#f4efe4">?</text></svg>';

export const hasPokaiArt = (formId: string): boolean => formId in POKAI;
export const pokaiSvg = (formId: string): string => POKAI[formId] ?? UNKNOWN;
export const hasPortrait = (id: string): boolean => id in PORTRAITS;
export const portraitSvg = (id: string): string | undefined => PORTRAITS[id];
/** For Phaser: data URI usable with this.load.svg / textures.addBase64. */
export const svgDataUri = (svg: string): string => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
