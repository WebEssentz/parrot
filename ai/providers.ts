// FILE: ai/provider.ts

import { google } from "@ai-sdk/google";
import {
  customProvider,
} from "ai";

const languageModels = {
  "gemini-2.5-flash": google(
    "gemini-2.5-flash",
  ),
  // Add the lite model for signed-out users
  "gemini-2.5-flash-lite-preview-06-17": google(
    "gemini-2.5-flash-lite-preview-06-17",
  ),
  "gemini-2.5-flash-preview-05-20": google(
    "gemini-2.5-flash-preview-05-20"
  ),
  "gemini-2.5-flash-preview-04-17": google(
    "gemini-2.5-flash-preview-04-17"
  ),
};


export const model = customProvider({
  languageModels,
});

export type modelID = keyof typeof languageModels;

export const MODELS = Object.keys(languageModels);

/**
 * Returns the default model ID based on sign-in status.
 * If signed in: "gemini-2.5-flash"
 * If not signed in: "gemini-2.5-flash-preview-05-20"
 *
 * Usage: getDefaultModel(isSignedIn)
 */
export function getDefaultModel(isSignedIn: boolean): modelID {
  return isSignedIn ? "gemini-2.5-flash" : "gemini-2.5-flash-preview-05-20";
}

// For legacy usage, keep the old export (signed-in default)
export const defaultModel: modelID = "gemini-2.5-flash";