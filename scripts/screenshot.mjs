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

  await clickNav("Chat");
  await page.fill("textarea", "What is Mnemosyne? Reply in 3 short sentences.");
  await page.waitForTimeout(500);
  await page.locator("button.btn-primary").last().click();
  console.log("waiting for stream…");
  await page.waitForTimeout(45000);
  await snap("01-chat");

  await clickNav("Wiki");
  await page.waitForTimeout(2500);
  await page.locator('button:has-text("Karpathy LLM Wiki Pattern")').first().click().catch(() => {});
  await page.waitForTimeout(1500);
  await snap("02-wiki");

  await clickNav("Graph");
  await page.waitForTimeout(4500);
  await snap("03-graph");

  await clickNav("Files");
  await page.waitForTimeout(2000);
  await snap("04-files");

  await clickNav("Agents");
  await page.waitForTimeout(1200);
  await page.locator('button:has-text("wiki lint pass")').first().click().catch(() => {});
  console.log("running lint…");
  await page.waitForTimeout(25000);
  await snap("05-agents");

  await clickNav("MCP");
  await page.waitForTimeout(1800);
  await snap("06-mcp");

  await clickNav("Settings");
  await page.waitForTimeout(2200);
  await snap("07-settings");

  await browser.close();
  console.log("done");
}

go().catch((e) => {
  console.error(e);
  process.exit(1);
});
