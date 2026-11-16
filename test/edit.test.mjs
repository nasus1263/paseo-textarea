import assert from "node:assert/strict";
import test from "node:test";
import * as e from "../shared/edit.ts";
import { editForKey } from "../shared/keys.ts";

const key = (k, mods = {}) => ({ key: k, ctrl: false, shift: false, alt: false, meta: false, ...mods });
// "|" marks the caret, "[" "]" mark a selection.
function parse(s) {
  const a = s.indexOf("["), b = s.indexOf("]");
  if (a !== -1) return { text: s.slice(0, a) + s.slice(a + 1, b) + s.slice(b + 1), start: a, end: b - 1 };
  const c = s.indexOf("|");
  return { text: s.replace("|", ""), start: c, end: c };
}
function show(r) {
  if (!r) return null;
  const v = r.value;
  return r.start === r.end
    ? v.slice(0, r.start) + "|" + v.slice(r.start)
    : v.slice(0, r.start) + "[" + v.slice(r.start, r.end) + "]" + v.slice(r.end);
}
const run = (s, k, mods, open = false) => {
  const { text, start, end } = parse(s);
  return show(editForKey(text, start, end, key(k, mods), open));
};

test("Enter continues bullets, numbers and indent", () => {
  assert.equal(run("- a|", "Enter"), "- a\n- |");
  assert.equal(run("2. a|", "Enter"), "2. a\n3. |");
  assert.equal(run("\tfoo|", "Enter"), "\tfoo\n\t|");
  assert.equal(run("plain|", "Enter"), null);
});
test("Enter on an empty marker or indent removes one level", () => {
  assert.equal(run("- |", "Enter"), "|");
  assert.equal(run("\t\t|", "Enter"), "\t|");
});
test("Ctrl+Enter and open popover are left to Paseo", () => {
  assert.equal(run("- a|", "Enter", { ctrl: true }), null);
  assert.equal(run("- a|", "Enter", {}, true), null);
});
test("Tab indents every selected line, Shift+Tab dedents or yields", () => {
  assert.equal(run("[a\nb]", "Tab"), "[\ta\n\tb]");
  assert.equal(run("\ta|", "Tab", { shift: true }), "a|");
  assert.equal(run("    a|", "Tab", { shift: true }), "a|");
  assert.equal(run("a|", "Tab", { shift: true }), null);
});
test("Ctrl+D deletes lines", () => {
  assert.equal(run("a\nb|\nc", "d", { ctrl: true }), "a\n|c");
  assert.equal(run("a\nb|", "d", { ctrl: true }), "a|");
  assert.equal(run("a|", "d", { ctrl: true }), "|");
});
test("Ctrl+L toggles bullets", () => {
  assert.equal(run("[a\nb]", "l", { ctrl: true }), "[- a\n- b]");
  assert.equal(run("[- a\n- b]", "l", { ctrl: true }), "[a\nb]");
});
test("Alt+Up/Down move lines", () => {
  assert.equal(run("a\nb|\nc", "ArrowUp", { alt: true }), "b|\na\nc".replace("b|", "b|"));
  assert.equal(run("a|\nb\nc", "ArrowDown", { alt: true }), "b\na|\nc");
  assert.equal(run("a|\nb", "ArrowUp", { alt: true }), null);
});
test("Ctrl+Space selects whole lines", () => {
  assert.equal(run("ab|c\ndef", " ", { ctrl: true }), "[abc]\ndef");
});
test("typing a pair over a selection wraps it", () => {
  assert.equal(run("[hi]", "("), "([hi])");
  assert.equal(run("``[hi]``", "`"), "```\n[hi]\n```");
});
test("opening brackets close themselves, third backtick opens a fence", () => {
  assert.equal(run("|", "("), "(|)");
  assert.equal(run("``|", "`"), "```|\n```");
  assert.equal(run("a``|", "`"), null);
});
test("whole-line paste goes above the cursor line", () => {
  const r = e.pasteLineAbove("a\nb", 3, "x\n");
  assert.equal(r.value, "a\nx\nb");
});
