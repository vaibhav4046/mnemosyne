import path from "node:path";
import os from "node:os";

/**
 * Per-user writable data root.
 *
 * In the packaged Electron app, electron/main.cjs sets OWN_WIKI_DATA to
 * app.getPath("userData") (e.g. %APPDATA%/Own Wiki) so the vault, vector store,
 * and MCP config persist per-user and survive reinstalls — instead of living in
 * the read-only bundled resources dir (process.cwd()).
 *
 * In dev it falls back to the project folder so the seeded vault is used.
 */
export const DATA_ROOT =
  process.env.OWN_WIKI_DATA && process.env.OWN_WIKI_DATA.trim()
    ? process.env.OWN_WIKI_DATA
    : process.cwd();

export const VAULT_DIR = process.env.MNEMOSYNE_VAULT || path.join(DATA_ROOT, "vault");
export const DATA_DIR = path.join(DATA_ROOT, "data");

/** The user's real home — always resolved at runtime so each install sees ITS own profile. */
export const HOME_DIR = os.homedir();
