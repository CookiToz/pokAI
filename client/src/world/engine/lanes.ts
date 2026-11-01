// Pure helpers for data-lane packet animation: find the contiguous runs of lane tiles.

export interface LaneRun {
  /** 'x' = tiles (from..to, fixed) along gx; 'y' = tiles (fixed, from..to) along gy. Inclusive bounds. */
  axis: 'x' | 'y';
  fixed: number;
  from: number;
  to: number;
}

/** Group lane tiles into straight runs. Each tile joins the axis along which its contiguous run is longer (ties: x). */
export function laneRuns(isLane: (x: number, y: number) => boolean, width: number, height: number): LaneRun[] {
  const hLen = new Map<number, number>();
  const vLen = new Map<number, number>();
  const key = (x: number, y: number): number => y * width + x;
  for (let y = 0; y < height; y++) {
    let x = 0;
    while (x < width) {
      if (!isLane(x, y)) {
        x++;
        continue;
      }
      let e = x;
      while (e + 1 < width && isLane(e + 1, y)) e++;
      for (let i = x; i <= e; i++) hLen.set(key(i, y), e - x + 1);
      x = e + 1;
    }
  }
  for (let x = 0; x < width; x++) {
    let y = 0;
    while (y < height) {
      if (!isLane(x, y)) {
        y++;
        continue;
      }
      let e = y;
      while (e + 1 < height && isLane(x, e + 1)) e++;
      for (let i = y; i <= e; i++) vLen.set(key(x, i), e - y + 1);
      y = e + 1;
    }
  }
  const axisOf = (x: number, y: number): 'x' | 'y' => ((hLen.get(key(x, y)) ?? 0) >= (vLen.get(key(x, y)) ?? 0) ? 'x' : 'y');
  const runs: LaneRun[] = [];
  for (let y = 0; y < height; y++) {
    let x = 0;
    while (x < width) {
      if (!isLane(x, y) || axisOf(x, y) !== 'x') {
        x++;
        continue;
      }
      let e = x;
      while (e + 1 < width && isLane(e + 1, y) && axisOf(e + 1, y) === 'x') e++;
      if (e > x) runs.push({ axis: 'x', fixed: y, from: x, to: e });
      x = e + 1;
    }
  }
  for (let x = 0; x < width; x++) {
    let y = 0;
    while (y < height) {
      if (!isLane(x, y) || axisOf(x, y) !== 'y') {
        y++;
        continue;
      }
      let e = y;
      while (e + 1 < height && isLane(x, e + 1) && axisOf(x, e + 1) === 'y') e++;
      if (e > y) runs.push({ axis: 'y', fixed: x, from: y, to: e });
      y = e + 1;
    }
  }
  return runs;
}

/** Position of a packet along a run after `t` seconds (wraps). `dir` = +1 or -1. Returns grid coordinates. */
export function packetPos(run: LaneRun, phase: number, speed: number, dir: 1 | -1, t: number): { x: number; y: number } {
  const span = run.to - run.from + 1;
  let u = (phase + dir * speed * t) % span;
  if (u < 0) u += span;
  const p = run.from - 0.5 + u;
  return run.axis === 'x' ? { x: p, y: run.fixed } : { x: run.fixed, y: p };
}
