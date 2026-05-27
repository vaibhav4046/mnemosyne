import { chatOnce } from "../ollama";
import { search } from "../vector";
import type { AgentRunner } from "./types";

export type QueryInput = { question: string };

export const queryRunner: AgentRunner = async (job, log) => {
  const input = job.input as QueryInput;
  log(`Retrieving context for: ${input.question}`);
  const hits = await search(input.question, 6);
  const ctx = hits.map((h, i) => `[${i + 1}] (${h.source}) ${h.text}`).join("\n\n");
  const answer = await chatOnce([
    { role: "system", content: "Answer using the cited context. Cite as [1], [2] etc." },
    { role: "user", content: `Context:\n${ctx}\n\nQuestion: ${input.question}` },
  ]);
  return { answer, citations: hits.map((h) => ({ source: h.source, title: h.title, score: h.score })) };
};
