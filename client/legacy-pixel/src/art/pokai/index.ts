import type { PokaiSprite } from '../types';
import { MODELS1 } from './models1';
import { MODELS2 } from './models2';
import { MODELS3 } from './models3';
import { STARTER_SPRITES } from './starters';

export const ALL_POKAI: PokaiSprite[] = [...STARTER_SPRITES, ...MODELS1, ...MODELS2, ...MODELS3];
