import { listModels } from "@/lib/ollama";
import { count } from "@/lib/vector";
import { listPages } from "@/lib/wiki";

export const runtime = "nodejs";

export async function GET() {
  const checks: Record<string, { ok: boolean; detail?: string }> = {};
  try {
    const models = await listModels();
    checks.ollama = { ok: models.length > 0, detail: `${models.length} models` };
  } catch (e) {
    checks.ollama = { ok: false, detail: e instanceof Error ? e.message : "fail" };
  }
  try {
    const c = await count();
    checks.vector = { ok: true, detail: `${c} chunks` };
  } catch (e) {
    checks.vector = { ok: false, detail: e instanceof Error ? e.message : "fail" };
  }
  try {
    const pages = await listPages();
    checks.vault = { ok: true, detail: `${pages.length} pages` };
  } catch (e) {
    checks.vault = { ok: false, detail: e instanceof Error ? e.message : "fail" };
  }
  const ok = Object.values(checks).every((c) => c.ok);
  return Response.json({ ok, checks, uptimeSec: Math.floor(process.uptime()) }, { status: ok ? 200 : 503 });
}
