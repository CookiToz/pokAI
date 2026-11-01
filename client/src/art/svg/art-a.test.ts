import { describe, expect, it } from 'vitest';
import { POKAI } from './pokai-a';
import { PORTRAITS } from './portraits-a';

const POKAI_IDS = ['claude_haiku', 'claude_sonnet', 'claude_opus', 'phi_1', 'phi_3', 'phi_4', 'gemma', 'gemma_2', 'gemma_3', 'gpt_2', 'gpt_3_5', 'gpt_4o', 'gpt_5', 'o1_mini', 'o1', 'o3', 'gemini_nano', 'gemini_flash', 'gemini_pro', 'gemini_ultra', 'nano_banana', 'nano_banana_pro', 'copilot', 'copilot_chat', 'copilot_agent', 'llama_2', 'llama_3', 'llama_4_scout', 'llama_4_maverick', 'llama_4_behemoth', 'mistral_7b', 'mixtral_8x7b', 'mistral_large', 'magistral', 'transformer'];
const PORTRAIT_IDS = ['player', 'mom', 'lecube', 'kevin', 'kartpathy', 'nurse_hugging', 'clerk', 'gourou'];

const check = (rec: Record<string, string>, ids: string[]) => {
  for (const id of ids) {
    const s = rec[id] as string;
    expect(s, id).toBeDefined();
    expect(s.startsWith('<svg'), id).toBe(true);
    expect(s).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(s).toContain('viewBox="0 0 128 128"');
    expect(s).not.toMatch(/linearGradient|radialGradient|filter/);
  }
};

describe('art-a', () => {
  it('has every PokAI', () => check(POKAI, POKAI_IDS));
  it('has every portrait', () => check(PORTRAITS, PORTRAIT_IDS));
});
