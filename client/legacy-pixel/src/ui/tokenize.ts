// Splits text into LLM-ish "tokens" for token-by-token display.
// Invariant: tokenize(s).join('') === s.
// Leading whitespace sticks to the following word (" utilise"), long words are
// split into sub-word chunks so typing feels like streaming output.

const CHUNK = 4;

export function tokenize(text: string): string[] {
  const out: string[] = [];
  const re = /(\s*)(\S+)|(\s+)$/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m[3] !== undefined) {
      out.push(m[3]);
      break;
    }
    const ws = m[1] ?? '';
    const word = m[2] ?? '';
    if (word.length <= CHUNK + 2) {
      out.push(ws + word);
      continue;
    }
    // first chunk carries the whitespace
    out.push(ws + word.slice(0, CHUNK));
    for (let i = CHUNK; i < word.length; i += CHUNK) {
      const rest = word.length - i;
      // avoid a dangling 1-2 char tail
      if (rest <= CHUNK + 2) {
        out.push(word.slice(i));
        break;
      }
      out.push(word.slice(i, i + CHUNK));
    }
  }
  return out;
}
