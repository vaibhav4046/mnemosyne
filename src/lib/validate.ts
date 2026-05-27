const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,79}$/;
const SAFE_ROOT_RE = /^(vault|desktop|documents|downloads|home)$/;

export function validSlug(s: unknown): s is string {
  return typeof s === "string" && SLUG_RE.test(s);
}

export function validRoot(s: unknown): s is string {
  return typeof s === "string" && SAFE_ROOT_RE.test(s);
}

export function validRel(s: unknown): s is string {
  if (typeof s !== "string") return false;
  if (s.length > 1024) return false;
  if (s.includes("..")) return false;
  if (s.startsWith("/") || s.startsWith("\\")) return false;
  if (/[\x00-\x1f<>:"|?*]/.test(s)) return false;
  return true;
}

export function clampText(s: unknown, max: number): string {
  if (typeof s !== "string") return "";
  return s.length > max ? s.slice(0, max) : s;
}

export function validUrl(s: unknown): s is string {
  if (typeof s !== "string") return false;
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export function err(status: number, message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
