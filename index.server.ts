import type { PluginServerContext } from "@getpaseo/plugin/server";
import { listStash, popStash, pushStash } from "./server/stash";
import { stashListRpc, stashPopRpc, stashPushRpc } from "./shared/stash";

export default function contribute(server: PluginServerContext) {
  server.handle(stashListRpc, listStash);
  server.handle(stashPushRpc, pushStash);
  server.handle(stashPopRpc, popStash);
  return () => {};
}
