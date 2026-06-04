// Visual QA — capture the real rendered app (same server the .exe runs) so we can
// eyeball galaxy bloom/interactivity, chat memory, and the desktop-files page.
import { chromium } from "playwright";
import fs from "node:fs";
const BASE = process.env.BASE || "http://127.0.0.1:3789";
const OUT = "C:/Users/lalwa/uiwalk";
fs.mkdirSync(OUT, { recursive: true });

const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--ignore-gpu-blocklist"] });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const log = [];
page.on("pageerror", (e) => log.push("pageerror: " + e.message));

async function nav(label) {
  await page.locator(`aside button:has-text("${label}")`).first().click().catch(() => {});
  await page.waitForTimeout(1000);
}
async function shot(n) { await page.screenshot({ path: `${OUT}/${n}.png` }); log.push("shot " + n); }

await page.goto(BASE, { waitUntil: "networkidle", timeout: 30000 });
await page.waitForTimeout(1200);

// GALAXY
await nav("Galaxy");
await page.waitForTimeout(4500); // physics settle + bloom
await shot("vqa-galaxy-default");
// hover center to trigger neighbour highlight
const box = await page.locator("canvas").first().boundingBox();
if (box) {
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
  await page.mouse.move(cx, cy); await page.waitForTimeout(400);
  await page.mouse.move(cx + 30, cy - 20); await page.waitForTimeout(900);
  await shot("vqa-galaxy-hover");
  await page.mouse.click(cx, cy); await page.waitForTimeout(1800); // fly-to + focus card
  await shot("vqa-galaxy-focus");
}

// CHAT with a memory-style question
await nav("Chat");
const ta = page.locator("textarea").first();
if (await ta.count()) {
  await ta.fill("Summarize what you know about me and my files so far.");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(11000);
  await shot("vqa-chat-memory");
}

// DESKTOP FILES wiki page
await nav("Wiki");
await page.waitForTimeout(1000);
const df = page.locator('.pane-list button:has-text("Desktop Files")').first();
if (await df.count()) { await df.click().catch(() => {}); await page.waitForTimeout(1200); await shot("vqa-desktop-files"); }
else { log.push("no Desktop Files page button found"); }

await b.close();
fs.writeFileSync(`${OUT}/vqa-report.txt`, log.join("\n"));
console.log(log.join("\n"));
