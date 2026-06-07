// Capture a clean, comprehensive screenshot set for the README.
import { chromium } from "playwright";
import fs from "node:fs";
const BASE = process.env.BASE || "http://127.0.0.1:3789";
const OUT = "C:/Users/lalwa/mnemosyne/docs/screenshots";
fs.mkdirSync(OUT, { recursive: true });

const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--ignore-gpu-blocklist"] });
const ctx = await b.newContext({ viewport: { width: 1440, height: 860 }, deviceScaleFactor: 1.5 });
const page = await ctx.newPage();
const log = [];
const shot = async (n) => { await page.screenshot({ path: `${OUT}/${n}.png` }); log.push(n); };
const nav = async (label) => { await page.locator(`aside button:has-text("${label}")`).first().click().catch(() => {}); await page.waitForTimeout(1200); };

// clean client state for pristine captures
await page.goto(BASE, { waitUntil: "networkidle", timeout: 30000 });
await page.evaluate(() => { try { localStorage.clear(); } catch {} });
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(1500);

// 1) chat hero (empty state)
await shot("01-chat-hero");

// 2) chat with an accurate answer
const ta = page.locator("textarea").first();
await ta.fill("What is Own Wiki, what models and tech stack does it use, and how does its vector store save space?");
await page.keyboard.press("Enter");
await page.waitForTimeout(20000);
await shot("02-chat-answer");

// 3) galaxy
await nav("Galaxy");
await page.waitForTimeout(5000);
await shot("03-galaxy");

// 4) wiki — open a substantial page
await nav("Wiki");
await page.waitForTimeout(1200);
const item = page.locator('.pane-list button').filter({ hasText: /own.?wiki|rag|ollama|swarm/i }).first();
if (await item.count()) { await item.click().catch(() => {}); await page.waitForTimeout(1500); }
await shot("04-wiki");

// 5) agents (swarm controls)
await nav("Agents");
await page.waitForTimeout(1500);
await shot("05-agents");

// 6) files
await nav("Files");
await page.waitForTimeout(1500);
await shot("06-files");

// 7) light theme galaxy (toggle) for a second hero option
await nav("Galaxy");
await page.waitForTimeout(3500);
const themeBtn = page.locator('button[aria-label*="theme"], button[title*="theme"]').first();
if (await themeBtn.count()) { await themeBtn.click().catch(() => {}); await page.waitForTimeout(1500); await shot("07-galaxy-light"); }

await b.close();
console.log("captured: " + log.join(", "));
