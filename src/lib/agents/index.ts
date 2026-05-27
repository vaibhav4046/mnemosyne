import { register } from "./registry";
import { ingestRunner } from "./ingest";
import { lintRunner } from "./lint";
import { browserRunner } from "./browser";
import { fileScanRunner } from "./file";
import { queryRunner } from "./query";

let bootstrapped = false;
export function bootstrapAgents() {
  if (bootstrapped) return;
  register("ingest", ingestRunner);
  register("lint", lintRunner);
  register("browser", browserRunner);
  register("file", fileScanRunner);
  register("query", queryRunner);
  bootstrapped = true;
}
