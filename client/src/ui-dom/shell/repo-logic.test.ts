import { describe, expect, it } from 'vitest';
import { db } from '../../data/db';
import { createPokai } from '../../systems/pokai';
import { createRng } from '../../systems/rng';
import { applyMove, filterSort } from './repo-logic';

const forms = db.allForms().filter((f) => db.lineOfForm(f.id).mvp).slice(0, 10);
const mk = (i: number, lvl = 10) => createPokai(forms[i % forms.length]!.id, lvl, createRng(i + 1));

describe('repo rules', () => {
  it('deposits and withdraws', () => {
    const party = [mk(0), mk(1)];
    const repo = [mk(2)];
    expect(applyMove(party, repo, party[1]!.uid, { zone: 'repo' }).ok).toBe(true);
    expect(party).toHaveLength(1);
    expect(repo).toHaveLength(2);
    expect(applyMove(party, repo, repo[0]!.uid, { zone: 'party' }).ok).toBe(true);
    expect(party).toHaveLength(2);
  });
  it('refuses to deposit the last conscious PokAI', () => {
    const a = mk(0);
    const b = mk(1);
    b.context = 0;
    const party = [a, b];
    const repo: typeof party = [];
    expect(applyMove(party, repo, a.uid, { zone: 'repo' }).ok).toBe(false);
    expect(party).toHaveLength(2);
    const stored = mk(2);
    stored.context = 0;
    expect(applyMove(party, [stored], a.uid, { zone: 'repo', uid: stored.uid }).ok).toBe(false);
  });
  it('refuses to overfill the party and swaps in place', () => {
    const party = [0, 1, 2, 3, 4, 5].map((i) => mk(i));
    const repo = [mk(6)];
    expect(applyMove(party, repo, repo[0]!.uid, { zone: 'party' }).ok).toBe(false);
    const incoming = repo[0]!;
    const out = party[2]!;
    expect(applyMove(party, repo, incoming.uid, { zone: 'party', uid: out.uid }).ok).toBe(true);
    expect(party[2]).toBe(incoming);
    expect(repo[0]).toBe(out);
  });
  it('filters and sorts', () => {
    const list = [mk(0, 5), mk(1, 30), mk(2, 12)];
    expect(filterSort(list, { query: '', type: 'all', sort: 'level' }).map((p) => p.level)).toEqual([30, 12, 5]);
    expect(filterSort(list, { query: 'zzzz', type: 'all', sort: 'name' })).toHaveLength(0);
  });
});
