// Full UI walkthrough — drives every panel like a real user, captures console
// errors + screenshots. Surfaces runtime/render breaks that API QA misses.
import { chromium } from "playwright";
import fs from "node:fs";

const BASE = process.env.BASE || "http://127.0.0.1:3789";
const OUT = "C:/Users/lalwa/uiwalk";
fs.mkdirSync(OUT, { recursive: true });

const errors = [];
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text().slice(0, 200)); });
page.on("pageerror", (e) => errors.push("pageerror: " + (e.message || e).slice(0, 200)));
page.on("requestfailed", (r) => { const u = r.url(); if (!u.includes("favicon")) errors.push("reqfail: " + r.failure()?.errorText + " " + u.slice(0, 80)); });

async function shot(name) { await page.screenshot({ path: `${OUT}/${name}.png` }); }
async function clickNav(label) {
  const el = page.locator(`aside button:has-text("${label}")`).first();
  await el.click({ timeout: 8000 }).catch(() => errors.push(`nav click failed: ${label}`));
  await page.waitForTimeout(1200);
}

const log = [];
const note = (m) => { log.push(m); };

await page.goto(BASE, { waitUntil: "networkidle", timeout: 30000 }).catch((e) => errors.push("goto: " + e.message));
await page.waitForTimeout(1500);
await shot("01-load");
note("loaded: " + (await page.title()));

// Chat empty state + send
await clickNav("Chat");
await shot("02-chat-empty");
const composer = page.locator("textarea").first();
if (await composer.count()) {
  await composer.fill("What is Own Wiki?");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(9000);
  const msgs = await page.locator(".prose-mn").count();
  note("chat: rendered " + msgs + " prose blocks after send");
  await shot("03-chat-reply");
} else errors.push("chat: no textarea");

// Wiki — list + open page + TOC + export menu
await clickNav("Wiki");
await page.waitForTimeout(1500);
const wikiItems = await page.locator(".pane-list button").count();
note("wiki: " + wikiItems + " list buttons");
await page.locator(".pane-list button").nth(2).click({ timeout: 5000 }).catch(() => errors.push("wiki: open page failed"));
await page.waitForTimeout(1200);
const articleLen = (await page.locator("article").innerText().catch(() => "")).length;
note("wiki: article chars=" + articleLen);
await shot("04-wiki-page");

// Galaxy — graph renders
await clickNav("Galaxy");
await page.waitForTimeout(3000);
const canvas = await page.locator("canvas").count();
note("galaxy: canvas=" + canvas);
await shot("05-galaxy");

// Files — list + click a file → preview
await clickNav("Files");
await page.waitForTimeout(1500);
const fileRows = await page.locator('[class*="group"]').count();
note("files: rows~" + fileRows);
await shot("06-files");

// Agents — swarm + browser controls present
await clickNav("Agents");
await page.waitForTimeout(1200);
const swarmBtn = await page.locator('button:has-text("swarm"), button:has-text("Swarm")').count();
note("agents: swarm controls=" + swarmBtn);
await shot("07-agents");

// MCP
await clickNav("MCP");
await page.waitForTimeout(1000);
await shot("08-mcp");

// Settings — providers section
await clickNav("Settings");
await page.waitForTimeout(1500);
const txt = await page.locator("body").innerText();
note("settings: hasProviders=" + /provider/i.test(txt) + " hasOllama=" + /ollama/i.test(txt));
await shot("09-settings");

// resize stress — narrow window, check wiki layout
await clickNav("Wiki");
await page.waitForTimeout(800);
await page.setViewportSize({ width: 760, height: 900 });
await page.waitForTimeout(800);
await shot("10-wiki-narrow");
await page.setViewportSize({ width: 480, height: 900 });
await page.waitForTimeout(800);
await shot("11-wiki-tiny");
await page.setViewportSize({ width: 1440, height: 900 });

// theme toggle
const themeBtn = page.locator('button[aria-label*="theme"], button[title*="theme"]').first();
if (await themeBtn.count()) { await themeBtn.click().catch(() => {}); await page.waitForTimeout(600); await shot("12-theme"); note("theme toggled"); }
else errors.push("no theme toggle found");

await b.close();

fs.writeFileSync(`${OUT}/report.txt`, "NOTES:\n" + log.join("\n") + "\n\nERRORS (" + errors.length + "):\n" + errors.join("\n"));
console.log("NOTES:\n" + log.join("\n"));
console.log("\nERRORS=" + errors.length);
errors.forEach((e) => console.log("  " + e));
