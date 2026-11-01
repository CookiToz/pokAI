// Shared "where to go" marker: written by the objectives HUD, read by the minimap (star on the target or exit).
export interface ObjectiveMarker {
  map: string;
  x: number;
  y: number;
  /** true when the marker is the exit leading toward the real target */
  exit: boolean;
}

let marker: ObjectiveMarker | null = null;

export function setObjectiveMarker(m: ObjectiveMarker | null): void {
  marker = m;
}

export function getObjectiveMarker(): ObjectiveMarker | null {
  return marker;
}
