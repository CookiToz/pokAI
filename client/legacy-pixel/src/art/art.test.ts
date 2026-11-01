import { describe, expect, it } from 'vitest';
import { TILE_NAMES } from '../data/tiles';
import { CHARACTER_SHEETS } from './characters';
import { ALL_POKAI } from './pokai';
import { TILE_SPRITES } from './tiles';
import { mirrorDark, sealed, silhouette } from './transform';
import { UI_SPRITES } from './ui';
import { validateCharacter, validatePokai, validateSprite } from './validate';

const FORMS = `claude_haiku claude_sonnet claude_opus phi_1 phi_3 phi_4 gemma gemma_2 gemma_3 gpt_2 gpt_3_5 gpt_4o gpt_5 o1_mini o1 o3
gemini_nano gemini_flash gemini_pro gemini_ultra nano_banana nano_banana_pro copilot copilot_chat copilot_agent llama_2 llama_3
llama_4_scout llama_4_maverick llama_4_behemoth mistral_7b mixtral_8x7b mistral_large magistral codestral devstral deepseek_v2
deepseek_v3 deepseek_r1 deepseek_v4 qwen qwen_2_5 qwen_3 qwq grok_1 grok_3 grok_4 sd_1_5 sdxl sd3 midjourney_v5 midjourney_v6
midjourney_v7 whisper_tiny whisper_base whisper_large falcon_7b falcon_40b falcon_180b smollm smollm_2 smollm_3 bert roberta
distilbert transformer`.split(/\s+/);

describe('art', () => {
  it('has one valid 16x16 sprite per tile', () => {
    expect(TILE_SPRITES).toHaveLength(TILE_NAMES.length);
    TILE_SPRITES.forEach((s, i) => validateSprite(`tile:${TILE_NAMES[i]}`, s, 16, 16));
  });
  it('has valid characters', () => {
    expect(CHARACTER_SHEETS.map((c) => c.id)).toHaveLength(16);
    CHARACTER_SHEETS.forEach(validateCharacter);
  });
  it('has valid pokai sprites for every form', () => {
    const ids = new Set(ALL_POKAI.map((p) => p.formId));
    for (const f of FORMS) expect(ids.has(f), f).toBe(true);
    ALL_POKAI.forEach(validatePokai);
    expect(ids.size).toBe(ALL_POKAI.length);
  });
  it('has valid ui sprites and derived variants', () => {
    Object.entries(UI_SPRITES).forEach(([k, s]) => validateSprite(k, s));
    expect(UI_SPRITES['ui:frame']).toMatchObject({ w: 24, h: 24 });
    const f = ALL_POKAI[0]!.front;
    expect(mirrorDark(f).rows).toHaveLength(32);
    expect(sealed(f).rows).toHaveLength(32);
    expect(silhouette().w).toBe(32);
  });
});
