import { chromium } from "playwright";
import { chatOnce } from "../ollama";
import type { AgentRunner } from "./types";

export type BrowserInput = {
  url: string;
  task: string;
};

export const browserRunner: AgentRunner = async (job, log) => {
  const input = job.input as BrowserInput;
  log(`Launching chromium → ${input.url}`);
  const browser = await chromium.launch({ headless: true });
  try {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(input.url, { waitUntil: "domcontentloaded", timeout: 30000 });
    const title = await page.title();
    log(`Loaded "${title}"`);
    const text = await page.evaluate(() => {
      const main = document.querySelector("main, article, #content, .content") || document.body;
      return (main as HTMLElement).innerText.slice(0, 10000);
    });
    const screenshot = await page.screenshot({ type: "png", fullPage: false });
    log(`Asking model: ${input.task}`);
    const answer = await chatOnce([
      { role: "system", content: "You are a browser agent. Answer the user's task using the captured page text. Cite the URL." },
      { role: "user", content: `URL: ${input.url}\nTitle: ${title}\n\nPage text:\n${text}\n\nTask: ${input.task}` },
    ]);
    return {
      url: input.url,
      title,
      task: input.task,
      answer,
      screenshot: `data:image/png;base64,${screenshot.toString("base64")}`,
    };
  } finally {
    await browser.close();
  }
};
