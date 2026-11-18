import assert from "node:assert/strict";
import test from "node:test";
import { formatAgo, stashRows, LIST_GAP_S } from "../shared/stash.ts";

test("formatAgo drops seconds and shows two units", () => {
  assert.equal(formatAgo(1000, 1030), "0m ago");
  assert.equal(formatAgo(0, 90 * 60), "1h 30m ago");
  assert.equal(formatAgo(0, 2 * 3600), "2h ago");
  assert.equal(formatAgo(0, 8 * 24 * 3600), "1w 1d ago");
});
test("stashRows puts a gap between items far apart", () => {
  const now = 100000;
  const rows = stashRows(
    [
      { text: "a\n b", ts: now - 60 },
      { text: "c", ts: now - 120 },
      { text: "d", ts: now - 120 - LIST_GAP_S },
    ],
    now,
  );
  assert.deepEqual(
    rows.map((r) => (r.kind === "gap" ? "⋮" : `${r.index}:${r.preview}`)),
    ["0:a b", "1:c", "⋮", "2:d"],
  );
});
