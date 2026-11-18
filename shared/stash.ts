// Composer stash, ported from ming_helper's prompter. Stashes are kept per workspace, newest first.
import { defineRpc } from "@getpaseo/plugin";
import { z } from "zod";

export const stashItem = z.object({ text: z.string(), ts: z.number() });
export type StashItem = z.infer<typeof stashItem>;

export const stashListRpc = defineRpc({
  name: "stash.list",
  input: z.object({ key: z.string() }),
  output: z.object({ items: z.array(stashItem) }),
});
export const stashPushRpc = defineRpc({
  name: "stash.push",
  input: z.object({ key: z.string(), text: z.string() }),
  output: z.object({ items: z.array(stashItem) }),
});
/** Takes the item at `index` out of the list; `item` is null when it is already gone. */
export const stashPopRpc = defineRpc({
  name: "stash.pop",
  input: z.object({ key: z.string(), index: z.number().int() }),
  output: z.object({ item: stashItem.nullable(), items: z.array(stashItem) }),
});

/** Neighbouring items this far apart (seconds) get a `⋮` row between them, as in ming_helper. */
export const LIST_GAP_S = 3 * 3600;

const UNITS: [number, string][] = [
  [365 * 24 * 3600, "y"],
  [30 * 24 * 3600, "M"],
  [7 * 24 * 3600, "w"],
  [24 * 3600, "d"],
  [3600, "h"],
  [60, "m"],
];

/** Time since `then` (epoch seconds) in minutes and up: "0m ago", "1h 15m ago", "1M 2w ago". */
export function formatAgo(then: number, now: number): string {
  const delta = Math.floor(Math.max(0, now - then) / 60) * 60;
  for (let i = 0; i < UNITS.length; i++) {
    const [size, suffix] = UNITS[i];
    if (delta < size) continue;
    const count = Math.floor(delta / size);
    const next = UNITS[i + 1];
    const sub = next ? Math.floor((delta % size) / next[0]) : 0;
    return sub > 0 ? `${count}${suffix} ${sub}${next[1]} ago` : `${count}${suffix} ago`;
  }
  return "0m ago";
}

export type StashRow = { kind: "gap" } | { kind: "item"; index: number; ago: string; preview: string };

/** List rows: each item with its age, and a gap row wherever two neighbours are `LIST_GAP_S` apart. */
export function stashRows(items: readonly StashItem[], now: number): StashRow[] {
  const rows: StashRow[] = [];
  items.forEach((item, index) => {
    const prev = items[index - 1];
    if (prev && Math.abs(prev.ts - item.ts) >= LIST_GAP_S) rows.push({ kind: "gap" });
    rows.push({ kind: "item", index, ago: formatAgo(item.ts, now), preview: item.text.trim().replace(/\s+/g, " ") });
  });
  return rows;
}
