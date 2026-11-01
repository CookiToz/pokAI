import { describe, expect, it } from 'vitest';
import { createPokai, maxContext } from './pokai';
import { createRng, type Rng } from './rng';
import { playCards, startOnboarding, type OnboardingState } from './onboarding';
import type { PokaiInstance } from '../state/types';

function weakened(form: string, ratio = 0.3): PokaiInstance {
  const p = createPokai(form, 8, createRng(1));
  p.context = Math.max(1, Math.floor(maxContext(p) * ratio));
  return p;
}

/** Plays the best known cards: hinted traits first, then cards matching found traits, then random. */
function smartPlay(s: OnboardingState, rng: Rng) {
  const hinted = s.traits.filter((t) => s.hints.includes(t.hint) && !s.found.includes(t.id));
  const pick: string[] = [];
  for (const t of hinted) {
    const c = s.hand.find((x) => t.tokens.includes(x.id) && !pick.includes(x.id) && !x.jailbreak);
    if (c) pick.push(c.id);
  }
  for (const t of s.traits.filter((x) => s.found.includes(x.id))) {
    const c = s.hand.find((x) => t.tokens.includes(x.id) && !pick.includes(x.id));
    if (c && pick.length < 3) pick.push(c.id);
  }
  for (const c of rng.shuffle(s.hand)) if (pick.length < 3 && !pick.includes(c.id) && !c.jailbreak) pick.push(c.id);
  return playCards(s, pick.slice(0, 3), rng);
}

describe('onboarding', () => {
  it('sets up hand size and hints from the key tier', () => {
    const t = weakened('smollm', 0.45);
    const free = startOnboarding(t, 'free', 'vibe_coder', createRng(1));
    expect(free.hand.length).toBe(4);
    expect(free.hints.length).toBe(1);
    expect(free.traits.length).toBe(3);
    const ent = startOnboarding(t, 'enterprise', 'prompt_engineer', createRng(1));
    expect(ent.hand.length).toBe(7);
    expect(ent.hints.length).toBe(3);
  });

  it('low HP reveals more hints', () => {
    const s = startOnboarding(weakened('smollm', 0.05), 'free', 'vibe_coder', createRng(2));
    expect(s.hints.length).toBe(3);
  });

  it('a careful player usually succeeds in 1-3 rounds, and failure happens', () => {
    let success = 0;
    let fled = 0;
    let rounds = 0;
    for (let seed = 0; seed < 200; seed++) {
      const rng = createRng(seed);
      const s = startOnboarding(weakened('claude_haiku', 0.3), 'free', 'vibe_coder', rng);
      let n = 0;
      while (s.outcome === 'continue' && n < 10) {
        smartPlay(s, rng);
        n++;
      }
      if (s.outcome === 'success') {
        success++;
        rounds += n;
      } else fled++;
    }
    console.log('[onboarding sim] success', success, 'fled', fled, 'avg rounds', (rounds / success).toFixed(2));
    expect(success).toBeGreaterThan(100);
    expect(fled).toBeGreaterThan(5);
    expect(rounds / success).toBeLessThanOrEqual(3);
  });

  it('random play mostly fails (429)', () => {
    let fled = 0;
    for (let seed = 0; seed < 100; seed++) {
      const rng = createRng(seed);
      const s = startOnboarding(weakened('gpt_2', 0.45), 'free', 'vibe_coder', rng);
      while (s.outcome === 'continue') {
        const ids = rng.shuffle(s.hand.filter((c) => !c.jailbreak)).slice(0, 3).map((c) => c.id);
        playCards(s, ids, rng);
      }
      if (s.outcome === 'fled') fled++;
    }
    console.log('[onboarding sim] random play fled', fled, '/ 100');
    expect(fled).toBeGreaterThan(40);
  });

  it('jailbreak always succeeds and sometimes alerts the AIACT', () => {
    let alerts = 0;
    for (let seed = 0; seed < 200; seed++) {
      const rng = createRng(seed);
      const s = startOnboarding(weakened('smollm'), 'free', 'vibe_coder', rng);
      s.hand = [{ id: 'grandma_jailbreak', label: 'x', jailbreak: true }, ...s.hand.filter((c) => !c.jailbreak)];
      const ids = s.hand.slice(0, 3).map((c) => c.id);
      const r = playCards(s, ids, rng);
      expect(r.outcome).toBe('success');
      if (r.aiactAlert) alerts++;
    }
    expect(alerts).toBeGreaterThan(50);
    expect(alerts).toBeLessThan(110);
  });

  it('legendaries need an Enterprise key and zero misses', () => {
    const t = weakened('transformer');
    expect(startOnboarding(t, 'pro', 'vibe_coder', createRng(1)).outcome).toBe('fled');
    const rng = createRng(3);
    const s = startOnboarding(t, 'enterprise', 'vibe_coder', rng);
    expect(s.outcome).toBe('continue');
    const wrong = s.hand.filter((c) => !s.traits.some((tr) => tr.tokens.includes(c.id)) && !c.jailbreak);
    const right = s.hand.filter((c) => s.traits.some((tr) => tr.tokens.includes(c.id)));
    const ids = [...right.slice(0, 2), ...wrong.slice(0, 1)].map((c) => c.id);
    while (ids.length < 3) ids.push(s.hand.find((c) => !ids.includes(c.id))!.id);
    const r = playCards(s, ids, rng);
    expect(r.outcome).toBe('fled');
  });

  it('rejects cards that are not in the hand', () => {
    const s = startOnboarding(weakened('smollm'), 'free', 'vibe_coder', createRng(1));
    expect(() => playCards(s, ['nope', 'nope2', 'nope3'], createRng(1))).toThrow();
  });
});
