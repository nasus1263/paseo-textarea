import * as edit from "./edit";

export interface KeyInfo {
  key: string;
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
  meta: boolean;
}

/**
 * Maps a keydown in the composer to an edit, or null to leave the key to Paseo. Enter, Tab and
 * the arrows are left alone while the autocomplete popover is open.
 * Only Shift+Enter is handled; plain Enter and Ctrl+Enter always stay Paseo's.
 */
export function editForKey(
  text: string,
  start: number,
  end: number,
  k: KeyInfo,
  popoverOpen: boolean,
): edit.Edit | null {
  const letter = k.key.length === 1 ? k.key.toLowerCase() : k.key;

  if (k.ctrl && !k.alt && !k.meta && !k.shift) {
    if (letter === "d") return edit.deleteLine(text, start, end);
    if (letter === "l") return edit.toggleBullet(text, start, end);
    if (letter === " ") return edit.selectLines(text, start, end);
    return null;
  }
  if (k.ctrl || k.meta) return null;

  if (k.alt) {
    if (k.ctrl || k.shift) return null;
    if (k.key === "ArrowUp") return edit.moveLine(text, start, end, -1);
    if (k.key === "ArrowDown") return edit.moveLine(text, start, end, 1);
    return null;
  }

  if (k.key === "Tab") {
    if (popoverOpen) return null;
    return k.shift ? edit.dedent(text, start, end) : edit.indent(text, start, end);
  }
  if (k.key === "Enter") {
    if (popoverOpen || !k.shift) return null;
    return edit.newline(text, start, end);
  }

  if (k.key.length !== 1) return null;
  return (
    edit.skipClose(text, start, end, k.key) ??
    edit.wrapSelection(text, start, end, k.key) ??
    (k.key === "`" ? edit.fence(text, start, end) : null) ??
    edit.autoClose(text, start, end, k.key)
  );
}
