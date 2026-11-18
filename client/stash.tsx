import { type PluginComposerItemProps, useRpc } from "@getpaseo/plugin/client";
import { useToast } from "@getpaseo/plugin/client/ui";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Platform, Pressable, ScrollView, Text, View } from "react-native";
import { type StashItem, stashListRpc, stashPopRpc, stashPushRpc, stashRows } from "../shared/stash";
import { apply, composerOf, type DomTextarea, listKeys, onComposerFocus, onStashKey, workspaceKey } from "./web";

const AGO_WIDTH = 92;

/**
 * Stash for the message composer, kept per workspace. Ctrl+S stashes the selection or, with nothing
 * selected, the whole prompt. On an empty prompt it brings one back: directly when there is one,
 * from a list when there are several. "stash N" under the composer opens the same list.
 */
export function StashItemView(props: PluginComposerItemProps) {
  // Ctrl+S and restoring both edit the composer through the page, so stash is desktop and web only.
  return Platform.OS === "web" ? <StashWeb {...props} /> : null;
}

function StashWeb({ theme }: PluginComposerItemProps) {
  const root = useRef<View>(null);
  const listRef = useRef<View>(null);
  const toast = useToast();
  const list = useRpc(stashListRpc);
  const push = useRpc(stashPushRpc);
  const pop = useRpc(stashPopRpc);
  const [items, setItems] = useState<StashItem[]>([]);
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const [now, setNow] = useState(() => Date.now() / 1000);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const refresh = useCallback(async () => {
    try {
      setItems((await list({ key: workspaceKey() })).items);
    } catch {
      // The count is a hint; the next stash or focus tries again.
    }
  }, [list]);

  const restore = useCallback(
    async (index: number) => {
      setOpen(false);
      const el = composerOf(root.current);
      if (!el) return;
      const key = workspaceKey();
      const current = el.value;
      try {
        const taken = await pop({ key, index });
        setItems(taken.items);
        if (!taken.item) return;
        // Bringing one back never loses what was being written: it is stashed in its place.
        if (current.trim()) setItems((await push({ key, text: current })).items);
        const text = taken.item.text;
        el.focus();
        apply(el, { value: text, start: text.length, end: text.length });
        toast.show(current.trim() ? "unstash 했습니다. 쓰던 내용은 stash 했습니다." : "unstash 했습니다.");
      } catch {
        toast.error("stash를 불러오지 못했습니다.");
      }
    },
    [pop, push, toast],
  );

  const openList = useCallback(() => {
    setNow(Date.now() / 1000);
    setCursor(0);
    setOpen(true);
  }, []);

  const stash = useCallback(
    async (el: DomTextarea) => {
      const key = workspaceKey();
      const { value, selectionStart: start, selectionEnd: end } = el;
      const text = start !== end ? value.slice(start, end) : value;
      if (!text.trim()) {
        let stashed = itemsRef.current;
        try {
          stashed = (await list({ key })).items;
          setItems(stashed);
        } catch {
          // Fall back to the count already shown.
        }
        if (!stashed.length) toast.show("stash한 내용이 없습니다.");
        else if (stashed.length === 1) void restore(0);
        else openList();
        return;
      }
      try {
        setItems((await push({ key, text })).items);
      } catch {
        toast.error("stash하지 못했습니다.");
        return;
      }
      if (start !== end) apply(el, { value: value.slice(0, start) + value.slice(end), start, end: start });
      else apply(el, { value: "", start: 0, end: 0 });
      toast.show(start !== end ? "고른 부분을 stash 했습니다." : "stash 했습니다.");
    },
    [list, push, restore, openList, toast],
  );

  useEffect(() => {
    void refresh();
    const offFocus = onComposerFocus(() => root.current, () => void refresh());
    const offKey = onStashKey(() => root.current, (el) => void stash(el));
    return () => {
      offFocus();
      offKey();
    };
  }, [refresh, stash]);

  const rows = useMemo(() => stashRows(items, now), [items, now]);
  const picks = useMemo(() => rows.flatMap((row) => (row.kind === "item" ? [row.index] : [])), [rows]);

  useEffect(() => {
    if (!open) return;
    return listKeys(listRef.current, (key) => {
      if (key === "escape") {
        setOpen(false);
        composerOf(root.current)?.focus();
      } else if (key === "enter") void restore(picks[cursor] ?? 0);
      else setCursor((c) => Math.max(0, Math.min(picks.length - 1, c + (key === "down" ? 1 : -1))));
    });
  }, [open, picks, cursor, restore]);

  const styles = useMemo(
    () => ({
      root: { position: "relative" as const },
      label: { color: theme.colors.foregroundMuted, fontSize: 12, paddingHorizontal: 4 },
      list: {
        position: "absolute" as const,
        bottom: 24,
        left: 0,
        width: 420,
        maxHeight: 280,
        zIndex: 20,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface1,
        paddingVertical: 4,
        shadowColor: "#000",
        shadowOpacity: 0.18,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 3 },
      },
      row: { flexDirection: "row" as const, paddingHorizontal: 10, paddingVertical: 4, gap: 10 },
      ago: { width: AGO_WIDTH, textAlign: "right" as const, color: theme.colors.foregroundMuted, fontSize: 12, fontVariant: ["tabular-nums" as const] },
      gap: { width: AGO_WIDTH, textAlign: "center" as const, color: theme.colors.foregroundMuted, fontSize: 12, lineHeight: 12 },
      text: { flex: 1, color: theme.colors.foreground, fontSize: 13 },
      hint: { color: theme.colors.foregroundMuted, fontSize: 11, paddingHorizontal: 10, paddingTop: 4 },
    }),
    [theme],
  );

  if (!items.length) return <View ref={root} />;
  const selected = picks[cursor];
  return (
    <View ref={root} style={styles.root}>
      <Pressable accessibilityRole="button" accessibilityLabel={`stash ${items.length}개, 눌러서 되돌리기`} onPress={() => (open ? setOpen(false) : items.length === 1 ? void restore(0) : openList())}>
        <Text style={styles.label}>{`stash ${items.length}`}</Text>
      </Pressable>
      {open && (
        <View ref={listRef} style={styles.list}>
          <ScrollView>
            {rows.map((row, i) =>
              row.kind === "gap" ? (
                <View key={`gap-${i}`} style={styles.row}>
                  <Text style={styles.gap}>⋮</Text>
                </View>
              ) : (
                <Pressable
                  key={`item-${row.index}`}
                  onPress={() => void restore(row.index)}
                  onHoverIn={() => setCursor(picks.indexOf(row.index))}
                  style={[styles.row, row.index === selected && { backgroundColor: theme.colors.surface2 }]}
                >
                  <Text style={styles.ago}>{row.ago}</Text>
                  <Text style={styles.text} numberOfLines={1}>
                    {row.preview}
                  </Text>
                </Pressable>
              ),
            )}
          </ScrollView>
          <Text style={styles.hint}>↑↓ 이동 · Enter 불러오기 · Esc 닫기</Text>
        </View>
      )}
    </View>
  );
}
