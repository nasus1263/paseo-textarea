import { Platform } from "react-native";
import { type Edit, lineAt, deleteLine, pasteLineAbove } from "../shared/edit";
import { editForKey } from "../shared/keys";

// This plugin typechecks without the DOM library. Declare only what this module uses.
export interface DomTextarea {
  value: string;
  focus(): void;
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
interface DomElement {
  parentElement: DomElement | null;
  querySelector(selector: string): unknown;
  contains(other: unknown): boolean;
  setAttribute(name: string, value: string): void;
  focus(): void;
}
declare const window: {
  location: { pathname: string };
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
/**
 * Other plugins' text fields opt in to the editing keys with this attribute. In React Native Web,
 * pass `dataSet={{ paseoTextarea: "" }}` to the TextInput. The stash stays composer-only.
 */
const OPT_IN = "data-paseo-textarea";
const POPOVER = '[data-testid="composer-autocomplete-popover"]';

/** The textarea the editing keys work in: the message composer, or a field that opted in. */
function editable(target: unknown): DomTextarea | null {
  const el = target as DomTextarea | null;
  return el && typeof el.hasAttribute === "function" && (el.hasAttribute(COMPOSER) || el.hasAttribute(OPT_IN)) ? el : null;
}

/** Writes `next` into the textarea so the browser keeps undo history and the app sees an input event. */
export function apply(el: DomTextarea, next: Edit): void {
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

/** Installs the editing keys on the message composer and on opted-in fields. Web and desktop only. */
export function installTextareaKeys(): () => void {
  if (Platform.OS !== "web") return () => {};
  let lineClip: string | null = null;

  const keydown = (event: DomKeyEvent) => {
    const el = editable(event.target);
    if (!el || event.isComposing) return;
    if (event.ctrlKey && !event.altKey && !event.metaKey && !event.shiftKey && event.key.toLowerCase() === "s") {
      const handler = stashHandlers.find((h) => h.composer() === el);
      if (!handler) return;
      event.preventDefault();
      event.stopPropagation();
      handler.onStash(el);
      return;
    }
    const next = editForKey(
      el.value,
      el.selectionStart,
      el.selectionEnd,
      { key: event.key, ctrl: event.ctrlKey, shift: event.shiftKey, alt: event.altKey, meta: event.metaKey },
      el.hasAttribute(COMPOSER) && document.querySelector(POPOVER) !== null,
    );
    if (!next) return;
    event.preventDefault();
    event.stopPropagation();
    apply(el, next);
  };

  // Copy or cut with nothing selected takes the whole cursor line.
  const copyOrCut = (cut: boolean) => (event: DomClipboardEvent) => {
    const el = editable(event.target);
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
    const el = editable(event.target);
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

interface StashHandler {
  composer(): DomTextarea | null;
  onStash(el: DomTextarea): void;
}
const stashHandlers: StashHandler[] = [];

/** The composer textarea that `node` (a View inside the composer) belongs to. */
export function composerOf(node: unknown): DomTextarea | null {
  if (Platform.OS !== "web") return null;
  let el = node as DomElement | null;
  for (let depth = 0; el && depth < 12; depth++, el = el.parentElement) {
    const found = el.querySelector(`[${COMPOSER}]`);
    if (found) return found as DomTextarea;
  }
  return null;
}

/** Routes Ctrl+S in the composer that `node` sits in to `onStash`. */
export function onStashKey(node: () => unknown, onStash: (el: DomTextarea) => void): () => void {
  const handler: StashHandler = { composer: () => composerOf(node()), onStash };
  stashHandlers.push(handler);
  return () => {
    const i = stashHandlers.indexOf(handler);
    if (i !== -1) stashHandlers.splice(i, 1);
  };
}

/** Calls `listener` whenever the composer that `node` sits in takes focus. */
export function onComposerFocus(node: () => unknown, listener: () => void): () => void {
  if (Platform.OS !== "web") return () => {};
  const focusin = (event: DomEvent) => {
    const el = composerOf(node());
    if (el && event.target === el) listener();
  };
  window.addEventListener("focusin", focusin, true);
  return () => window.removeEventListener("focusin", focusin, true);
}

/**
 * Which workspace the app is showing, read from its route (`/h/<host>/workspace/<id>`). Stashes are
 * kept under this key. An agent opened on its own (`/h/<host>/agent/<id>`) gets its own key.
 */
export function workspaceKey(): string {
  if (Platform.OS !== "web") return "global";
  const path = window.location.pathname;
  const ws = /\/h\/([^/]+)\/workspace\/([^/?#]+)/.exec(path);
  if (ws) return `${decodeURIComponent(ws[1])}/workspace/${decodeURIComponent(ws[2])}`;
  const agent = /\/h\/([^/]+)\/agent\/([^/?#]+)/.exec(path);
  if (agent) return `${decodeURIComponent(agent[1])}/agent/${decodeURIComponent(agent[2])}`;
  return "global";
}

/**
 * Keyboard for the stash list: focuses `node` so Paseo's composer keys (Enter sends) stay out of
 * it, and hands ArrowUp, ArrowDown, Enter and Escape pressed inside it to `onKey`.
 */
export function listKeys(node: unknown, onKey: (key: "up" | "down" | "enter" | "escape") => void): () => void {
  if (Platform.OS !== "web" || !node) return () => {};
  const el = node as DomElement;
  el.setAttribute("tabindex", "-1");
  el.focus();
  const keydown = (event: DomKeyEvent) => {
    if (!el.contains(event.target)) return;
    const key =
      event.key === "ArrowUp" ? "up" : event.key === "ArrowDown" ? "down" : event.key === "Enter" ? "enter" : event.key === "Escape" ? "escape" : null;
    if (!key) return;
    event.preventDefault();
    event.stopPropagation();
    onKey(key);
  };
  window.addEventListener("keydown", keydown, true);
  return () => window.removeEventListener("keydown", keydown, true);
}
