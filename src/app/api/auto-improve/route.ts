import { NextRequest } from "next/server";
import { status, setEnabled } from "@/lib/auto-improve";

export const runtime = "nodejs";

export async function GET() {
  return Response.json(status());
}

export async function POST(req: NextRequest) {
  let body: { enabled?: boolean; intervalSec?: number } = {};
  try {
    body = await req.json();
  } catch {}
  if (typeof body.enabled === "boolean") {
    setEnabled(body.enabled, body.intervalSec);
  }
  return Response.json(status());
}
