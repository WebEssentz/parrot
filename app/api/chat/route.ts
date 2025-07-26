// FILE: app/api/chat/route.ts

import { smoothStream, streamText, UIMessage } from "ai";
import { generateText } from 'ai';
import { defaultModel, model, modelID } from "@/ai/providers";
import { weatherTool, fetchUrlTool, exaSearchTool, githubTool } from "@/ai/tools";

export const maxDuration = 60;

// Helper to select the reasoning model based on user sign-in status
function getReasonModelId(user: any) {
  return user && user.email
    ? "gemini-2.5-flash"
    : "gemini-2.5-flash-preview-05-20";
}

// Define suggested prompts highlighting Avurna capabilities
// --- NEW: Grouped and Themed Suggested Prompts ---
const PROMPT_GROUPS = {
  dev: [
    "Improve the performance of `utils.js` in the `facebook/react` repo.",
    "Write a Python script to scrape the top 5 posts from Hacker News.",
    "Refactor this messy JavaScript function to be more readable and efficient.",
    "Explain the concept of 'git rebase' like I'm five.",
    "Draft a GitHub Actions workflow to run tests on every pull request.",
    "Debug this SQL query; it's running too slow.",
    "Build a simple snake game in JavaScript.",
    "What are the key differences between REST and GraphQL APIs?",
    "Create a Dockerfile for a basic Node.js Express app.",
    "Summarize the latest open issues in the `vercel/next.js` repository.",
  ],
  creative: [
    "Write the opening scene of a sci-fi noir mystery.",
    "Give me three compelling names for a new coffee brand.",
    "Help me outline a blog post about the future of AI.",
    "Create a short, emotional story about a robot who learns to dream.",
    "Write a witty and professional LinkedIn post announcing a new job.",
    "Brainstorm a marketing tagline for a new sustainable fashion line.",
    "Compose a poem about the feeling of logging off after a long day.",
    "Help me write a difficult email to a client about a project delay.",
    "Generate a character profile for a cynical detective with a secret.",
    "Turn this list of features into an exciting product announcement.",
  ],
  curator: [
    "Show me images of the latest iPhone from apple.com.",
    "Show me the music video for the current #1 song on the Billboard Hot 100.",
    "Summarize the key arguments in this article: https://www.theverge.com/2024/1/25/24049387/google-search-ai-sge-results-quality",
    "What are the top 3 trending videos on YouTube right now?",
    "Find me a great recipe for spaghetti carbonara.",
    "Give me a brief overview of the latest developments in fusion energy.",
    "Extract all the product names and prices from this ecommerce page: https://store.google.com/",
    "Create a 5-song playlist with a similar vibe to Tame Impala.",
    "Who won the F1 race last weekend and what was the key moment?",
    "What are some highly-rated, affordable restaurants near me?",
  ],
  strategist: [
    "Help me solve this probability problem: If I roll two dice, what are the odds of getting a sum of 8?",
    "I'm planning a trip to Japan. Create a 7-day itinerary for Tokyo and Kyoto.",
    "Explain the core concepts of blockchain technology in simple terms.",
    "Compare the pros and cons of investing in stocks vs. real estate in a table.",
    "Help me create a budget for a personal project with a $1000 limit.",
    "What are some effective strategies for learning a new language?",
    "Break down the steps to starting a successful podcast.",
    "Analyze the strengths and weaknesses of a SWOT analysis.",
    "Give me a logical framework for making a difficult life decision.",
    "Explain 'First Principles' thinking with a real-world example.",
  ],
  casual: [
    "Give me some fun activities I can do this weekend.",
    "Tell me a surprisingly interesting fact.",
    "I'm bored. Suggest a new hobby I could pick up.",
    "Draft a funny, slightly sarcastic out-of-office email response.",
    "What's a great movie to watch tonight if I'm in the mood for a thriller?",
    "If animals could talk, which species would be the rudest?",
    "Give me a workout routine I can do at home with no equipment.",
    "I'm starving. Suggest a quick and easy recipe for dinner.",
    "Help me plan a surprise birthday party for a friend.",
    "Tell me a joke that's actually funny.",
  ],
};

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
      // If result is sufficient, return immediately
      return result;
    }
    attempt++;
    recursionDepth = Math.min(recursionDepth + 1, maxDepth);
    maxPages = Math.min(currentMaxPages + 3, maxPagesLimit);
    reason += `Not enough data found at depth ${recursionDepth - 1}, trying depth ${recursionDepth} (maxPages ${maxPages})...\n`;
    userRequestedDeeper = false; // Only trigger once per user message
  }
  // After maxDepth attempts, always return the last result, even if insufficient
  if (reason) {
    if (result && typeof result === 'object') {
      result.retryInfo = reason.trim();
    }
  }
  return result;
}

export async function POST(req: Request) {
  const requestBody = await req.json();
  let {
    messages,
    selectedModel,
    action, // Expect 'action' in the request body
    user, // { firstName, email }
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
    // The server's only job is to send the full, unchanging list of all prompts.
    return new Response(JSON.stringify({ promptGroups: PROMPT_GROUPS }), {
      headers: { 'Content-Type': 'application/json' }, status: 200,
    });
  }

  // --- Title Generation Handling (Robust: Only generate if message is clear) ---
  if (action === 'generateTitle' && messages && messages.length > 0) {

    const userMessageContent = messages[messages.length - 1]?.content ?? '';

    // Improved vague message detection: only treat as vague if the entire message is a short greeting or filler, not if it contains a real question or statement.
    function isVagueMessage(msg: string) {
      if (!msg || typeof msg !== 'string') return true;
      const trimmed = msg.trim();
      if (trimmed.length < 2) return true;
      // Only treat as vague if the WHOLE message is a greeting/filler, not if it contains a question or real content
      const vagueExact = [
        'hi', 'hello', 'hey', 'yo', 'sup', 'start', 'begin', 'new chat', 'test', 'ok', 'okay', 'help', 'continue', 'again', 'repeat', 'next', 'more', 'info', 'details', 'expand', 'elaborate', 'explain', 'yes', 'no', 'maybe', 'sure', 'thanks', 'thank you', 'cool', 'nice', 'good', 'great', 'awesome', 'wow', 'hmm', 'huh', 'pls', 'please'
      ];
      if (vagueExact.includes(trimmed.toLowerCase())) return true;
      // Only treat as vague if the message is just punctuation or whitespace
      if (/^\s*$/.test(trimmed) || /^([?.!\s]+)$/.test(trimmed)) return true;
      // If message is just a single word and not a question
      if (trimmed.split(/\s+/).length === 1 && !trimmed.endsWith('?')) return true;
      // Otherwise, not vague
      return false;
    }

    if (isVagueMessage(userMessageContent)) {
      // Signal to frontend to wait for a clearer message
      return new Response(JSON.stringify({ title: null, reason: "vague" }), {
        headers: { 'Content-Type': 'application/json' }, status: 200,
      });
    }

    // Only generate title if message is clear
    const titleSystemPrompt = `You are AVURNA an expert title generator. Based ONLY on the following user message, create a concise and relevant title (3-5 words) for the chat conversation. Output ONLY the title text, absolutely nothing else (no quotes, no extra words). If the message is vague, create a generic title like \"New Chat\".

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

  // --- URL Autocomplete Helper ---
  // Ensures that bare domains like "youtube.com" are converted to full URLs (e.g., "https://youtube.com")
  function autocompleteUrl(text: string): string {
    // If already a full URL, return as is
    if (/^https?:\/\//i.test(text)) return text;
    // If it looks like a domain (e.g., youtube.com, www.example.org)
    if (/^([\w-]+\.)+[a-z]{2,}(\/.*)?$/i.test(text.trim())) {
      return `https://${text.trim()}`;
    }
    return text;
  }

  // Helper: Extract first URL or domain from user message, and autocomplete if needed
  function extractUrl(text: string): string | null {
    // Match full URLs
    const urlRegex = /(https?:\/\/[\w\-\.]+(:\d+)?(\/[\w\-\.\/?#=&%]*)?)/i;
    const urlMatch = text.match(urlRegex);
    if (urlMatch) return urlMatch[1];
    // Match bare domains (e.g., youtube.com, www.example.org)
    const domainRegex = /\b([\w-]+\.)+[a-z]{2,}(\/[\w\-\.\/?#=&%]*)?/i;
    const domainMatch = text.match(domainRegex);
    if (domainMatch) return autocompleteUrl(domainMatch[0]);
    return null;
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

  // --- Dynamic prompt assembly ---
  const fs = require("fs");
  const path = require("path");
  const promptDir = path.resolve(process.cwd(), "prompts");
  
  // Load the single, consolidated system prompt. This is the only prompt file needed.
  let systemPrompt = fs.readFileSync(path.join(promptDir, "systemPrompt.txt"), "utf8");

  // Inject all dynamic values into the single prompt string
  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const currentDateString = now.toUTCString();
  const userFirstName = user?.firstName || "there";
  const userEmail = user?.email || "";

  systemPrompt = systemPrompt.replace(/\{currentYear\}/g, currentYear.toString());
  systemPrompt = systemPrompt.replace(/\{currentDate\}/g, currentDateString);
  systemPrompt = systemPrompt.replace(/\{userFirstName\}/g, userFirstName);
  systemPrompt = systemPrompt.replace(/\{userEmail\}/g, userEmail);

  // Dynamically select the reasoning model based on user sign-in status
  const REASON_MODEL_ID = getReasonModelId(user);

  // --- Simplified Model Selection Logic ---
  let actualModelIdForLLM: modelID;
  if (selectedModel === REASON_MODEL_ID) {
    actualModelIdForLLM = REASON_MODEL_ID;
  } else if (selectedModel === defaultModel || !selectedModel) {
    actualModelIdForLLM = defaultModel;
  } else {
    // This part handles other potential models you might add later
    actualModelIdForLLM = selectedModel as modelID;
  }

  // Validate the model ID
  try {
    model.languageModel(actualModelIdForLLM);
  } catch (e: any) {
    console.warn(`LLM ID "${actualModelIdForLLM}" is not valid. Falling back to defaultModel "${defaultModel}".`);
    actualModelIdForLLM = defaultModel;
  }
  const languageModel = model.languageModel(actualModelIdForLLM);

  console.log(`API Request: Using LLM = "${actualModelIdForLLM}"`);


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
    googleSearch: exaSearchTool,
    githubTool: githubTool,
  };

  const result = streamText({
    model: languageModel,
    system: systemPrompt,
    messages: messages as UIMessage[],
    temperature: 0,
    tools: wrappedTools,
    toolCallStreaming: true,
    experimental_telemetry: { isEnabled: true },
    ...(selectedModel === REASON_MODEL_ID && { // Apply thinkingConfig ONLY when REASON_MODEL_ID is selected
        providerOptions: {
            google: {
                thinkingConfig: {
                    thinkingBudget: 24576, // Adjust as needed
                    includeThoughts: true,
                },
            },
        },
      }
    ),
  });

  return result.toDataStreamResponse({
    sendReasoning: true,
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