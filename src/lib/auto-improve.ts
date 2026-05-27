import { bootstrapAgents } from "./agents";
import { spawn } from "./agents/registry";
import { listPages } from "./wiki";

let timer: NodeJS.Timeout | null = null;
let enabled = false;
let lastTick: string | null = null;
let lastAction: string | null = null;
let tickCount = 0;
let intervalMs = 90_000;

export type AutoImproveStatus = {
  enabled: boolean;
  intervalSec: number;
  lastTick: string | null;
  lastAction: string | null;
  ticks: number;
};

export function status(): AutoImproveStatus {
  return { enabled, intervalSec: Math.round(intervalMs / 1000), lastTick, lastAction, ticks: tickCount };
}

export function setEnabled(on: boolean, intervalSec?: number) {
  if (intervalSec && intervalSec >= 30 && intervalSec <= 3600) {
    intervalMs = intervalSec * 1000;
  }
  enabled = on;
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  if (on) {
    timer = setInterval(() => {
      tick().catch((e) => {
        lastAction = `error: ${e instanceof Error ? e.message : e}`;
      });
    }, intervalMs);
  }
}

async function tick() {
  lastTick = new Date().toISOString();
  tickCount += 1;
  bootstrapAgents();
  try {
    const pages = await listPages();
    if (pages.length === 0) {
      lastAction = "skip: vault empty";
      return;
    }
    if (tickCount % 3 === 0) {
      await spawn("lint", "auto: wiki lint", {});
      lastAction = `lint pass (tick ${tickCount})`;
    } else {
      const sparse = [...pages].sort((a, b) => a.body.length - b.body.length)[0];
      await spawn("enrich", `auto: enrich ${sparse.slug}`, { slug: sparse.slug });
      lastAction = `enrich ${sparse.slug} (tick ${tickCount})`;
    }
  } catch (e) {
    lastAction = `error: ${e instanceof Error ? e.message : e}`;
  }
}
