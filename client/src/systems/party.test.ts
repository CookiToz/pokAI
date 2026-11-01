import { describe, expect, it } from 'vitest';
import { createPokai } from './pokai';
import { leadIndex, leadProblem, makeLead, reorder, reorderMoves } from './party';
import { createRng } from './rng';

const team = () => {
  const rng = createRng(3);
  return [createPokai('claude_haiku', 10, rng), createPokai('smollm', 8, rng), createPokai('gemma', 6, rng)];
};

describe('party order', () => {
  it('reorder moves one element and shifts the others', () => {
    const a = [1, 2, 3, 4];
    expect(reorder(a, 3, 0)).toBe(true);
    expect(a).toEqual([4, 1, 2, 3]);
    expect(reorder(a, 1, 1)).toBe(false);
    expect(reorder(a, 0, 9)).toBe(false);
  });

  it('makeLead puts a PokAI in slot 1 and keeps the rest in order', () => {
    const t = team();
    const [a, b, c] = t;
    expect(makeLead(t, c!.uid)).toBe(true);
    expect(t.map((p) => p.uid)).toEqual([c!.uid, a!.uid, b!.uid]);
  });

  it('refuses a fainted lead while a teammate can fight, and the battle opens with the first healthy one', () => {
    const t = team();
    const [a, b] = t;
    b!.context = 0;
    expect(makeLead(t, b!.uid)).toBe(false);
    expect(t[0]).toBe(a);
    a!.context = 0;
    expect(leadProblem(t)).not.toBeNull();
    expect(leadIndex(t)).toBe(2);
    t.forEach((p) => (p.context = 0));
    expect(leadProblem(t)).toBeNull(); // everybody KO: nothing to prefer
    expect(makeLead(t, t[2]!.uid)).toBe(true);
  });

  it('reorders moves in place', () => {
    const p = createPokai('claude_haiku', 14, createRng(1));
    const ids = p.moves.map((m) => m.move);
    expect(reorderMoves(p, 3, 0)).toBe(true);
    expect(p.moves.map((m) => m.move)).toEqual([ids[3], ids[0], ids[1], ids[2]]);
  });
});
