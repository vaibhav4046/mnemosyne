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
  page.on("console", (msg) => { if (msg.type() === "error" && !msg.text().includes("Download the React DevTools")) fail("ui: console error", new Error(msg.text())); });

  await page.goto(BASE);
  await page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {});
  await sleep(2500);

  // logo loaded
  const logoVisible = await page.locator('img[alt="Mnemosyne logo"]').isVisible().catch(() => false);
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

  // nav each view
  const views = ["Chat", "Wiki", "Graph", "Files", "Agents", "MCP", "Settings"];
  for (const v of views) {
    try {
      await page.locator(`aside nav button:has-text("${v}")`).first().click();
      await sleep(800);
      const visible = await page.locator(`header span:has-text("${v === "MCP" ? "MCP Servers" : v}")`).first().isVisible().catch(() => false);
      visible ? pass(`ui: ${v} view renders`) : fail(`ui: ${v} view renders`, new Error("header not visible"));
    } catch (e) { fail(`ui: ${v} view renders`, e); }
  }

  // chat impatient — type then send via Enter
  await page.locator(`aside nav button:has-text("Chat")`).first().click();
  await sleep(600);
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

await api();
await ui();

const okCount = results.filter((r) => r.ok).length;
const failCount = results.filter((r) => !r.ok).length;
console.log(`\n=== ${okCount} pass / ${failCount} fail / ${results.length} total ===`);
if (failCount > 0) {
  console.log("\nFailures:");
  results.filter((r) => !r.ok).forEach((r) => console.log(`  - ${r.name}: ${r.error}`));
  process.exit(1);
}
