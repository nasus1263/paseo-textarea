import type { PluginClientContext } from "@getpaseo/plugin/client";
import { StashItemView } from "./client/stash";
import { installTextareaKeys } from "./client/web";

export default function contribute(client: PluginClientContext) {
  const removeStash = client.addComposerItem({ id: "stash", Component: StashItemView });
  const removeKeys = installTextareaKeys();
  return () => {
    removeKeys();
    removeStash();
  };
}
