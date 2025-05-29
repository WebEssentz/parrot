// app/api/chat/route.ts

import { defaultModel, model, modelID } from "@/ai/providers";
import { weatherTool, fetchUrlTool, googleSearchTool } from "@/ai/tools";
// --- Robust FetchUrlTool Retry Logic ---
// This function wraps fetchUrlTool execution with automatic retries if results are insufficient or user requests to "go deeper"
export async function robustFetchUrlTool(params: any, userMessage: string, maxDepth = 5, maxPagesLimit = 20) {
  let { recursionDepth = 1, maxPages = 5, ...rest } = params;
  let attempt = 0;
  let result;
  let reason = '';
  let userRequestedDeeper = /go deeper|deeper|more depth|try again|fetch more|get more|not enough|incomplete|missing|insufficient/i.test(userMessage);
  while (attempt < maxDepth) {
    // Clamp maxPages to maxPagesLimit
    const currentMaxPages = Math.min(maxPages, maxPagesLimit);
    result = await fetchUrlTool.execute({
      ...rest,
      recursionDepth,
      maxPages: currentMaxPages,
    }, {
      toolCallId: `robust-fetch-url-${attempt}`,
      messages: [],
    });
    // Detect insufficient result: empty tables, no productCards, error, or explicit user request
    const insufficient =
      (result && ((Array.isArray(result.extractedTables) && result.extractedTables.length === 0)
        || (Array.isArray(result.productCards) && result.productCards.length === 0)
        || (result.error && typeof result.error === 'string')
        || (result.siteType === 'general' && (!result.summary || result.summary.length < 100))
        || userRequestedDeeper));
    if (!insufficient) {
      break;
    }
    attempt++;
    recursionDepth = Math.min(recursionDepth + 1, maxDepth);
    maxPages = Math.min(currentMaxPages + 3, maxPagesLimit);
    reason += `Not enough data found at depth ${recursionDepth - 1}, trying depth ${recursionDepth} (maxPages ${maxPages})...\n`;
    userRequestedDeeper = false; // Only trigger once per user message
  }
  if (reason) {
    // Attach retry info for LLM/user
    result.retryInfo = reason.trim();
  }
  return result;
}
import { smoothStream, streamText, UIMessage } from "ai";
import { SEARCH_MODE } from "@/components/ui/textarea";
import { generateText } from 'ai';

export const maxDuration = 60;
const REASON_MODEL_ID = "qwen-qwq-32b";

// Define suggested prompts highlighting Avurna capabilities
const AVURNA_SUGGESTED_PROMPTS = [
  "Give me some fun activities I can do today",
  "Generate an image of a futuristic cityscape",
  "Help me debug this Python code for web scraping",
  "Explain how API integration works.",
  "I'm starving, suggest a recipe for dinner",
  "Help me optimize my project workflow",
  "Help me solve a maths problem",
  "Help me write a story",
  "Summarize this website: https://apple.com",
];

export async function POST(req: Request) {
  const requestBody = await req.json();
  let {
    messages,
    selectedModel,
    action, // Expect 'action' in the request body
  } = requestBody;

  // --- FILTER OUT EMPTY MESSAGES (prevents Gemini API error) ---
  if (Array.isArray(messages)) {
    messages = messages.filter((msg) => {
      // If content is a string, must be non-empty
      if (typeof msg.content === 'string') return msg.content.trim().length > 0;
      // If content is an array, must have at least one non-empty part
      return (msg.content as (string | { text: string })[]).length > 0 && (msg.content as (string | { text: string })[]).some((part: string | { text: string }) => {
        if (typeof part === 'string') return part.trim().length > 0;
        if (typeof part === 'object' && part !== null && 'text' in part) return String((part as { text: string }).text).trim().length > 0;
        return false;
      });
    });
  }

  // --- Suggested Prompts Handling ---
  if (action === 'getSuggestedPrompts') {
    return new Response(JSON.stringify({ prompts: AVURNA_SUGGESTED_PROMPTS }), {
      headers: { 'Content-Type': 'application/json' }, status: 200,
    });
  }

  // --- Title Generation Handling ---
  if (action === 'generateTitle' && messages && messages.length > 0) {
    const userMessageContent = messages[messages.length - 1]?.content ?? '';
    const titleSystemPrompt = `You are an expert title generator. Based ONLY on the following user message, create a concise and relevant title (3-5 words) for the chat conversation. Output ONLY the title text, absolutely nothing else (no quotes, no extra words). If the message is vague, create a generic title like "New Chat".

    User Message: "${userMessageContent}"`;
    try {
      const response = await generateText({
        model: model.languageModel(defaultModel),
        system: titleSystemPrompt,
        prompt: `Generate a title for the conversation starting with the user message.`
      });
      let generatedTitle = response.text.trim()
        .replace(/^(Title:|"|“|Title is |Chat Title: |Conversation: )+/i, '')
        .replace(/("|”)$/, '')
        .trim();
      if (!generatedTitle || generatedTitle.length < 3 || generatedTitle.length > 60) {
        generatedTitle = "Avurna AI";
      }
      return new Response(JSON.stringify({ title: generatedTitle }), {
        headers: { 'Content-Type': 'application/json' }, status: 200,
      });
    } catch (error) {
      console.error("Title generation error:", error);
      return new Response(JSON.stringify({ title: "Avurna AI" }), {
        headers: { 'Content-Type': 'application/json' }, status: 500,
      });
    }
  }

  // --- Existing Streaming Chat Logic ---
  if (!messages || typeof selectedModel === 'undefined') {
    return new Response(JSON.stringify({ error: "Missing messages or selectedModel for chat request" }), {
      headers: { 'Content-Type': 'application/json' }, status: 400,
    });
  }



  // --- SMART RECURSION PARAMETER HANDLING FOR fetchUrlTool ---
  // If the user message contains a URL, and the tool params for recursionDepth/maxPages/timeoutMs are not specified,
  // prompt the user for recursion depth, and infer smart defaults based on context, site type, and user intent.
  // This logic is more than 10 lines and is designed to be "damn smart" and adaptive.

  // Helper: Extract first URL from user message
  function extractUrl(text: string): string | null {
    const urlRegex = /(https?:\/\/[\w\-\.]+(:\d+)?(\/[\w\-\.\/?#=&%]*)?)/i;
    const match = text.match(urlRegex);
    return match ? match[1] : null;
  }

  // Helper: Extract recursion params from user message
  function extractRecursionParams(text: string): { recursionDepth?: number, maxPages?: number, timeoutMs?: number } {
    const params: any = {};
    const depthMatch = text.match(/recursion(depth)?\s*[:=]?\s*(\d+)/i);
    if (depthMatch) params.recursionDepth = parseInt(depthMatch[2], 10);
    const maxPagesMatch = text.match(/max(pages)?\s*[:=]?\s*(\d+)/i);
    if (maxPagesMatch) params.maxPages = parseInt(maxPagesMatch[2], 10);
    const timeoutMatch = text.match(/timeout(ms)?\s*[:=]?\s*(\d+)/i);
    if (timeoutMatch) params.timeoutMs = parseInt(timeoutMatch[2], 10);
    return params;
  }

  // Helper: Smart defaults based on site type or intent
  function smartRecursionDefaults(url: string, userIntent: string): { recursionDepth: number, maxPages: number, timeoutMs: number } {
    // News/blogs: go deeper, e-commerce: shallow, general: conservative
    if (/news|blog|hn\.ycombinator|reddit|forum|discussion/i.test(url)) {
      return { recursionDepth: 2, maxPages: 8, timeoutMs: 12000 };
    }
    if (/amazon|ebay|walmart|shop|store|product|cart/i.test(url)) {
      return { recursionDepth: 1, maxPages: 5, timeoutMs: 10000 };
    }
    if (/youtube|video|playlist/i.test(url)) {
      return { recursionDepth: 1, maxPages: 3, timeoutMs: 9000 };
    }
    if (/docs|faq|help|support/i.test(url)) {
      return { recursionDepth: 1, maxPages: 4, timeoutMs: 9000 };
    }
    if (/table|data|csv|spreadsheet/i.test(userIntent)) {
      return { recursionDepth: 0, maxPages: 2, timeoutMs: 8000 };
    }
    // Default: conservative
    return { recursionDepth: 1, maxPages: 5, timeoutMs: 10000 };
  }


  // --- Main smart recursion logic ---
  const lastUserMessage = (messages as UIMessage[]).filter(msg => msg.role === 'user').pop();
  let recursionParams: { recursionDepth?: number, maxPages?: number, timeoutMs?: number } = {};
  let urlToAnalyze: string | null = null;
  let userIntent: string = '';
  const lastUserMessageContent = lastUserMessage?.content || '';
  if (lastUserMessageContent) {
    userIntent = lastUserMessageContent;
    urlToAnalyze = extractUrl(lastUserMessageContent);
    recursionParams = extractRecursionParams(lastUserMessageContent);
  }

  // If user only pasted a link (no other text/instructions), let the AI handle intent clarification and suggestions via system prompt (do not call fetchUrlTool automatically).

  // If user gave a URL and some instructions, infer smart defaults (no prompt)
  if (urlToAnalyze) {
    const smartDefaults = smartRecursionDefaults(urlToAnalyze, userIntent);
    recursionParams = {
      recursionDepth: typeof recursionParams.recursionDepth === 'number' ? recursionParams.recursionDepth : smartDefaults.recursionDepth,
      maxPages: typeof recursionParams.maxPages === 'number' ? recursionParams.maxPages : smartDefaults.maxPages,
      timeoutMs: typeof recursionParams.timeoutMs === 'number' ? recursionParams.timeoutMs : smartDefaults.timeoutMs,
    };
  }

  // --- Automatic & LLM-guided Recursion Retry Logic for fetchUrlTool ---
  // If the last assistant/tool message is a fetchUrlTool result and is insufficient, retry with higher depth/maxPages (up to safe max)
  // If user says "go deeper", force a retry
  // Inform the LLM/user of each attempt
  // This logic is transparent to the LLM, but the LLM can still request further retries

  // Helper: Detect if user wants to go deeper
  function userWantsToGoDeeper(text: string): boolean {
    return /go deeper|try again|more depth|increase depth|fetch more|get more|expand|broaden|explore further|dig deeper/i.test(text);
  }

  // Helper: Detect if fetchUrlTool result is insufficient
  function isFetchResultInsufficient(result: any): boolean {
    if (!result) return true;
    if (result.error) return true;
    if (result.type === 'website') {
      // Not enough tables, product cards, or summary too short
      if ((Array.isArray(result.extractedTables) && result.extractedTables.length === 0) &&
          (Array.isArray(result.productCards) && result.productCards.length === 0) &&
          (!result.summary || result.summary.length < 100)) {
        return true;
      }
    }
    if (result.type === 'image_analyzed' && (!result.analysis || result.analysis.length < 20)) return true;
    return false;
  }

  // Max recursion parameters
  const MAX_RECURSION_DEPTH = 5;
  const MAX_PAGES = 20;

  // If a fetchUrlTool call is needed, handle automatic retries here
  async function robustFetchUrlTool(params: any, userMessage: string) {
    let { recursionDepth, maxPages, timeoutMs, ...rest } = params;
    recursionDepth = typeof recursionDepth === 'number' ? recursionDepth : 1;
    maxPages = typeof maxPages === 'number' ? maxPages : 5;
    timeoutMs = typeof timeoutMs === 'number' ? timeoutMs : 10000;
    let attempt = 0;
    let result = null;
    let goDeeperRequested = userWantsToGoDeeper(userMessage);
    let informMessages: string[] = [];
    while (attempt < MAX_RECURSION_DEPTH) {
      attempt++;
      result = await fetchUrlTool.execute({
        ...rest,
        recursionDepth,
        maxPages,
        timeoutMs,
      }, {
        toolCallId: `robust-fetch-url-${attempt}`,
        messages: [],
      });
      if (!isFetchResultInsufficient(result) && !goDeeperRequested) break;
      if (recursionDepth >= MAX_RECURSION_DEPTH || maxPages >= MAX_PAGES) break;
      // Inform user/LLM
      informMessages.push(`Not enough data found at depth ${recursionDepth}, trying depth ${recursionDepth + 1} (maxPages ${Math.min(maxPages + 5, MAX_PAGES)})...`);
      recursionDepth++;
      maxPages = Math.min(maxPages + 5, MAX_PAGES);
      goDeeperRequested = false; // Only honor explicit request once
    }
    return { result, informMessages };
  }

  const now = new Date();
  // ... (rest of your existing system prompt and chat logic) ...
  const currentDate = now.toLocaleString('en-US', { timeZone: 'UTC', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  const birthDate = new Date('2009-06-17T00:00:00Z');
  let age = now.getUTCFullYear() - birthDate.getUTCFullYear();
  const m = now.getUTCMonth() - birthDate.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < birthDate.getUTCDate())) { age--; }
  const BirthDate = new Date('2009-05-28T00:00:00Z');
  let Age = now.getUTCFullYear() - BirthDate.getUTCFullYear();
  const M = now.getUTCMonth() - BirthDate.getUTCMonth();
  if (M < 0 || (M === 0 && now.getUTCDate() < BirthDate.getUTCDate())) { Age--; }

  // Dynamic prompt assembly
  const fs = require("fs");
  const path = require("path");
  const promptDir = path.resolve(process.cwd(), "prompts");
  let systemPrompt = fs.readFileSync(path.join(promptDir, "criticalPrompt.txt"), "utf8");
  // Always include critical rules
  // Always include the tool selection policy and system prompt
  systemPrompt += "\n\n" + fs.readFileSync(path.join(promptDir, "systemPrompt.txt"), "utf8");
  // Add Agent X prompt if user intent is web/automation (URL present or web task keywords)
  const agentXNeeded = !!urlToAnalyze || /website|site|web|browser|agent|automation|scrape|extract|analyze|navigate|product|video|post|news|shopping|social|table|data|csv|spreadsheet/i.test(userIntent);
  if (agentXNeeded) {
    systemPrompt += "\n\n" + fs.readFileSync(path.join(promptDir, "agentXPrompt.txt"), "utf8");
  }

  const isFrontendRequestingSearch = selectedModel === SEARCH_MODE;
  // (moved up for recursion logic)
  // (moved up above for recursion logic)

  let googleSearchAttemptsForThisQuery = 0;
  if (lastUserMessage) {
    let currentTurnMessages = messages as UIMessage[];
    const lastUserMessageIndex = messages.map((m: UIMessage) => m.id).lastIndexOf(lastUserMessage.id);
    if (lastUserMessageIndex !== -1) {
      currentTurnMessages = messages.slice(lastUserMessageIndex);
    }

    for (const msg of currentTurnMessages) {
      if (msg.role === 'assistant' && msg.toolInvocations) {
        for (const ti of msg.toolInvocations) {
          if ((ti.toolName === 'googleSearch' || ti.toolName === 'googleSearchTool') &&
            (typeof ti.args === 'string' && ti.args.includes(lastUserMessageContent)) ||
            (typeof ti.args === 'object' && ti.args && JSON.stringify(ti.args).includes(lastUserMessageContent))
          ) {
            googleSearchAttemptsForThisQuery++;
          }
        }
      }
    }
  }

  const forceInitialGoogleSearch = isFrontendRequestingSearch &&
    googleSearchAttemptsForThisQuery === 0 &&
    messages[messages.length - 1]?.role !== 'function';

  let actualModelIdForLLM: modelID;
  if (isFrontendRequestingSearch) {
    actualModelIdForLLM = REASON_MODEL_ID;
  } else if (selectedModel === REASON_MODEL_ID) {
    actualModelIdForLLM = REASON_MODEL_ID;
  } else if (selectedModel === defaultModel || !selectedModel) {
    actualModelIdForLLM = defaultModel;
  } else {
    actualModelIdForLLM = selectedModel as modelID;
  }

  try {
    model.languageModel(actualModelIdForLLM);
  } catch (e: any) {
    if (e.constructor?.name === 'AI_NoSuchModelError' || e.message?.includes('No such languageModel')) {
      console.warn(`LLM ID "${actualModelIdForLLM}" is not valid. Falling back to defaultModel "${defaultModel}". Frontend selectedModel: "${selectedModel}"`);
      actualModelIdForLLM = defaultModel;
    } else {
      throw e;
    }
  }
  const languageModel = model.languageModel(actualModelIdForLLM);

  console.log(`API Request: Frontend selectedModel = "${selectedModel}", forceInitialGoogleSearch = ${forceInitialGoogleSearch}, googleSearchAttemptsForThisQuery = ${googleSearchAttemptsForThisQuery}, Using LLM = "${actualModelIdForLLM}"`);


  // --- Tool Wrapping: Intercept fetchUrl tool calls for robust retry ---
  const wrappedTools = {
    getWeather: weatherTool,
    fetchUrl: {
      ...fetchUrlTool,
      execute: async (params: any) => {
        // Find the last user message for context
        const lastUserMsg = (messages as UIMessage[]).filter(msg => msg.role === 'user').pop();
        const userMsgContent = lastUserMsg?.content || '';
        const result = await robustFetchUrlTool(params, userMsgContent);
        // If there was a retry, inject a system message for LLM/user
        if (result && result.result && result.result.retryInfo) {
          // Optionally, you could push a message to the stream or log here
          console.log('FetchUrlTool retry info:', result.result.retryInfo);
        }
        return result.result;
      },
    },
    googleSearch: googleSearchTool,
  };

  const result = streamText({
    model: languageModel,
    system: systemPrompt,
    messages: messages as UIMessage[],
    experimental_transform: smoothStream({ delayInMs: 20, chunking: 'word' }),
    tools: wrappedTools,
    toolCallStreaming: true,
    experimental_telemetry: { isEnabled: true },
    ...(forceInitialGoogleSearch && { toolChoice: { type: 'tool', toolName: 'googleSearch' } }),
  });

  return result.toDataStreamResponse({
    sendReasoning: true,
    experimental_sendStart: true,
    getErrorMessage: (error) => {
      if (error instanceof Error) {
        if (error.message.includes("API key not valid")) {
          return "Invalid Google API Key detected. Please check configuration.";
        }
        if (error.message.includes("Rate limit")) {
          return "Rate limit exceeded. Please try again later.";
        }
        if (error.constructor.name === 'AI_NoSuchModelError') {
          console.error("Error: AI_NoSuchModelError during streaming response.", error);
          return `Error: The AI model specified (${(error as any).modelId}) is not available. Please try again or contact support.`;
        }
      }
      console.error("Streaming Error:", error);
      return "An unexpected error occurred. Please try again.";
    },
  });
}