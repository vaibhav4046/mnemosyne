/**
 * Compatibility shim. The real implementation now lives in providers.ts, which
 * routes chat/embed/JSON across Ollama (local) + Groq + Gemini + OpenRouter with
 * automatic fallback. Existing imports from "../ollama" keep working unchanged.
 */
export type { ChatMessage } from "./providers";
export {
  chatStream,
  chatOnce,
  generateJSON,
  embed,
  embedBatch,
  warmup,
  providerStatus,
  listOllamaModels,
  OLLAMA_HOST,
  KEEP_ALIVE,
  ollama,
} from "./providers";

import { listOllamaModels } from "./providers";
import { DEFAULT_MODELS } from "./settings";

export const DEFAULT_CHAT_MODEL = DEFAULT_MODELS.ollama;
export const DEFAULT_EMBED_MODEL = "nomic-embed-text";

/** Legacy name kept for callers that listed Ollama models directly. */
export async function listModels(): Promise<string[]> {
  return listOllamaModels();
}
