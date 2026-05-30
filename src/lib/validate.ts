import dns from "node:dns/promises";
import net from "node:net";

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

/** True if an IP literal is loopback / private / link-local / unique-local / unspecified. */
export function isPrivateIp(ip: string): boolean {
  const v = net.isIP(ip);
  if (v === 4) {
    const p = ip.split(".").map(Number);
    if (p.length !== 4 || p.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return true;
    const [a, b] = p;
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 0) return true;
    if (a === 169 && b === 254) return true; // link-local + cloud metadata
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    if (a >= 224) return true; // multicast / reserved
    return false;
  }
  if (v === 6) {
    const l = ip.toLowerCase();
    if (l === "::1" || l === "::") return true;
    if (l.startsWith("fe80") || l.startsWith("fc") || l.startsWith("fd")) return true;
    if (l.startsWith("::ffff:")) return isPrivateIp(l.slice(7)); // IPv4-mapped
    return false;
  }
  return true; // not a valid IP literal → treat as unsafe
}

/**
 * SSRF guard: returns the URL if safe, else throws.
 * Blocks non-http(s), and any host resolving to a private/loopback/link-local address.
 */
export async function assertPublicUrl(raw: unknown): Promise<string> {
  if (typeof raw !== "string" || raw.length > 2048) throw new Error("invalid URL");
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    throw new Error("malformed URL");
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    throw new Error(`blocked scheme: ${u.protocol}`);
  }
  const host = u.hostname.replace(/^\[|\]$/g, "");
  // direct IP literal
  if (net.isIP(host)) {
    if (isPrivateIp(host)) throw new Error("blocked: private/loopback address");
    return u.toString();
  }
  // obvious local hostnames
  const lower = host.toLowerCase();
  if (lower === "localhost" || lower.endsWith(".localhost") || lower.endsWith(".local") || lower.endsWith(".internal")) {
    throw new Error("blocked: local hostname");
  }
  // resolve DNS, reject if any record is private
  let addrs: string[] = [];
  try {
    const recs = await dns.lookup(host, { all: true });
    addrs = recs.map((r) => r.address);
  } catch {
    throw new Error("DNS resolution failed");
  }
  if (addrs.length === 0) throw new Error("no DNS records");
  for (const a of addrs) {
    if (isPrivateIp(a)) throw new Error("blocked: resolves to private address");
  }
  return u.toString();
}

/** Escape a string for safe interpolation into HTML text/attributes. */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function err(status: number, message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
