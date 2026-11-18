import type { RpcInput } from "@getpaseo/plugin";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import type { StashItem, stashListRpc, stashPopRpc, stashPushRpc } from "../shared/stash";

type Store = Record<string, StashItem[]>;

function directory(): string {
  return join(process.env.PASEO_HOME || join(homedir(), ".paseo"), "plugin-data", "paseo-textarea");
}

async function load(): Promise<Store> {
  try {
    const parsed = JSON.parse(await readFile(join(directory(), "stash.json"), "utf8"));
    return parsed && typeof parsed === "object" ? (parsed as Store) : {};
  } catch (cause) {
    if ((cause as { code?: string }).code === "ENOENT") return {};
    throw cause;
  }
}

async function save(store: Store): Promise<void> {
  await mkdir(directory(), { recursive: true });
  const path = join(directory(), "stash.json");
  await writeFile(path + ".tmp", JSON.stringify(store, null, 2), "utf8");
  await rename(path + ".tmp", path);
}

// One request at a time so two quick stashes never overwrite each other.
let queue: Promise<unknown> = Promise.resolve();
function serial<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task, task);
  queue = run.catch(() => undefined);
  return run;
}

export function listStash({ key }: RpcInput<typeof stashListRpc>) {
  return serial(async () => ({ items: (await load())[key] ?? [] }));
}

export function pushStash({ key, text }: RpcInput<typeof stashPushRpc>) {
  return serial(async () => {
    const store = await load();
    const items = [{ text, ts: Date.now() / 1000 }, ...(store[key] ?? [])];
    store[key] = items;
    await save(store);
    return { items };
  });
}

export function popStash({ key, index }: RpcInput<typeof stashPopRpc>) {
  return serial(async () => {
    const store = await load();
    const items = [...(store[key] ?? [])];
    const [item] = index >= 0 && index < items.length ? items.splice(index, 1) : [];
    if (!item) return { item: null, items };
    if (items.length) store[key] = items;
    else delete store[key];
    await save(store);
    return { item, items };
  });
}
