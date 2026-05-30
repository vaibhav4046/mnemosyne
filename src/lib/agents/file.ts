import { ingestRunner } from "./ingest";
import { listDir, extractText } from "../fs";
import { validRoot } from "../validate";
import type { AgentRunner } from "./types";

export type FileScanInput = {
  root: string;
  rel?: string;
  pattern?: string;
};

/** Convert a simple glob (* and ?) to an anchored, backtracking-safe regex. */
function globToRegExp(glob: string): RegExp {
  const escaped = glob
    .slice(0, 128)
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, "[^/]*")
    .replace(/\?/g, ".");
  return new RegExp(`^${escaped}$`, "i");
}

export const fileScanRunner: AgentRunner = async (job, log) => {
  const input = job.input as FileScanInput;
  if (!validRoot(input.root)) {
    throw new Error("invalid root — must be one of vault/desktop/documents/downloads/home");
  }
  const entries = await listDir(input.root, input.rel || "");
  const files = entries.filter((e) => !e.isDir);
  let matched = files;
  if (input.pattern && typeof input.pattern === "string") {
    const re = globToRegExp(input.pattern);
    matched = files.filter((f) => re.test(f.name));
  }
  log(`Scanning ${matched.length} files in ${input.root}/${input.rel || ""}`);
  const out: Array<{ file: string; pages: number }> = [];
  for (const f of matched.slice(0, 10)) {
    try {
      const text = await extractText(f.path);
      const sub = await ingestRunner(
        {
          ...job,
          input: { source: `file:${f.path}`, title: f.name, text },
        },
        log,
      );
      out.push({ file: f.path, pages: (sub as { pages: string[] }).pages.length });
    } catch (e) {
      log(`Skipped ${f.name}: ${e instanceof Error ? e.message : e}`, "warn");
    }
  }
  return { scanned: matched.length, ingested: out };
};
