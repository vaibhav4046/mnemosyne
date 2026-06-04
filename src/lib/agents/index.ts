import { register } from "./registry";
import { ingestRunner } from "./ingest";
import { lintRunner } from "./lint";
import { browserRunner } from "./browser";
import { fileScanRunner } from "./file";
import { queryRunner } from "./query";
import { enrichRunner } from "./enrich";
import { synthesizeRunner } from "./synthesize";
import { desktopRunner } from "./desktop";

let bootstrapped = false;
export function bootstrapAgents() {
  if (bootstrapped) return;
  register("ingest", ingestRunner);
  register("lint", lintRunner);
  register("browser", browserRunner);
  register("file", fileScanRunner);
  register("query", queryRunner);
  register("enrich", enrichRunner);
  register("synthesize", synthesizeRunner);
  register("desktop", desktopRunner);
  bootstrapped = true;
}
