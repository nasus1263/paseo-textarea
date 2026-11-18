// The plugin typechecks without @types/node; declare only the Node APIs the server uses.
declare module "node:fs/promises" {
  export function readFile(path: string, encoding: "utf8"): Promise<string>;
  export function writeFile(path: string, data: string, encoding: "utf8"): Promise<void>;
  export function rename(from: string, to: string): Promise<void>;
  export function mkdir(path: string, options: { recursive: true }): Promise<string | undefined>;
}

declare module "node:path" {
  export function join(...paths: string[]): string;
}

declare module "node:os" {
  export function homedir(): string;
}

declare const process: { env: Record<string, string | undefined> };
