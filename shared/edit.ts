// Pure text-editing logic ported from ming_helper's core/textarea.py. Every function takes the
// text and a selection and returns the edited text and selection, or null when it does not apply.
export interface Edit {
  value: string;
  start: number;
  end: number;
}

interface Replacement {
  from: number;
  to: number;
  text: string;
}

export const TAB_SPACES = 4;
export const WRAP_PAIRS: Record<string, string> = {
  "'": "'",
  '"': '"',
  "`": "`",
  "(": ")",
  "[": "]",
  "{": "}",
  "*": "*",
  _: "_",
  "~": "~",
  "<": ">",
};
export const AUTO_CLOSE: Record<string, string> = { "(": ")", "<": ">", "{": "}" };

const BULLET = "- ";
const BULLETS = [BULLET, "* ", "+ "];
const NUMBERED = /^(\d+)\. /;

/** Offsets of the first character of the first line and the end of the last line the selection touches. */
export function lineSpan(text: string, start: number, end: number): [number, number] {
  const ls = text.lastIndexOf("\n", start - 1) + 1;
  // A selection that ends at the very start of a later line does not include that line.
  const effEnd = end > start && (end === 0 || text[end - 1] === "\n") ? end - 1 : end;
  const nl = text.indexOf("\n", effEnd);
  return [ls, nl === -1 ? text.length : nl];
}

export function lineAt(text: string, pos: number): string {
  const [ls, le] = lineSpan(text, pos, pos);
  return text.slice(ls, le);
}

function leading(line: string): string {
  return line.slice(0, line.length - line.trimStart().length);
}

function trailingSpaces(s: string): number {
  return s.length - s.replace(/ +$/, "").length;
}

function mapPos(pos: number, edits: Replacement[], stickLeft = false): number {
  let shift = 0;
  for (const edit of edits) {
    const inserted = edit.from === edit.to;
    if (stickLeft && inserted ? pos > edit.to : pos >= edit.to) {
      shift += edit.text.length - (edit.to - edit.from);
    } else if (pos > edit.from) {
      return edit.from + shift + edit.text.length;
    } else {
      break;
    }
  }
  return pos + shift;
}

function applyEdits(text: string, start: number, end: number, edits: Replacement[]): Edit {
  let value = "";
  let at = 0;
  for (const edit of edits) {
    value += text.slice(at, edit.from) + edit.text;
    at = edit.to;
  }
  value += text.slice(at);
  return { value, start: mapPos(start, edits, start !== end), end: mapPos(end, edits) };
}

function eachLine(text: string, ls: number, le: number): { from: number; line: string }[] {
  const lines: { from: number; line: string }[] = [];
  let from = ls;
  for (const line of text.slice(ls, le).split("\n")) {
    lines.push({ from, line });
    from += line.length + 1;
  }
  return lines;
}

export function indent(text: string, start: number, end: number): Edit {
  const [ls, le] = lineSpan(text, start, end);
  const edits = eachLine(text, ls, le).map(({ from }) => ({ from, to: from, text: "\t" }));
  return applyEdits(text, start, end, edits);
}

export function dedent(text: string, start: number, end: number): Edit | null {
  const [ls, le] = lineSpan(text, start, end);
  const edits: Replacement[] = [];
  for (const { from, line } of eachLine(text, ls, le)) {
    const lead = leading(line);
    if (!lead) continue;
    const drop = lead.endsWith("\t")
      ? 1
      : Math.min(TAB_SPACES, trailingSpaces(lead));
    edits.push({ from: from + lead.length - drop, to: from + lead.length, text: "" });
  }
  return edits.length ? applyEdits(text, start, end, edits) : null;
}

export function selectLines(text: string, start: number, end: number): Edit {
  const [ls, le] = lineSpan(text, start, end);
  return { value: text, start: ls, end: le };
}

export function deleteLine(text: string, start: number, end: number): Edit {
  const [ls, le] = lineSpan(text, start, end);
  if (le < text.length) return { value: text.slice(0, ls) + text.slice(le + 1), start: ls, end: ls };
  if (ls > 0) {
    const pos = ls - 1;
    return { value: text.slice(0, pos), start: pos, end: pos };
  }
  return { value: "", start: 0, end: 0 };
}

export function toggleBullet(text: string, start: number, end: number): Edit {
  const [ls, le] = lineSpan(text, start, end);
  const lines = eachLine(text, ls, le);
  const bulletOf = (line: string) => BULLETS.find((p) => line.trimStart().startsWith(p)) ?? null;
  const nonEmpty = lines.filter(({ line }) => line.trim());
  const checked = nonEmpty.length ? nonEmpty : lines;
  const allBulleted = checked.every(({ line }) => bulletOf(line) !== null);
  const edits: Replacement[] = [];
  for (const { from, line } of lines) {
    const bullet = bulletOf(line);
    const at = from + leading(line).length;
    if (allBulleted) {
      if (bullet) edits.push({ from: at, to: at + bullet.length, text: "" });
    } else if (!bullet && (line.trim() || !nonEmpty.length)) {
      edits.push({ from: at, to: at, text: BULLET });
    }
  }
  return applyEdits(text, start, end, edits);
}

export function moveLine(text: string, start: number, end: number, direction: -1 | 1): Edit | null {
  const [ls, le] = lineSpan(text, start, end);
  const block = text.slice(ls, le);
  if (direction < 0) {
    if (ls === 0) return null;
    const prevStart = text.lastIndexOf("\n", ls - 2) + 1;
    const prev = text.slice(prevStart, ls - 1);
    const shift = -(prev.length + 1);
    return {
      value: text.slice(0, prevStart) + block + "\n" + prev + text.slice(le),
      start: start + shift,
      end: end + shift,
    };
  }
  if (le >= text.length) return null;
  const nl = text.indexOf("\n", le + 1);
  const nextEnd = nl === -1 ? text.length : nl;
  const next = text.slice(le + 1, nextEnd);
  const shift = next.length + 1;
  return {
    value: text.slice(0, ls) + next + "\n" + block + text.slice(nextEnd),
    start: start + shift,
    end: end + shift,
  };
}

/** Typing a quote or bracket over a selection wraps it, keeping the inside selected. */
export function wrapSelection(text: string, start: number, end: number, opening: string): Edit | null {
  const close = WRAP_PAIRS[opening];
  if (close === undefined || start === end) return null;
  const inner = text.slice(start, end);
  const fence = opening === "`" && text.slice(Math.max(0, start - 2), start) === "``" && text.slice(end, end + 2) === "``";
  const body = fence ? opening + "\n" + inner + "\n" + close : opening + inner + close;
  const innerStart = start + opening.length + (fence ? 1 : 0);
  return {
    value: text.slice(0, start) + body + text.slice(end),
    start: innerStart,
    end: innerStart + inner.length,
  };
}

/** The third backtick on an otherwise empty line also places the closing fence. */
export function fence(text: string, start: number, end: number): Edit | null {
  if (start !== end) return null;
  const [ls, le] = lineSpan(text, start, start);
  const line = text.slice(ls, le);
  const before = line.slice(0, start - ls);
  if (line.slice(start - ls).trim() || before !== leading(line) + "``") return null;
  const pad = leading(line);
  return {
    value: text.slice(0, start) + "`\n" + pad + "```" + text.slice(start),
    start: start + 1,
    end: start + 1,
  };
}

export function autoClose(text: string, start: number, end: number, opening: string): Edit | null {
  const close = AUTO_CLOSE[opening];
  if (close === undefined || start !== end) return null;
  return {
    value: text.slice(0, start) + opening + close + text.slice(end),
    start: start + 1,
    end: start + 1,
  };
}

/** Enter keeps indentation and list markers; on an empty marker or indent line it removes one level. */
export function newline(text: string, start: number, end: number): Edit | null {
  if (start !== end) return null;
  const [ls, le] = lineSpan(text, start, start);
  const line = text.slice(ls, le);
  const pad = leading(line);
  const body = line.slice(pad.length);
  const numbered = NUMBERED.exec(body);
  const marker = body.startsWith(BULLET) ? BULLET : numbered ? numbered[0] : "";
  const col = start - ls;

  if (marker && col >= pad.length + marker.length) {
    if (body.slice(marker.length).trim()) {
      const next = numbered ? `${Number(numbered[1]) + 1}. ` : BULLET;
      const ins = "\n" + pad + next;
      return {
        value: text.slice(0, start) + ins + text.slice(start),
        start: start + ins.length,
        end: start + ins.length,
      };
    }
    return replaceLine(text, ls, le, pad);
  }
  if (!pad) return null;
  if (line.trim()) {
    const ins = "\n" + pad;
    return {
      value: text.slice(0, start) + ins + text.slice(start),
      start: start + ins.length,
      end: start + ins.length,
    };
  }
  const drop = pad.endsWith("\t") ? 1 : Math.min(TAB_SPACES, trailingSpaces(pad));
  return replaceLine(text, ls, le, pad.slice(0, pad.length - drop));
}

function replaceLine(text: string, ls: number, le: number, replacement: string): Edit {
  const pos = ls + replacement.length;
  return { value: text.slice(0, ls) + replacement + text.slice(le), start: pos, end: pos };
}

/** Pasting a whole-line clip inserts it above the cursor line. */
export function pasteLineAbove(text: string, start: number, clip: string): Edit {
  const [ls] = lineSpan(text, start, start);
  return { value: text.slice(0, ls) + clip + text.slice(ls), start: start + clip.length, end: start + clip.length };
}

/** Typing a closing character that already sits right after the caret adds nothing. */
export function skipClose(text: string, start: number, end: number, typed: string): Edit | null {
  if (start !== end || !Object.values(AUTO_CLOSE).includes(typed) || text[start] !== typed) return null;
  return { value: text, start, end };
}
