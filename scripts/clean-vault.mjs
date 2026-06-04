// One-shot vault hygiene: remove test-probe pollution and reset the junk-filled
// memory so RAG answers are accurate. Run with the server STOPPED.
import fs from "node:fs";
import path from "node:path";

const DATA = "C:/Users/lalwa/AppData/Roaming/Own Wiki";
const PAGES = path.join(DATA, "vault", "pages");
const VEC = path.join(DATA, "data", "vectors.json");

// 1) delete probe/test wiki pages
for (const f of ["probe-turbovector.md", "probe-turbovector-wiki.md", "probe-page-x.md"]) {
  const p = path.join(PAGES, f);
  if (fs.existsSync(p)) { fs.rmSync(p); console.log("deleted page", f); }
}

// 2) rewrite memory.md keeping only genuine user facts (drop pong/XSS/probe/etc)
const memPath = path.join(PAGES, "memory.md");
const KEEP = [/apziva/i, /mentor/i, /training|education/i];
const JUNK = [/pong/i, /xss/i, /window object/i, /turbovector/i, /hasn'?t provided/i, /no information/i, /uses an llm called/i];
if (fs.existsSync(memPath)) {
  const raw = fs.readFileSync(memPath, "utf8");
  const lines = raw.split("\n");
  const out = [];
  let kept = 0, dropped = 0;
  for (const l of lines) {
    if (l.trim().startsWith("- ")) {
      const isJunk = JUNK.some((r) => r.test(l));
      const isReal = KEEP.some((r) => r.test(l));
      if (isJunk && !isReal) { dropped++; continue; }
      kept++;
    }
    out.push(l);
  }
  fs.writeFileSync(memPath, out.join("\n"));
  console.log(`memory.md: kept ${kept} facts, dropped ${dropped} junk lines`);
}

// 3) drop polluted vectors: probe sources + ALL memory:* vectors (memory is
//    re-injected from memory.md text by the chat route, so we don't need noisy
//    short-fact vectors crowding RAG).
const v = JSON.parse(fs.readFileSync(VEC, "utf8"));
const before = v.length;
const cleaned = v.filter((r) => {
  const s = String(r.source || "");
  if (s === "probe-turbovector") return false;
  if (s.startsWith("memory:")) return false;
  return true;
});
fs.writeFileSync(VEC + ".tmp", JSON.stringify(cleaned));
fs.renameSync(VEC + ".tmp", VEC);
console.log(`vectors: ${before} -> ${cleaned.length} (removed ${before - cleaned.length})`);
console.log("clean done");
