import path from "node:path";
import os from "node:os";

/**
 * Per-user writable data root.
 *
 * In the packaged Electron app, electron/main.cjs sets OWN_WIKI_DATA to
 * app.getPath("userData") (e.g. %APPDATA%/Own Wiki) so the vault, vector store,
 * and MCP config persist per-user and survive reinstalls — instead of living in
 * the read-only bundled resources dir.
 *
 * NOTE: bracket-notation env access (process.env["X"]) + a runtime function are
 * deliberate — turbopack statically inlines dotted server reads (process.env.X)
 * to `undefined` at build time, which would silently break this. Reading lazily
 * by string key keeps the value live at runtime.
 */
function envData(): string {
  const e = process.env as Record<string, string | undefined>;
  const v = e["OWN_WIKI_DATA"];
  return v && v.trim() ? v : process.cwd();
}

export const DATA_ROOT = envData();

export const VAULT_DIR =
  (process.env as Record<string, string | undefined>)["MNEMOSYNE_VAULT"] || path.join(DATA_ROOT, "vault");
export const DATA_DIR = path.join(DATA_ROOT, "data");

/** The user's real home — always resolved at runtime so each install sees ITS own profile. */
export const HOME_DIR = os.homedir();
