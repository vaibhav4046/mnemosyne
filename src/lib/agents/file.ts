import path from "node:path";
import { ingestRunner } from "./ingest";
import { listDir, extractText } from "../fs";
import type { AgentRunner } from "./types";

export type FileScanInput = {
  root: string;
  rel?: string;
  pattern?: string;
};

export const fileScanRunner: AgentRunner = async (job, log) => {
  const input = job.input as FileScanInput;
  const entries = await listDir(input.root, input.rel || "");
  const files = entries.filter((e) => !e.isDir);
  const matched = input.pattern
    ? files.filter((f) => new RegExp(input.pattern!, "i").test(f.name))
    : files;
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
