export const SCENES = {
  Boot: 'Boot',
  Title: 'Title',
  Overworld: 'Overworld',
  Dialogue: 'Dialogue',
  Battle: 'Battle',
  Onboarding: 'Onboarding',
  Evolution: 'Evolution',
  Menu: 'Menu',
  Store: 'Store',
  Starter: 'Starter',
} as const;

export type SceneKey = (typeof SCENES)[keyof typeof SCENES];
