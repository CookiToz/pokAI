// Pure formatting helpers (no Phaser). Tested in format.test.ts.

/** French digit grouping with a plain space (pixel fonts lack U+202F). */
export function fmtInt(n: number): string {
  const sign = n < 0 ? '-' : '';
  const digits = String(Math.floor(Math.abs(n)));
  let out = '';
  for (let i = 0; i < digits.length; i++) {
    if (i > 0 && (digits.length - i) % 3 === 0) out += ' ';
    out += digits[i];
  }
  return sign + out;
}

export function fmtCredits(n: number): string {
  return `${fmtInt(n)} cr`;
}

export function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(1, v));
}

export function pct(ratio: number): number {
  return Math.round(clamp01(ratio) * 100);
}

/** Terminal progress bar: progressBar(0.67, 6) -> "████░░". */
export function progressBar(ratio: number, width: number): string {
  const filled = Math.round(clamp01(ratio) * width);
  return '█'.repeat(filled) + '░'.repeat(width - filled);
}

/** Left-pad / right-pad without String.padStart surprises on negative widths. */
export function padRight(s: string, width: number): string {
  return s.length >= width ? s : s + ' '.repeat(width - s.length);
}
export function padLeft(s: string, width: number): string {
  return s.length >= width ? s : ' '.repeat(width - s.length) + s;
}

/**
 * Greedy word wrap for monospace text. Words longer than a line are hard-split.
 * Explicit "\n" are kept as line breaks.
 */
export function wrapText(text: string, maxChars: number): string[] {
  const width = Math.max(1, Math.floor(maxChars));
  const out: string[] = [];
  for (const para of text.split('\n')) {
    let line = '';
    for (const word of para.split(' ')) {
      let w = word;
      while (w.length > width) {
        if (line.length > 0) {
          out.push(line);
          line = '';
        }
        out.push(w.slice(0, width));
        w = w.slice(width);
      }
      if (line.length === 0) line = w;
      else if (line.length + 1 + w.length <= width) line += ' ' + w;
      else {
        out.push(line);
        line = w;
      }
    }
    out.push(line);
  }
  return out;
}

/** Colour band for an HP ratio. */
export function hpBand(ratio: number): 'high' | 'mid' | 'low' {
  if (ratio > 0.5) return 'high';
  if (ratio > 0.2) return 'mid';
  return 'low';
}
