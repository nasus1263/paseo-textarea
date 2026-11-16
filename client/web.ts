import { Platform } from "react-native";
import { type Edit, lineAt, deleteLine, pasteLineAbove } from "../shared/edit";
import { editForKey } from "../shared/keys";

// This plugin typechecks without the DOM library. Declare only what this module uses.
interface DomTextarea {
  value: string;
  selectionStart: number;
  selectionEnd: number;
  setSelectionRange(start: number, end: number): void;
  hasAttribute(name: string): boolean;
  dispatchEvent(event: unknown): boolean;
}
interface DomEvent {
  target: unknown;
  preventDefault(): void;
  stopPropagation(): void;
}
interface DomKeyEvent extends DomEvent {
  key: string;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  metaKey: boolean;
  isComposing: boolean;
}
interface DomClipboardEvent extends DomEvent {
  clipboardData: { getData(type: string): string; setData(type: string, data: string): void } | null;
}
declare const window: {
  addEventListener(type: string, listener: (event: never) => void, capture: boolean): void;
  removeEventListener(type: string, listener: (event: never) => void, capture: boolean): void;
  HTMLTextAreaElement: { prototype: object };
};
declare const document: {
  execCommand(command: string, showUi: boolean, value?: string): boolean;
  querySelector(selector: string): unknown;
};
declare class Event {
  constructor(type: string, init?: { bubbles?: boolean });
}

const COMPOSER = "data-composer-input";
const POPOVER = '[data-testid="composer-autocomplete-popover"]';

function composer(target: unknown): DomTextarea | null {
  const el = target as DomTextarea | null;
  return el && typeof el.hasAttribute === "function" && el.hasAttribute(COMPOSER) ? el : null;
}

/** Writes `next` into the textarea so the browser keeps undo history and the app sees an input event. */
function apply(el: DomTextarea, next: Edit): void {
  const old = el.value;
  if (old !== next.value) {
    let p = 0;
    const max = Math.min(old.length, next.value.length);
    while (p < max && old[p] === next.value[p]) p++;
    let s = 0;
    while (s < max - p && old[old.length - 1 - s] === next.value[next.value.length - 1 - s]) s++;
    const inserted = next.value.slice(p, next.value.length - s);
    el.setSelectionRange(p, old.length - s);
    const done = inserted ? document.execCommand("insertText", false, inserted) : document.execCommand("delete", false);
    if (!done || el.value !== next.value) {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set;
      setter?.call(el, next.value);
      el.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }
  el.setSelectionRange(next.start, next.end);
}

/** Installs the editing keys on the message composer. Web and desktop only. */
export function installTextareaKeys(): () => void {
  if (Platform.OS !== "web") return () => {};
  let lineClip: string | null = null;

  const keydown = (event: DomKeyEvent) => {
    const el = composer(event.target);
    if (!el || event.isComposing) return;
    const next = editForKey(
      el.value,
      el.selectionStart,
      el.selectionEnd,
      { key: event.key, ctrl: event.ctrlKey, shift: event.shiftKey, alt: event.altKey, meta: event.metaKey },
      document.querySelector(POPOVER) !== null,
    );
    if (!next) return;
    event.preventDefault();
    event.stopPropagation();
    apply(el, next);
  };

  // Copy or cut with nothing selected takes the whole cursor line.
  const copyOrCut = (cut: boolean) => (event: DomClipboardEvent) => {
    const el = composer(event.target);
    if (!el || el.selectionStart !== el.selectionEnd || !event.clipboardData) {
      lineClip = null;
      return;
    }
    const clip = lineAt(el.value, el.selectionStart) + "\n";
    event.clipboardData.setData("text/plain", clip);
    event.preventDefault();
    lineClip = clip;
    if (cut) apply(el, deleteLine(el.value, el.selectionStart, el.selectionEnd));
  };

  const paste = (event: DomClipboardEvent) => {
    const el = composer(event.target);
    if (!el || lineClip === null || el.selectionStart !== el.selectionEnd) return;
    if (event.clipboardData?.getData("text/plain") !== lineClip) return;
    event.preventDefault();
    event.stopPropagation();
    apply(el, pasteLineAbove(el.value, el.selectionStart, lineClip));
  };

  const copy = copyOrCut(false);
  const cut = copyOrCut(true);
  window.addEventListener("keydown", keydown, true);
  window.addEventListener("copy", copy, true);
  window.addEventListener("cut", cut, true);
  window.addEventListener("paste", paste, true);
  return () => {
    window.removeEventListener("keydown", keydown, true);
    window.removeEventListener("copy", copy, true);
    window.removeEventListener("cut", cut, true);
    window.removeEventListener("paste", paste, true);
  };
}
