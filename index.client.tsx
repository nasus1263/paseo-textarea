import type { PluginClientContext } from "@getpaseo/plugin/client";
import { installTextareaKeys } from "./client/web";

export default function contribute(_client: PluginClientContext) {
  return installTextareaKeys();
}
