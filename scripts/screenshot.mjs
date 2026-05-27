import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE = process.env.BASE || "http://127.0.0.1:3500";
const OUT = path.join(process.cwd(), "docs", "screenshots");

async function go() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1500, height: 920 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();

  await page.goto(BASE);
  await page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(3500);

  async function clickNav(label) {
    await page.locator(`aside nav button:has-text("${label}")`).first().click();
    await page.waitForTimeout(1200);
  }

  async function snap(name) {
    console.log(`> ${name}`);
    await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: false });
  }

  // 01 — chat
  await clickNav("Chat");
  await page.fill("textarea", "What is Own Wiki and how does the self-improving loop work?");
  await page.waitForTimeout(400);
  await page.locator('button[aria-label="send message"]').click();
  console.log("waiting for chat…");
  await page.waitForTimeout(40000);
  await snap("01-chat");

  // 02 — wiki with Own Wiki page selected
  await clickNav("Wiki");
  await page.waitForTimeout(2200);
  await page.locator('button:has-text("Own Wiki")').first().click().catch(() => {});
  await page.waitForTimeout(1500);
  await snap("02-wiki");

  // 03 — graph
  await clickNav("Galaxy");
  await page.waitForTimeout(4500);
  await snap("03-graph");

  // 04 — files
  await clickNav("Files");
  await page.waitForTimeout(2000);
  await snap("04-files");

  // 05 — agents with browser task visible
  await clickNav("Agents");
  await page.waitForTimeout(1500);
  await snap("05-agents");

  // 06 — MCP
  await clickNav("MCP servers");
  await page.waitForTimeout(1800);
  await snap("06-mcp");

  // 07 — settings with auto-improve section
  await clickNav("Settings");
  await page.waitForTimeout(2500);
  await snap("07-settings");

  // 08 — command palette
  await page.locator('button[aria-label="Open command palette"]').click();
  await page.waitForTimeout(700);
  await snap("08-palette");

  await browser.close();
  console.log("done");
}

go().catch((e) => {
  console.error(e);
  process.exit(1);
});
