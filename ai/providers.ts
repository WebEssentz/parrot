import { groq } from "@ai-sdk/groq";
import { google } from "@ai-sdk/google";
import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from "ai";


// meta-llama/llama-4-scout-17b-16e-instruct
const languageModels = {
  "gemini-2.0-flash": google(
    "gemini-2.0-flash",
  ),
  "llama-3.1-8b-instant": groq("llama-3.1-8b-instant"),
  "qwen-qwq-32b": wrapLanguageModel({
    middleware: extractReasoningMiddleware({
      tagName: "think",
    }),
    model: groq("qwen-qwq-32b"),
  }),
  "llama-3.3-70b-versatile": groq("llama-3.3-70b-versatile"),
};

export const model = customProvider({
  languageModels,
});

export type modelID = keyof typeof languageModels;

export const MODELS = Object.keys(languageModels);

export const defaultModel: modelID = "gemini-2.0-flash";