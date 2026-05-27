import { NextRequest } from "next/server";
import path from "node:path";
import os from "node:os";
import fs from "node:fs/promises";
import { extractText } from "@/lib/fs";
import { err } from "@/lib/validate";

export const runtime = "nodejs";

const MAX_BYTES = 25 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const ct = req.headers.get("content-type") || "";
  if (!ct.includes("multipart/form-data")) return err(400, "expected multipart/form-data");

  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return err(400, "no file");
  if (file.size > MAX_BYTES) return err(413, `file too large (${(file.size / 1024 / 1024).toFixed(1)} MB > 25 MB)`);

  const buf = Buffer.from(await file.arrayBuffer());
  const tmpDir = path.join(os.tmpdir(), "ownwiki-uploads");
  await fs.mkdir(tmpDir, { recursive: true });
  const tmpPath = path.join(tmpDir, `${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`);
  await fs.writeFile(tmpPath, buf);

  let text = "";
  try {
    text = await extractText(tmpPath);
  } catch (e) {
    return err(400, e instanceof Error ? e.message : "extract failed");
  } finally {
    await fs.unlink(tmpPath).catch(() => {});
  }

  return Response.json({
    name: file.name,
    kind: file.type || path.extname(file.name).slice(1) || "file",
    bytes: file.size,
    chars: text.length,
    text: text.slice(0, 200_000),
  });
}
