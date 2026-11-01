// Pure rules of the Hub PC (Repo): moves between the party and the storage, filter and sort. No DOM.
import { db } from '../../data/db';
import type { TypeId } from '../../data/types';
import type { PokaiInstance } from '../../state/types';
import { displayName, isFainted } from '../../systems/pokai';

export const PARTY_MAX = 6;
export type Zone = 'party' | 'repo';
export interface Target { zone: Zone; uid?: string }
export interface MoveResult { ok: boolean; reason?: string; /** where the moved PokAI ended up */ zone?: Zone }

const LAST_CONSCIOUS = "Impossible : il doit rester au moins un modèle conscient dans l'équipe.";
const PARTY_FULL = 'Équipe pleine (6 modèles max). Dépose-en un avant de retirer celui-ci.';

const hasConscious = (list: PokaiInstance[]): boolean => list.some((p) => !isFainted(p));

/** Moves/swaps `srcUid` to `dst`, mutating `party` and `repo` in place only when the move is legal. */
export function applyMove(party: PokaiInstance[], repo: PokaiInstance[], srcUid: string, dst: Target): MoveResult {
  const pi = party.findIndex((p) => p.uid === srcUid);
  const ri = repo.findIndex((p) => p.uid === srcUid);
  if (pi < 0 && ri < 0) return { ok: false, reason: 'Modèle introuvable.' };
  const src = (pi >= 0 ? party[pi] : repo[ri])!;

  if (pi >= 0) {
    if (dst.zone === 'party') {
      const j = dst.uid ? party.findIndex((p) => p.uid === dst.uid) : party.length - 1;
      if (j < 0 || j === pi) return { ok: true, zone: 'party' };
      const other = party[j]!;
      party[j] = src;
      party[pi] = other;
      return { ok: true, zone: 'party' };
    }
    // party -> repo: deposit, or swap with a stored one
    const j = dst.uid ? repo.findIndex((p) => p.uid === dst.uid) : -1;
    const next = party.slice();
    if (j >= 0) next[pi] = repo[j]!;
    else next.splice(pi, 1);
    if (!hasConscious(next)) return { ok: false, reason: LAST_CONSCIOUS };
    if (j >= 0) {
      repo[j] = src;
      party[pi] = next[pi]!;
    } else {
      party.splice(pi, 1);
      repo.push(src);
    }
    return { ok: true, zone: 'repo' };
  }

  // repo -> ...
  if (dst.zone === 'repo') return { ok: true, zone: 'repo' };
  const j = dst.uid ? party.findIndex((p) => p.uid === dst.uid) : -1;
  if (j < 0) {
    if (party.length >= PARTY_MAX) return { ok: false, reason: PARTY_FULL };
    repo.splice(ri, 1);
    party.push(src);
    return { ok: true, zone: 'party' };
  }
  const next = party.slice();
  next[j] = src;
  if (!hasConscious(next)) return { ok: false, reason: LAST_CONSCIOUS };
  const out = party[j]!;
  party[j] = src;
  repo[ri] = out;
  return { ok: true, zone: 'party' };
}

export type SortKey = 'level' | 'name' | 'dex';
export interface RepoFilter { query: string; type: TypeId | 'all'; sort: SortKey }

const fold = (s: string): string => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function filterSort(list: PokaiInstance[], f: RepoFilter): PokaiInstance[] {
  const q = fold(f.query.trim());
  const out = list.filter((p) => {
    const form = db.form(p.form);
    if (f.type !== 'all' && !form.types.includes(f.type)) return false;
    if (!q) return true;
    return fold(displayName(p)).includes(q) || fold(form.name).includes(q) || fold(db.lineOfForm(p.form).publisher).includes(q);
  });
  const dex = (p: PokaiInstance): number => db.lineOfForm(p.form).dexNo * 10 + db.form(p.form).stage;
  const byName = (a: PokaiInstance, b: PokaiInstance): number => displayName(a).localeCompare(displayName(b), 'fr');
  out.sort(f.sort === 'level' ? (a, b) => b.level - a.level || byName(a, b) : f.sort === 'dex' ? (a, b) => dex(a) - dex(b) || b.level - a.level : byName);
  return out;
}
