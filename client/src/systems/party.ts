// Party and move ordering. Pure: the UI calls these, then saves.
// Slot 0 of the party is the PokAI sent first in battle (the engine picks the first one still standing).
import type { PokaiInstance } from '../state/types';
import { isFainted } from './pokai';

/** Why a given order is refused, or null when it is fine. */
export function leadProblem(party: readonly PokaiInstance[]): string | null {
  const lead = party[0];
  if (lead && isFainted(lead) && party.some((p) => !isFainted(p))) {
    return 'Un PokAI hors service ne peut pas ouvrir le combat : un autre est encore en état de se battre.';
  }
  return null;
}

/** Moves the element at `from` so that it ends up at index `to` (others shift). Returns false if out of range / no-op. */
export function reorder<T>(list: T[], from: number, to: number): boolean {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return false;
  const [item] = list.splice(from, 1);
  if (item === undefined) return false;
  list.splice(to, 0, item);
  return true;
}

/** Puts the PokAI first. Refused (false) when it is KO while a teammate could still fight. */
export function makeLead(party: PokaiInstance[], uid: string): boolean {
  const i = party.findIndex((p) => p.uid === uid);
  const p = party[i];
  if (!p || i < 0) return false;
  if (isFainted(p) && party.some((x) => !isFainted(x))) return false;
  if (i > 0) reorder(party, i, 0);
  return true;
}

/** Index of the PokAI that opens a battle: the first one not fainted (-1 if all are). */
export function leadIndex(party: readonly PokaiInstance[]): number {
  return party.findIndex((p) => !isFainted(p));
}

/** Reorders the move list (the order is the prompt-bar order in battle). */
export function reorderMoves(p: PokaiInstance, from: number, to: number): boolean {
  return reorder(p.moves, from, to);
}
