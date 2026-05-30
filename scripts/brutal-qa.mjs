import { chromium } from "playwright";
import { setTimeout as sleep } from "node:timers/promises";

const BASE = process.env.BASE || "http://127.0.0.1:3500";
const results = [];

function pass(name) { results.push({ name, ok: true }); console.log(`✓ ${name}`); }
function fail(name, e) { results.push({ name, ok: false, error: e?.message || String(e) }); console.log(`✗ ${name}: ${e?.message || e}`); }

async function http(path, init) {
  const r = await fetch(BASE + path, init);
  const ct = r.headers.get("content-type") || "";
  const body = ct.includes("json") ? await r.json() : await r.text();
  return { status: r.status, body };
}

async function api() {
  // ---------- API hardening ----------
  try {
    const r = await http("/api/wiki/" + encodeURIComponent("../../etc/passwd"));
    if (r.status === 400) pass("api: blocks path-traversal slug"); else fail("api: blocks path-traversal slug", new Error(`got ${r.status}`));
  } catch (e) { fail("api: blocks path-traversal slug", e); }

  try {
    const r = await http("/api/wiki/Has Spaces");
    if (r.status === 400) pass("api: rejects invalid slug (spaces)"); else fail("api: rejects invalid slug (spaces)", new Error(`got ${r.status}`));
  } catch (e) { fail("api: rejects invalid slug (spaces)", e); }

  try {
    const r = await http("/api/files?root=hax");
    if (r.status === 400) pass("api: rejects invalid root"); else fail("api: rejects invalid root", new Error(`got ${r.status}`));
  } catch (e) { fail("api: rejects invalid root", e); }

  try {
    const r = await http("/api/files?root=desktop&rel=" + encodeURIComponent("../../"));
    if (r.status === 400) pass("api: rejects rel with .."); else fail("api: rejects rel with ..", new Error(`got ${r.status}`));
  } catch (e) { fail("api: rejects rel with ..", e); }

  try {
    const r = await http("/api/agents", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "totally-fake", input: {} }) });
    if (r.status === 400) pass("api: rejects unknown agent kind"); else fail("api: rejects unknown agent kind", new Error(`got ${r.status}`));
  } catch (e) { fail("api: rejects unknown agent kind", e); }

  try {
    const r = await http("/api/ingest", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
    if (r.status === 400) pass("api: ingest requires source"); else fail("api: ingest requires source", new Error(`got ${r.status}`));
  } catch (e) { fail("api: ingest requires source", e); }

  try {
    const r = await http("/api/wiki/test-page", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: "", body: "x" }) });
    if (r.status === 400) pass("api: wiki PUT requires title"); else fail("api: wiki PUT requires title", new Error(`got ${r.status}`));
  } catch (e) { fail("api: wiki PUT requires title", e); }

  try {
    const r = await http("/api/health");
    if (r.status === 200 && r.body.ok) pass("api: health 200"); else fail("api: health 200", new Error(`got ${r.status}`));
  } catch (e) { fail("api: health 200", e); }

  try {
    const r = await http("/api/models");
    if (r.status === 200 && r.body.online) pass("api: models lists ollama"); else fail("api: models lists ollama", new Error("not online"));
  } catch (e) { fail("api: models lists ollama", e); }

  try {
    const r = await http("/api/wiki");
    if (r.status === 200 && r.body.pages.length > 0) pass(`api: wiki has ${r.body.pages.length} pages`); else fail("api: wiki has pages", new Error("none"));
  } catch (e) { fail("api: wiki has pages", e); }
}

async function ui() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1500, height: 920 } });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => fail("ui: page error", e));
  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const t = msg.text();
    // Ignore framework/asset noise: React devtools hint, favicon, font preloads, HMR.
    if (/Download the React DevTools|icon\.svg|favicon|__nextjs_font|\/_next\/static\/.*\.(woff2?|png|svg)|net::ERR_ABORTED 404|the server responded with a status of 404/i.test(t)) return;
    fail("ui: console error", new Error(t));
  });

  await page.goto(BASE);
  await page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {});
  await sleep(2500);

  // logo loaded
  const logoVisible = await page.locator('img[alt="Own Wiki"]').first().isVisible().catch(() => false);
  logoVisible ? pass("ui: logo visible") : fail("ui: logo visible", new Error("not visible"));

  // command palette via sidebar button
  await page.locator('button[aria-label="Open command palette"]').click();
  await sleep(500);
  let paletteOpen = await page.locator('input[placeholder*="Search commands"]').isVisible().catch(() => false);
  paletteOpen ? pass("ui: command palette opens via sidebar button") : fail("ui: command palette opens via sidebar button", new Error("not open"));
  await page.keyboard.press("Escape");
  await sleep(400);
  paletteOpen = await page.locator('input[placeholder*="Search commands"]').isVisible().catch(() => false);
  !paletteOpen ? pass("ui: palette closes on Esc") : fail("ui: palette closes on Esc", new Error("still open"));

  // command palette via Cmd+K
  await page.keyboard.press("Control+k");
  await sleep(500);
  paletteOpen = await page.locator('input[placeholder*="Search commands"]').isVisible().catch(() => false);
  paletteOpen ? pass("ui: command palette opens on Ctrl+K") : fail("ui: command palette opens on Ctrl+K", new Error("not open"));
  if (paletteOpen) {
    await page.keyboard.press("Escape");
    await sleep(300);
  }

  // nav each view — map nav label → header marker
  const views = [
    { nav: "Chat", check: () => page.locator('aside button:has-text("Chat")').first() },
    { nav: "Wiki", check: () => page.locator('header span:has-text("Wiki")').first() },
    { nav: "Galaxy", check: () => page.locator('header span:has-text("Galaxy")').first() },
    { nav: "Files", check: () => page.locator('header span:has-text("Files")').first() },
    { nav: "Agents", check: () => page.locator('header span:has-text("Agents")').first() },
    { nav: "MCP servers", check: () => page.locator('header span:has-text("MCP")').first() },
    { nav: "Settings", check: () => page.locator('header span:has-text("Settings")').first() },
  ];
  for (const v of views) {
    try {
      await page.locator(`aside nav button:has-text("${v.nav}")`).first().click();
      await sleep(800);
      const visible = await v.check().isVisible().catch(() => false);
      visible ? pass(`ui: ${v.nav} view renders`) : fail(`ui: ${v.nav} view renders`, new Error("marker not visible"));
    } catch (e) { fail(`ui: ${v.nav} view renders`, e); }
  }

  // chat impatient — type then send via Enter
  await page.locator(`aside nav button:has-text("Chat")`).first().click();
  await sleep(600);
  // ensure fresh thread
  await page.locator('button:has-text("+ new thread")').first().click().catch(() => {});
  await sleep(400);
  await page.fill("textarea", "Reply with the single word: pong");
  await page.keyboard.press("Enter");
  await sleep(20000);
  const chatBubble = await page.locator(".prose-mn").nth(1).innerText().catch(() => "");
  chatBubble.toLowerCase().includes("pong") || chatBubble.length > 5
    ? pass("ui: chat returns response")
    : fail("ui: chat returns response", new Error(`got '${chatBubble.slice(0, 80)}'`));

  // chat XSS attempt
  await page.fill("textarea", "<script>window.__xss=1</script>");
  await page.keyboard.press("Enter");
  await sleep(3000);
  const xss = await page.evaluate(() => (window).__xss);
  xss === undefined ? pass("ui: chat input does not execute injected script") : fail("ui: chat input does not execute injected script", new Error("XSS fired"));

  // new endpoints sanity
  try {
    const r = await http("/api/auto-improve");
    if (r.status === 200) pass("api: auto-improve GET ok"); else fail("api: auto-improve GET ok", new Error(`got ${r.status}`));
  } catch (e) { fail("api: auto-improve GET ok", e); }

  try {
    const r = await http("/api/thread/title", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
    if (r.status === 400) pass("api: thread/title requires firstMessage"); else fail("api: thread/title requires firstMessage", new Error(`got ${r.status}`));
  } catch (e) { fail("api: thread/title requires firstMessage", e); }

  try {
    const r = await http("/api/memory", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
    if (r.status === 400) pass("api: memory requires user+assistant"); else fail("api: memory requires user+assistant", new Error(`got ${r.status}`));
  } catch (e) { fail("api: memory requires user+assistant", e); }

  try {
    const r = await http("/api/upload", { method: "POST" });
    if (r.status === 400) pass("api: upload rejects non-multipart"); else fail("api: upload rejects non-multipart", new Error(`got ${r.status}`));
  } catch (e) { fail("api: upload rejects non-multipart", e); }

  try {
    const r = await http("/api/export/own-wiki?format=md");
    if (r.status === 200) pass("api: export markdown ok"); else fail("api: export markdown ok", new Error(`got ${r.status}`));
  } catch (e) { fail("api: export markdown ok", e); }

  try {
    const r = await http("/api/export/own-wiki?format=csv");
    if (r.status === 200 && typeof r.body === "string" && r.body.includes("\"slug\"")) pass("api: export csv ok"); else fail("api: export csv ok", new Error(`bad body`));
  } catch (e) { fail("api: export csv ok", e); }

  try {
    const r = await http("/api/wiki/own-wiki");
    if (r.status === 200 && Array.isArray(r.body.backlinks)) pass(`api: wiki page returns backlinks (${r.body.backlinks.length})`); else fail("api: wiki page returns backlinks", new Error("missing backlinks"));
  } catch (e) { fail("api: wiki page returns backlinks", e); }

  // resizable sidebar handle present
  const handle = await page.locator('aside [role="separator"]').first().isVisible().catch(() => false);
  handle ? pass("ui: sidebar resize handle present") : fail("ui: sidebar resize handle present", new Error("not visible"));

  // galaxy search input
  await page.locator(`aside nav button:has-text("Galaxy")`).first().click();
  await sleep(1500);
  const gSearch = await page.locator('input[placeholder*="filter nodes"]').first().isVisible().catch(() => false);
  gSearch ? pass("ui: galaxy has node search") : fail("ui: galaxy has node search", new Error("missing"));

  // wiki new page via Wiki panel + button
  await page.locator(`aside nav button:has-text("Wiki")`).first().click();
  await sleep(800);
  await page.locator('button[aria-label="new page"]').click();
  await sleep(500);
  const modalVisible = await page.locator('input[placeholder="page title"]').isVisible().catch(() => false);
  modalVisible ? pass("ui: wiki new-page modal opens") : fail("ui: wiki new-page modal opens", new Error("modal not open"));
  let createdSlug = null;
  if (modalVisible) {
    createdSlug = "qa-page-" + Date.now();
    await page.fill('input[placeholder="page title"]', createdSlug);
    await page.keyboard.press("Enter");
    await sleep(1500);
    const r = await http("/api/wiki/" + createdSlug);
    r.status === 200 ? pass("ui: wiki new page persisted") : fail("ui: wiki new page persisted", new Error("not in API: " + r.status));
  }
  // cleanup created page
  if (createdSlug) {
    await http("/api/wiki/" + createdSlug, { method: "DELETE" });
  }

  // sidebar mobile collapse
  await page.setViewportSize({ width: 400, height: 800 });
  await sleep(500);
  const mobileMenuVisible = await page.locator('button[aria-label="open menu"]').isVisible().catch(() => false);
  mobileMenuVisible ? pass("ui: mobile menu button appears below 768px") : fail("ui: mobile menu button appears below 768px", new Error("not visible"));
  await page.setViewportSize({ width: 1500, height: 920 });

  // empty input doesn't submit
  await page.locator(`aside nav button:has-text("Chat")`).first().click();
  await sleep(300);
  const sendBtn = page.locator('button[aria-label="send message"]');
  const disabledBefore = await sendBtn.isDisabled().catch(() => true);
  disabledBefore ? pass("ui: send button disabled when input empty") : fail("ui: send button disabled when input empty", new Error("enabled"));

  await browser.close();
}

async function pollJob(id, ms = 25000) {
  const start = Date.now();
  while (Date.now() - start < ms) {
    const r = await http("/api/agents");
    const job = (r.body.jobs || []).find((j) => j.id === id);
    if (job && (job.status === "done" || job.status === "error")) return job;
    await sleep(800);
  }
  return null;
}

async function security() {
  // --- MCP command allowlist (RCE guard) ---
  try {
    const r = await http("/api/mcp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "add", server: { name: "qa-evil", command: "powershell", args: ["-c", "calc"] } }) });
    if (r.status === 400) pass("sec: MCP rejects non-allowlisted command"); else fail("sec: MCP rejects non-allowlisted command", new Error(`got ${r.status}`));
  } catch (e) { fail("sec: MCP rejects non-allowlisted command", e); }
  try {
    const r = await http("/api/mcp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "add", server: { name: "qa-evil2", command: "C:\\Windows\\System32\\cmd.exe", args: [] } }) });
    if (r.status === 400) pass("sec: MCP rejects absolute-path cmd.exe"); else fail("sec: MCP rejects absolute-path cmd.exe", new Error(`got ${r.status}`));
  } catch (e) { fail("sec: MCP rejects absolute-path cmd.exe", e); }
  try {
    const r = await http("/api/mcp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "add", server: { name: "qa-ok", command: "npx", args: ["-y", "x"] } }) });
    if (r.status === 200) pass("sec: MCP accepts npx launcher"); else fail("sec: MCP accepts npx launcher", new Error(`got ${r.status}`));
    await http("/api/mcp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "remove", name: "qa-ok" }) });
  } catch (e) { fail("sec: MCP accepts npx launcher", e); }

  // --- Ingest arbitrary-file-read guard ---
  for (const fp of ["C:\\Windows\\win.ini", "C:\\Users\\lalwa\\.ssh\\id_rsa", "/etc/passwd"]) {
    try {
      const r = await http("/api/ingest", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ source: "qa", filePath: fp }) });
      if (r.status === 400) pass(`sec: ingest blocks filePath outside roots (${fp.slice(0, 18)})`); else fail(`sec: ingest blocks filePath (${fp})`, new Error(`got ${r.status}`));
    } catch (e) { fail(`sec: ingest blocks filePath (${fp})`, e); }
  }

  // --- SSRF guard on browser agent (rejected before chromium launch) ---
  for (const url of ["http://169.254.169.254/latest/meta-data/", "http://127.0.0.1:11434/api/tags", "http://192.168.1.1/", "file:///C:/Windows/win.ini"]) {
    try {
      const r = await http("/api/agents", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "browser", title: "qa-ssrf", input: { url, task: "x", maxSteps: 1 } }) });
      if (r.status !== 200) { fail(`sec: SSRF ${url}`, new Error(`spawn ${r.status}`)); continue; }
      const job = await pollJob(r.body.jobId, 15000);
      if (job && job.status === "error" && /block|private|loopback|scheme|local/i.test(job.error || "")) pass(`sec: SSRF blocked ${url.slice(0, 26)}`);
      else fail(`sec: SSRF ${url}`, new Error(job ? `status=${job.status} err=${job.error}` : "no terminal job"));
    } catch (e) { fail(`sec: SSRF ${url}`, e); }
  }

  // --- CSRF / cross-origin middleware ---
  try {
    const r = await http("/api/ingest", { method: "POST", headers: { "Content-Type": "application/json", Origin: "http://evil.example" }, body: JSON.stringify({ source: "x", text: "y" }) });
    if (r.status === 403) pass("sec: cross-origin POST blocked (Origin)"); else fail("sec: cross-origin POST blocked (Origin)", new Error(`got ${r.status}`));
  } catch (e) { fail("sec: cross-origin POST blocked (Origin)", e); }
  try {
    const r = await http("/api/ingest", { method: "POST", headers: { "Content-Type": "application/json", "Sec-Fetch-Site": "cross-site" }, body: JSON.stringify({ source: "x", text: "y" }) });
    if (r.status === 403) pass("sec: cross-site POST blocked (Sec-Fetch-Site)"); else fail("sec: cross-site POST blocked (Sec-Fetch-Site)", new Error(`got ${r.status}`));
  } catch (e) { fail("sec: cross-site POST blocked (Sec-Fetch-Site)", e); }

  // --- CSP header present on app pages ---
  try {
    const r = await fetch(BASE + "/");
    const csp = r.headers.get("content-security-policy");
    if (csp && csp.includes("default-src") && csp.includes("connect-src 'self'")) pass("sec: CSP header present on pages");
    else fail("sec: CSP header present on pages", new Error(csp ? "weak CSP" : "no CSP"));
  } catch (e) { fail("sec: CSP header present on pages", e); }
}

await api();
await security();
await ui();

const okCount = results.filter((r) => r.ok).length;
const failCount = results.filter((r) => !r.ok).length;
console.log(`\n=== ${okCount} pass / ${failCount} fail / ${results.length} total ===`);
if (failCount > 0) {
  console.log("\nFailures:");
  results.filter((r) => !r.ok).forEach((r) => console.log(`  - ${r.name}: ${r.error}`));
  process.exit(1);
}
