// Visual tokens. Every scene uses these — no ad-hoc colours or fonts.
export const GAME_WIDTH = 320;
export const GAME_HEIGHT = 180;
export const ZOOM = 4;

export const FONT_PIXEL = '"Pixelify Sans", monospace';
export const FONT_MONO = '"JetBrains Mono", monospace';

// 16-colour master palette ("terminal riso"): sprites may add brand colours, UI may not.
export const C = {
  ink: '#14101c', // near-black background
  night: '#241c33',
  plum: '#3b2d52',
  dusk: '#5a4a78',
  fog: '#8f86a8',
  paper: '#f2ead8', // dialog box fill
  cream: '#fff8e7',
  ember: '#e8643c', // Claude-ish orange accent / danger
  gold: '#f2b632',
  leaf: '#5fa84f',
  moss: '#2f6b3f',
  sea: '#3c78b4',
  sky: '#7fc4e8',
  rose: '#d9577a',
  steel: '#7a8a99', // AIACT grey
  hp: '#4fd16a',
} as const;

export const hex = (c: string): number => parseInt(c.slice(1), 16);

export const TEXT = {
  body: { fontFamily: FONT_PIXEL, fontSize: '10px', color: C.ink, resolution: ZOOM },
  bodyLight: { fontFamily: FONT_PIXEL, fontSize: '10px', color: C.cream, resolution: ZOOM },
  small: { fontFamily: FONT_PIXEL, fontSize: '8px', color: C.ink, resolution: ZOOM },
  log: { fontFamily: FONT_MONO, fontSize: '7px', color: C.cream, resolution: ZOOM },
  title: { fontFamily: FONT_PIXEL, fontSize: '28px', color: C.cream, resolution: ZOOM },
} as const;
