import { groq } from "@ai-sdk/groq";
import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from "ai";

const languageModels = {
  "meta-llama/llama-4-scout-17b-16e-instruct": groq(
    "meta-llama/llama-4-scout-17b-16e-instruct",
  ),
  "llama-3.1-8b-instant": groq("llama-3.1-8b-instant"),
  "deepseek-r1-distill-llama-70b": wrapLanguageModel({
    middleware: extractReasoningMiddleware({
      tagName: "think",
    }),
    model: groq("deepseek-r1-distill-llama-70b"),
  }),
  "llama-3.3-70b-versatile": groq("llama-3.3-70b-versatile"),
};

export const model = customProvider({
  languageModels,
});

export type modelID = keyof typeof languageModels;

export const MODELS = Object.keys(languageModels);

export const defaultModel: modelID =
  "meta-llama/llama-4-scout-17b-16e-instruct";

export const MODEL_DISPLAY_NAMES: Record<modelID, string> = {
  "meta-llama/llama-4-scout-17b-16e-instruct": "Llama 4 Scout 17B",
  "llama-3.1-8b-instant": "Llama 3.1 8B Instant",
  "deepseek-r1-distill-llama-70b": "DeepSeek R1 Distill 70B",
  "llama-3.3-70b-versatile": "Llama 3.3 70B Versatile",
};
