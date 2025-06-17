import { groq } from "@ai-sdk/groq";
import { google } from "@ai-sdk/google";
import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from "ai";

// meta-llama/llama-4-scout-17b-16e-instruct
const languageModels = {
  "gemini-2.5-flash-preview-05-20": google(
    "gemini-2.5-flash-preview-05-20",
  ),
  // Add the lite model for signed-out users
  "gemini-2.0-flash-lite": google(
    "gemini-2.0-flash-lite",
  ),
  "llama-3.1-8b-instant": groq("llama-3.1-8b-instant"),
  // "qwen-qwq-32b": wrapLanguageModel({
  //   middleware: extractReasoningMiddleware({
  //     tagName: "think",
  //   }),
  //   model: groq("qwen-qwq-32b"),
  // }),
  "llama-3.3-70b-versatile": groq("llama-3.3-70b-versatile"),
};


export const model = customProvider({
  languageModels,
});

export type modelID = keyof typeof languageModels;

export const MODELS = Object.keys(languageModels);

/**
 * Returns the default model ID based on sign-in status.
 * If signed in: "gemini-2.5-flash-preview-05-20"
 * If not signed in: "gemini-2.0-flash-lite"
 *
 * Usage: getDefaultModel(isSignedIn)
 */
export function getDefaultModel(isSignedIn: boolean): modelID {
  return isSignedIn ? "gemini-2.5-flash-preview-05-20" : "gemini-2.0-flash-lite";
}

// For legacy usage, keep the old export (signed-in default)
export const defaultModel: modelID = "gemini-2.5-flash-preview-05-20";