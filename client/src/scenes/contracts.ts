// Data passed between scenes via scene.launch(key, data).
// Pattern: the caller pauses itself, launches the overlay scene with an onDone callback;
// the overlay calls onDone(...) then stops itself; the caller resumes.
import type { PokaiInstance } from '../state/types';

export interface BattleSceneData {
  kind: 'wild' | 'trainer';
  wild?: { form: string; level: number }; // when kind = 'wild'
  trainerId?: string; // when kind = 'trainer'
  canFlee: boolean;
  onDone: (result: BattleOutcome) => void;
}

export type BattleOutcome =
  | { kind: 'won' }
  | { kind: 'lost' } // party wiped: overworld warps to last hub and heals
  | { kind: 'fled' }
  | { kind: 'onboarded'; pokai: PokaiInstance };

export interface OnboardingSceneData {
  target: PokaiInstance; // weakened wild PokAI
  keyItem: string; // Item.id of the API key spent
  onDone: (result: { success: boolean; fled: boolean }) => void;
}

export interface EvolutionSceneData {
  pokaiUid: string;
  options: string[]; // Form.id; >1 = branching choice
  onDone: (evolvedTo: string | null) => void; // null = player cancelled ("rester sur la version stable")
}

export interface DialogueSceneData {
  scriptId: string;
  onDone: () => void;
}

export interface SimpleOverlayData {
  onDone: () => void;
}
