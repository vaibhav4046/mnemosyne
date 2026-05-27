import type { Browser, Page } from "playwright";
import { generateJSON, chatOnce } from "../ollama";
import type { AgentRunner } from "./types";

export type BrowserInput = {
  url?: string;
  task: string;
  maxSteps?: number;
};

type Action =
  | { action: "navigate"; url: string; reason: string }
  | { action: "click"; selector: string; reason: string }
  | { action: "fill"; selector: string; value: string; reason: string }
  | { action: "scroll"; direction: "down" | "up"; pixels?: number; reason: string }
  | { action: "wait"; ms: number; reason: string }
  | { action: "extract"; reason: string }
  | { action: "done"; answer: string; reason: string };

async function snapshot(page: Page) {
  const url = page.url();
  const title = await page.title().catch(() => "");
  const text = await page
    .evaluate(() => {
      const main = (document.querySelector("main, article, #content, .content") as HTMLElement) || document.body;
      return main.innerText.slice(0, 4000);
    })
    .catch(() => "");
  const interactive = await page
    .evaluate(() => {
      const items: string[] = [];
      document.querySelectorAll("a, button, input, textarea, [role=button]").forEach((el) => {
        const tag = el.tagName.toLowerCase();
        const label = (el as HTMLElement).innerText?.trim().slice(0, 60) || (el as HTMLInputElement).placeholder?.slice(0, 40) || (el as HTMLInputElement).name || "";
        const id = el.id ? `#${el.id}` : "";
        const cls = (el.className && typeof el.className === "string") ? `.${el.className.split(" ").filter(Boolean)[0]}` : "";
        const sel = `${tag}${id || cls}`;
        if (label) items.push(`${sel} — ${label}`);
      });
      return items.slice(0, 30);
    })
    .catch(() => []);
  return { url, title, text, interactive };
}

async function exec(page: Page, act: Action, log: (m: string, lvl?: "info" | "warn" | "error") => void): Promise<string> {
  switch (act.action) {
    case "navigate":
      log(`→ navigate ${act.url}`);
      await page.goto(act.url, { waitUntil: "domcontentloaded", timeout: 30000 });
      return `Navigated to ${act.url}`;
    case "click":
      log(`→ click ${act.selector}`);
      await page.locator(act.selector).first().click({ timeout: 10000 });
      return `Clicked ${act.selector}`;
    case "fill":
      log(`→ fill ${act.selector} with "${act.value.slice(0, 40)}"`);
      await page.locator(act.selector).first().fill(act.value, { timeout: 10000 });
      return `Filled ${act.selector}`;
    case "scroll":
      log(`→ scroll ${act.direction}`);
      await page.mouse.wheel(0, (act.direction === "down" ? 1 : -1) * (act.pixels || 800));
      return `Scrolled ${act.direction}`;
    case "wait":
      log(`→ wait ${act.ms}ms`);
      await page.waitForTimeout(Math.min(act.ms, 5000));
      return `Waited`;
    case "extract":
      log(`→ extract page content`);
      return `Extracted (see next snapshot)`;
    case "done":
      log(`→ done: ${act.answer.slice(0, 120)}`);
      return `done`;
  }
}

export const browserRunner: AgentRunner = async (job, log) => {
  const input = job.input as BrowserInput;
  const maxSteps = Math.min(input.maxSteps || 8, 15);
  const startUrl = input.url || "https://duckduckgo.com/";

  log(`Launching chromium for task: ${input.task}`);
  let browser: Browser | null = null;
  try {
    const { chromium } = await import("playwright");
    browser = await chromium.launch({ headless: true });
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 850 }, userAgent: "Mozilla/5.0 OwnWiki" });
    const page = await ctx.newPage();
    await page.goto(startUrl, { waitUntil: "domcontentloaded", timeout: 30000 });

    const trace: Array<{ step: number; action: Action; observed: string }> = [];
    let lastAnswer = "";
    let finalShot: Buffer | null = null;

    for (let step = 1; step <= maxSteps; step++) {
      const snap = await snapshot(page);
      const shot = await page.screenshot({ type: "png", fullPage: false }).catch(() => null);
      finalShot = shot || finalShot;
      log(`step ${step}: ${snap.url} — "${snap.title}"`);

      const planPrompt = `You are a browser agent completing a task. Decide the NEXT single action.

Task: ${input.task}

Step ${step} of ${maxSteps}.
Current URL: ${snap.url}
Current title: ${snap.title}

Page text (truncated):
${snap.text.slice(0, 2000)}

Interactive elements (selector — label):
${snap.interactive.slice(0, 20).join("\n")}

Previous actions:
${trace
  .map((t, i) => `${i + 1}. ${t.action.action} — ${t.action.reason}`)
  .join("\n") || "(none)"}

Return ONE next action as JSON. Allowed actions:
- {"action":"navigate","url":"https://...","reason":"why"}
- {"action":"click","selector":"css-selector","reason":"why"}
- {"action":"fill","selector":"css-selector","value":"text","reason":"why"}
- {"action":"scroll","direction":"down","pixels":800,"reason":"why"}
- {"action":"wait","ms":1500,"reason":"why"}
- {"action":"extract","reason":"why"}
- {"action":"done","answer":"the answer to the user's task with what you found","reason":"why"}

If the task is complete or you have enough information, use "done" with a thorough answer.`;

      const act = await generateJSON<Action>(planPrompt, `{ "action": "...", ...other-fields, "reason": "string" }`);
      let observed = "";
      try {
        observed = await exec(page, act, log);
      } catch (e) {
        observed = `Error: ${e instanceof Error ? e.message : e}`;
        log(observed, "error");
      }
      trace.push({ step, action: act, observed });
      if (act.action === "done") {
        lastAnswer = act.answer;
        break;
      }
      await page.waitForTimeout(800);
    }

    if (!lastAnswer) {
      log(`Max steps reached, synthesising final answer`);
      const snap = await snapshot(page);
      lastAnswer = await chatOnce([
        { role: "system", content: "Summarise findings for the user. Cite the URL." },
        {
          role: "user",
          content: `Task: ${input.task}\n\nLast URL: ${snap.url}\nLast title: ${snap.title}\n\nLast page text:\n${snap.text}\n\nAction trace:\n${trace.map((t) => `- ${t.action.action} — ${t.action.reason}`).join("\n")}`,
        },
      ]);
    }

    return {
      task: input.task,
      steps: trace.length,
      finalUrl: page.url(),
      finalTitle: await page.title().catch(() => ""),
      answer: lastAnswer,
      trace: trace.map((t) => ({
        step: t.step,
        action: t.action.action,
        reason: t.action.reason,
        observed: t.observed.slice(0, 200),
      })),
      screenshot: finalShot ? `data:image/png;base64,${finalShot.toString("base64")}` : null,
    };
  } finally {
    if (browser) await browser.close();
  }
};
