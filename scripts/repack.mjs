// Repack the packaged .exe's app payload from a fresh `next build`, ATOMICALLY.
//
// Why: electron-builder's portable target needs Windows Dev Mode (code-sign
// symlinks), so we sync the standalone payload into win-unpacked/ by hand. The
// blank-app bug happened when only .next/server was copied and .next/static went
// stale → chunk-hash mismatch → CSS/JS 404 → blank render. This script copies
// server + static + public + vault TOGETHER so they can never drift apart.
//
// Usage: node scripts/repack.mjs   (run after `npm run build`)
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SRC = path.join(ROOT, ".next", "standalone");
const APP = path.join(ROOT, "dist-electron", "win-unpacked", "resources", "app");
const DST = path.join(APP, ".next", "standalone");

function must(p, label) {
  if (!fs.existsSync(p)) {
    console.error(`MISSING ${label}: ${p}`);
    process.exit(1);
  }
}
must(SRC, "source standalone (run `npm run build` first)");
must(path.join(ROOT, ".next", "static"), "source .next/static");
must(APP, "packaged app dir (build the .exe at least once)");

const cp = (from, to) => {
  fs.rmSync(to, { recursive: true, force: true });
  fs.cpSync(from, to, { recursive: true });
};

// 1) standalone server + node_modules (the running server)
cp(SRC, DST);
// 2) static — MUST match server's chunk hashes (this is the bug-prone one)
cp(path.join(ROOT, ".next", "static"), path.join(DST, ".next", "static"));
// 3) public assets
cp(path.join(ROOT, "public"), path.join(DST, "public"));
// 4) seed vault (first-run copies this to %APPDATA%)
if (fs.existsSync(path.join(ROOT, "vault"))) cp(path.join(ROOT, "vault"), path.join(DST, "vault"));
// 5) electron main + manifest
cp(path.join(ROOT, "electron"), path.join(APP, "electron"));
fs.copyFileSync(path.join(ROOT, "package.json"), path.join(APP, "package.json"));

// strip dev bloat that output-tracing may have pulled in
for (const junk of ["dist-electron", ".git", "_inspiration", "docs", "scripts", "dev.log", "build.log", "_b.txt", "home.html"]) {
  fs.rmSync(path.join(DST, junk), { recursive: true, force: true });
}

// Integrity check: every CSS/JS the built HTML references must exist in static.
const serverApp = path.join(DST, ".next", "server", "app");
const staticChunks = path.join(DST, ".next", "static", "chunks");
const serverOk = fs.existsSync(path.join(DST, "server.js"));
const nmOk = fs.existsSync(path.join(DST, "node_modules", "next"));
const staticOk = fs.existsSync(staticChunks) && fs.readdirSync(staticChunks).length > 0;
// Next standalone ships middleware as a manifest entry, not a top-level middleware.js.
const mwOk = fs.existsSync(path.join(DST, ".next", "server", "middleware-manifest.json"));

console.log(`repack: server.js=${serverOk} node_modules/next=${nmOk} static/chunks=${staticOk} middleware=${mwOk} serverApp=${fs.existsSync(serverApp)}`);
if (!serverOk || !nmOk || !staticOk) {
  console.error("REPACK INCOMPLETE");
  process.exit(1);
}
console.log("repack OK");
