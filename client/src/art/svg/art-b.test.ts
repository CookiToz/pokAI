import { describe, expect, it } from 'vitest';
import { POKAI } from './pokai-b';
import { PORTRAITS } from './portraits-b';

const POKAI_IDS = [
  'codestral', 'devstral', 'deepseek_v2', 'deepseek_v3', 'deepseek_r1', 'deepseek_v4',
  'qwen', 'qwen_2_5', 'qwen_3', 'qwq', 'grok_1', 'grok_3', 'grok_4',
  'sd_1_5', 'sdxl', 'sd3', 'midjourney_v5', 'midjourney_v6', 'midjourney_v7',
  'whisper_tiny', 'whisper_base', 'whisper_large', 'falcon_7b', 'falcon_40b', 'falcon_180b',
  'smollm', 'smollm_2', 'smollm_3', 'bert', 'roberta', 'distilbert',
];
const PORTRAIT_IDS = ['agent_conformite', 'nadelta', 'kid', 'scientist', 'sailor', 'stagiaire', 'vibeur_a', 'vibeur_b'];

const check = (rec: Record<string, string>, ids: string[]): void => {
  for (const id of ids) {
    const s = rec[id] as string;
    expect(s, id).toBeDefined();
    expect(s.startsWith('<svg'), id).toBe(true);
    expect(s).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(s).toContain('viewBox="0 0 128 128"');
    expect(s).not.toMatch(/linearGradient|radialGradient|filter/);
  }
};

describe('art-b', () => {
  it('has every pokai form', () => check(POKAI, POKAI_IDS));
  it('has every portrait', () => check(PORTRAITS, PORTRAIT_IDS));
});
