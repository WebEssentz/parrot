// FILE: ai/tools.ts

import Exa from "exa-js"; // Correct Exa import
// import { franc } from 'franc'; // For automatic language detection - Not used in this snippet, can be removed if not used elsewhere
import { tool } from "ai";
import { z } from "zod";
import { google } from '@ai-sdk/google';      // For Google AI models
import { generateText } from 'ai';         // For generating text with AI models
import { Octokit } from "octokit";

// Initialize Exa client with your API key from the environment
const exa = new Exa("af94b87b-cc3e-43b0-80c2-fd73198009d2"); // Ensure this is your actual API key or managed securely
const octokit = new Octokit({ auth: process.env.GITHUB_API_TOKEN });

// --- Vision-based Image Filtering Utility ---
/**
 * Filters images using a vision model to ensure relevance to the user's intent.
 * Skips filtering for subjective queries (e.g., "sexy car").
 * @param images Array of images ({ src, alt, ... })
 * @param userQuery The user's original query
 * @param userIntent The extracted intent object (optional, for modality/qualifiers)
 * @returns { filtered: Image[], all: Image[], filteringApplied: boolean, warning?: string }
 */
export async function filterImagesWithVision(
  images: Array<{ src: string; alt?: string;[key: string]: any }>,
  userQuery: string,
  userIntent: { modality?: string } | null = null
): Promise<{
  filtered: typeof images;
  all: typeof images;
  filteringApplied: boolean;
  warning?: string;
}> {
  // Subjectivity detection: skip filtering for subjective queries
  const subjectiveWords = [
    'sexy', 'beautiful', 'cute', 'hot', 'gorgeous', 'pretty', 'handsome', 'ugly', 'attractive', 'aesthetic',
    'cool', 'funny', 'weird', 'strange', 'creepy', 'disturbing', 'artistic', 'stylish', 'awesome', 'amazing',
    'inspiring', 'breathtaking', 'adorable', 'silly', 'hilarious', 'sad', 'happy', 'emotional', 'moody',
    'romantic', 'dreamy', 'vintage', 'retro', 'futuristic', 'minimalist', 'maximalist', 'abstract', 'surreal',
    'impressionist', 'expressionist', 'dramatic', 'epic', 'intense', 'provocative', 'suggestive', 'explicit',
    'nsfw', 'lewd', 'erotic', 'porn', 'nude', 'naked', 'sensual', 'fetish', 'fetishy', 'fetishistic', 'kinky',
    'sexy', 'sex', 'sexual', 'provocative', 'suggestive', 'explicit', 'nsfw', 'lewd', 'erotic', 'porn', 'nude', 'naked', 'sensual', 'fetish', 'fetishy', 'fetishistic', 'kinky'
  ];
  const q = userQuery.toLowerCase();
  if (subjectiveWords.some(w => q.includes(w))) {
    return {
      filtered: images,
      all: images,
      filteringApplied: false,
      warning: 'Vision filtering skipped for subjective queries.'
    };
  }
  // Only apply for objective image queries
  const isObjective = (userIntent && userIntent.modality === 'image') || /\b(image|photo|picture|wallpaper|gallery|pic|jpeg|jpg|png|gif|unsplash|pinterest|flickr|stock)\b/i.test(userQuery);
  if (!isObjective) {
    return {
      filtered: images,
      all: images,
      filteringApplied: false
    };
  }
  // Vision model scoring
  const visionModel = google('gemma-3-27b-it');
  const threshold = 0.85; // Stricter threshold
  const results = [];
  for (const img of images.slice(0, 10)) {
    try {
      const prompt = `Does this image clearly show ALL of the following: ${userQuery}? Be strict. Only give high confidence if every element is present and obvious.\nImage URL: ${img.src}\nRespond as JSON: { \"description\": \"15-word description\", \"confidence\": \"0.0-1.0\" }`;
      const { text } = await generateText({ model: visionModel, prompt, temperature: 0.2 });
      const parsed = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || '{}');
      const confidence = Number(parsed.confidence) || 0;
      if (confidence >= threshold) {
        results.push({ ...img, description: parsed.description || '', confidence });
      }
    } catch (e) {
      // On error, skip image
    }
  }
  // Sort by confidence
  results.sort((a, b) => b.confidence - a.confidence);
  return {
    filtered: results,
    all: images,
    filteringApplied: true
  };
}

// --- Vision-based Video Filtering Utility ---
/**
 * Filters videos using a vision/multimodal model to ensure relevance to the user's intent.
 * Skips filtering for subjective queries (e.g., "funny cat video").
 * @param videos Array of videos ({ src, poster, title, ... })
 * @param userQuery The user's original query
 * @param userIntent The extracted intent object (optional, for modality/qualifiers)
 * @returns { filtered: Video[], all: Video[], filteringApplied: boolean, warning?: string }
 */
export async function filterVideosWithVision(
  videos: Array<{ src: string; poster?: string; title?: string;[key: string]: any }>,
  userQuery: string,
  userIntent: { modality?: string } | null = null
): Promise<{
  filtered: typeof videos;
  all: typeof videos;
  filteringApplied: boolean;
  warning?: string;
}> {
  // Subjectivity detection: skip filtering for subjective queries
  const subjectiveWords = [
    'sexy', 'beautiful', 'cute', 'hot', 'gorgeous', 'pretty', 'handsome', 'ugly', 'attractive', 'aesthetic',
    'cool', 'funny', 'weird', 'strange', 'creepy', 'disturbing', 'artistic', 'stylish', 'awesome', 'amazing',
    'inspiring', 'breathtaking', 'adorable', 'silly', 'hilarious', 'sad', 'happy', 'emotional', 'moody',
    'romantic', 'dreamy', 'vintage', 'retro', 'futuristic', 'minimalist', 'maximalist', 'abstract', 'surreal',
    'impressionist', 'expressionist', 'dramatic', 'epic', 'intense', 'provocative', 'suggestive', 'explicit',
    'nsfw', 'lewd', 'erotic', 'porn', 'nude', 'naked', 'sensual', 'fetish', 'fetishy', 'fetishistic', 'kinky',
    'sexy', 'sex', 'sexual', 'provocative', 'suggestive', 'explicit', 'nsfw', 'lewd', 'erotic', 'porn', 'nude', 'naked', 'sensual', 'fetish', 'fetishy', 'fetishistic', 'kinky'
  ];
  const q = userQuery.toLowerCase();
  if (subjectiveWords.some(w => q.includes(w))) {
    return {
      filtered: videos,
      all: videos,
      filteringApplied: false,
      warning: 'Vision filtering skipped for subjective queries.'
    };
  }
  // Only apply for objective video queries
  const isObjective = (userIntent && userIntent.modality === 'video') || /\b(video|movie|film|clip|trailer|watch|youtube|vimeo|dailymotion)\b/i.test(userQuery);
  if (!isObjective) {
    return {
      filtered: videos,
      all: videos,
      filteringApplied: false
    };
  }
  // Strictly exclude channel/profile URLs (e.g., youtube.com/@channelname, youtube.com/channel/, youtube.com/user/)
  const isChannelOrProfileUrl = (url: string) => {
    try {
      const u = new URL(url);
      if (u.hostname.includes('youtube.com')) {
        if (/\/(@|channel\/|user\/|c\/)[^/]+/i.test(u.pathname) && !/\/watch\?v=|\/embed\//.test(u.pathname)) return true;
      }
      if (u.hostname.includes('tiktok.com') && /\/(@|user\/)[^/]+/i.test(u.pathname) && !/\/video\//.test(u.pathname)) return true;
      // Add more platforms as needed
    } catch { }
    return false;
  };
  // Vision model scoring (use poster/thumbnail if available, else video src)
  const visionModel = google('gemma-3-27b-it');
  const threshold = 0.85; // Stricter threshold
  const results = [];
  for (const vid of videos.slice(0, 10)) {
    // Exclude channel/profile URLs
    if (isChannelOrProfileUrl(vid.src)) continue;
    try {
      // Prefer poster/thumbnail for vision model, fallback to video src
      const mediaUrl = vid.poster || vid.src;
      const prompt = `Does this video (or its thumbnail) clearly show ALL of the following: ${userQuery}? Be strict. Only give high confidence if every element is present and obvious.\nMedia URL: ${mediaUrl}\nRespond as JSON: { \"description\": \"15-word description\", \"confidence\": \"0.0-1.0\" }`;
      const { text } = await generateText({ model: visionModel, prompt, temperature: 0.2 });
      const parsed = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || '{}');
      const confidence = Number(parsed.confidence) || 0;
      if (confidence >= threshold) {
        results.push({ ...vid, description: parsed.description || '', confidence });
      }
    } catch (e) {
      // On error, skip video
    }
  }
  // Sort by confidence
  results.sort((a, b) => b.confidence - a.confidence);
  return {
    filtered: results,
    all: videos,
    filteringApplied: true
  };
}

// --- Simple Markdown Bar Chart Generator (No changes) ---
function generateMarkdownBarChart(
  table: { headers: string[]; rows: Record<string, string>[] },
  column: string,
  options?: { maxBars?: number; maxWidth?: number }
): string | null {
  const maxBars = options?.maxBars ?? 10;
  const maxWidth = options?.maxWidth ?? 30;
  if (!table.headers.includes(column)) return null;
  const values = table.rows.map(row => {
    let val = row[column];
    if (!val) return null;
    val = val.replace(/[$,%]/g, '').replace(/,/g, '');
    const num = parseFloat(val);
    return isNaN(num) ? null : num;
  }).filter(v => v !== null) as number[];
  if (values.length === 0) return null;
  const sorted = values.slice().sort((a, b) => b - a).slice(0, maxBars);
  const max = Math.max(...sorted);
  if (max === 0) return null;
  let chart = `\n\n**Bar Chart for '${column}'**\n\n`;
  sorted.forEach((v, i) => {
    const bar = '█'.repeat(Math.round((v / max) * maxWidth));
    chart += `${v.toString()} | ${bar}\n`;
  });
  return chart;
}

// --- Utility: Format a value as inline code (No changes) ---
export function formatInlineCode(value: string): string {
  return `\`${value.replace(/`/g, '\u0060')}\``;
}
// --- Helper Function for Basic Table Parsing (No changes) ---
function parseHtmlTables(html: string): { headers: string[], rows: Record<string, string>[] }[] {
  const tables = [];
  const tableRegex = /<table[\s\S]*?>(.*?)<\/table>/gi;
  let tableMatch;

  while ((tableMatch = tableRegex.exec(html)) !== null && tables.length < 5) {
    const tableHtml = tableMatch[1];
    let headers: string[] = [];
    const rows: string[][] = [];
    const headerRegex = /<th[^>]*>([\s\S]*?)<\/th>/gi;
    const firstRowHeaderRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/i;
    const cellInHeaderRegex = /<(?:td|th)[^>]*>([\s\S]*?)<\/(?:td|th)>/gi;
    let headerMatch;
    let foundHeaders = false;

    while ((headerMatch = headerRegex.exec(tableHtml)) !== null) {
      headers.push(headerMatch[1].replace(/<[^>]+>/g, '').trim());
      foundHeaders = true;
    }

    if (!foundHeaders) {
      const firstRowMatch = firstRowHeaderRegex.exec(tableHtml);
      if (firstRowMatch) {
        let cellMatch;
        while ((cellMatch = cellInHeaderRegex.exec(firstRowMatch[1])) !== null) {
          headers.push(cellMatch[1].replace(/<[^>]+>/g, '').trim());
        }
        foundHeaders = headers.length > 0;
      }
    }

    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    let rowMatch;
    let rowsProcessed = 0;

    if (headers.length > 0 && !tableHtml.match(/<thead/i)) {
      rowRegex.exec(tableHtml);
    }

    while ((rowMatch = rowRegex.exec(tableHtml)) !== null && rowsProcessed < 50) {
      const cells: string[] = [];
      let cellMatch;
      while ((cellMatch = cellRegex.exec(rowMatch[1])) !== null) {
        cells.push(cellMatch[1].replace(/<[^>]+>/g, '').trim());
      }
      if (cells.length > 0 && (headers.length === 0 || cells.length === headers.length)) {
        rows.push(cells);
        rowsProcessed++;
      }
    }

    if (headers.length > 0 && rows.length > 0) {
      const tableData = rows.map(row => {
        const rowObj: Record<string, string> = {};
        headers.forEach((header, index) => {
          rowObj[header || `Column ${index + 1}`] = row[index] ?? '';
        });
        return rowObj;
      });
      tables.push({ headers, rows: tableData });
    } else if (headers.length === 0 && rows.length > 0) {
      const tableData = rows.map(row => {
        const rowObj: Record<string, string> = {};
        row.forEach((cell, index) => {
          rowObj[`Column ${index + 1}`] = cell ?? '';
        });
        return rowObj;
      });
      tables.push({ headers: rows[0] ? Object.keys(tableData[0]) : [], rows: tableData });
    }
  }
  return tables;
}


export const weatherTool = tool({
  description: "Get the weather in a location",
  parameters: z.object({
    location: z.string().describe("The location to get the weather for"),
  }),
  execute: async ({ location }) => ({
    location,
    temperature: 72 + Math.floor(Math.random() * 21) - 10,
  }),
});

// --- ENHANCED Intent Extraction Utility: Multi-LLM, More Modifiers ---
/**
 * Extracts user intent using multiple LLMs and a richer set of modifiers/qualifiers.
 * Tries several models and merges results for robustness.
 */
async function extractUserIntent(userMessage: string): Promise<{ object: string; modality: string; qualifiers: string[]; expanded: string[] }> {
  console.log(`[extractUserIntent] Starting for: "${userMessage}"`);
  // Expanded list of possible modifiers/qualifiers
  const extraQualifiers = [
    'latest', 'official', 'unofficial', 'verified', 'unverified', 'recent', 'oldest', 'top', 'trending', 'viral',
    'long', 'short', 'full', 'clip', 'teaser', 'trailer', 'episode', 'series', 'live', 'recorded', 'HD', '4K', '8K',
    'beginner', 'advanced', 'expert', 'tutorial', 'review', 'comparison', 'demo', 'walkthrough', 'explained',
    'step by step', 'deep dive', 'overview', 'guide', 'how to', 'tips', 'tricks', 'hack', 'strategy', 'insight',
    'analysis', 'breakdown', 'summary', 'recap', 'reaction', 'opinion', 'commentary', 'discussion', 'debate',
    'interview', 'Q&A', 'AMA', 'panel', 'presentation', 'talk', 'speech', 'conference', 'webinar', 'workshop',
    'case study', 'success story', 'fail', 'mistake', 'problem', 'solution', 'fix', 'update', 'patch', 'release',
    'leak', 'rumor', 'announcement', 'news', 'event', 'launch', 'preview', 'sneak peek', 'exclusive', 'behind the scenes',
    'official site', 'channel', 'account', 'profile', 'creator', 'author', 'publisher', 'organization', 'company',
    'AI', 'machine learning', 'coding', 'web', 'frontend', 'backend', 'stack', 'workflow', 'remote', 'onsite', 'hybrid',
    'salary', 'pay', 'job', 'career', 'opportunity', 'internship', 'freelance', 'contract', 'full time', 'part time',
    '2025', '2024', '2023', 'today', 'yesterday', 'this week', 'this month', 'this year', 'last year',
    // Add more as needed
  ];

  // Try multiple LLMs for robustness
  const models = [
    google('gemma-3n-e4b-it'),
    google('gemma-3-27b-it'),
    // Add more models here if available, e.g. openai('gpt-4o'),
  ];

  const prompt = `
    Analyze the following user request and extract the specified components.
    Return the output strictly as a JSON object with the keys: "object", "modality", "qualifiers", "expanded".
    - "object": The main subject or entity of interest (e.g., 'cat', 'Eiffel Tower', 'recipe for pasta'). BE SPECIFIC.
    - "modality": The type of media or information requested (e.g., 'image', 'video', 'article', 'summary', 'data'). If not specified, try to infer or leave empty. For "summarize this article", the modality is "summary".
    - "qualifiers": Descriptive adjectives or attributes modifying the object or modality (e.g., 'funny', 'high resolution', 'blue', 'quick', 'easy', plus: ${extraQualifiers.join(', ')}). List them as an array of strings. If none, provide an empty array [].
    - "expanded": Provide up to 3 synonyms or closely related terms for the "object" to aid in searching. List them as an array of strings. If none, provide an empty array [].

    User Request: "${userMessage}"

    JSON Output:
  `;

  let best: any = null;
  let bestScore = 0;
  let allQualifiers: string[] = [];
  let allExpanded: string[] = [];
  let allObjects: string[] = [];
  let allModalities: string[] = [];

  for (const model of models) {
    try {
      const { text } = await generateText({ model, prompt, temperature: 0.1 });
      let parsed: any;
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch && jsonMatch[0]) {
          parsed = JSON.parse(jsonMatch[0]);
        } else {
          parsed = JSON.parse(text);
        }
      } catch (e) {
        continue;
      }
      if (parsed) {
        // Score: more qualifiers and expanded = better
        const score = (Array.isArray(parsed.qualifiers) ? parsed.qualifiers.length : 0) + (Array.isArray(parsed.expanded) ? parsed.expanded.length : 0);
        if (score > bestScore) {
          best = parsed;
          bestScore = score;
        }
        if (Array.isArray(parsed.qualifiers)) allQualifiers.push(...parsed.qualifiers.map((q: any) => String(q).trim()).filter(Boolean));
        if (Array.isArray(parsed.expanded)) allExpanded.push(...parsed.expanded.map((e: any) => String(e).trim()).filter(Boolean));
        if (parsed.object) allObjects.push(String(parsed.object).trim());
        if (parsed.modality) allModalities.push(String(parsed.modality).trim());
      }
    } catch (error) {
      // Ignore model error, try next
    }
  }

  // Fallback if all fail
  if (!best) {
    return { object: userMessage, modality: '', qualifiers: [], expanded: [userMessage] };
  }

  // Merge and dedupe
  const mergedQualifiers = Array.from(new Set([...(best.qualifiers || []), ...allQualifiers, ...extraQualifiers.filter(q => userMessage.toLowerCase().includes(q.toLowerCase()))])).filter(Boolean);
  const mergedExpanded = Array.from(new Set([...(best.expanded || []), ...allExpanded])).filter(Boolean);
  const mergedObject = best.object || allObjects[0] || userMessage;
  const mergedModality = best.modality || allModalities[0] || '';

  const finalIntent = {
    object: mergedObject,
    modality: mergedModality,
    qualifiers: mergedQualifiers,
    expanded: mergedExpanded,
  };
  console.log("[extractUserIntent] Final merged intent:", finalIntent);
  return finalIntent;
}


// --- CORRECTED HYBRID FETCHURLTOOL (No changes to this specific tool based on the request) ---
export const fetchUrlTool = tool({
  description:
    "A hybrid tool that fetches content from a URL using two methods in parallel: a direct, vision-enabled recursive crawler and Exa's high-speed content extractor. It intelligently merges the results to provide the most accurate and comprehensive media, text, or summary.",
  parameters: z.object({
    url: z.string().describe("The starting URL to fetch and analyze."),
    userIntent: z.string().describe("The user's goal or question (e.g., 'image of an iPhone', 'summarize this article about macOS')."),
    recursionDepth: z.number().optional().describe("How many levels of links to follow (0 = current page only, default 1). Max 2."),
    liveCrawlMode: z.enum(["preferred", "always", "never"]).optional().describe("Exa LiveCrawl mode: 'preferred' (default) balances freshness and reliability; 'always' forces a live check; 'never' uses cache."),
  }),
  execute: async (params) => {
    const {
      url,
      userIntent,
      recursionDepth = 1,
      liveCrawlMode = "preferred",
    } = params;

    const timeoutMs = 45000;
    const overallStartTime = Date.now();

    console.log(`[Hybrid Fetch] Starting. URL: ${url}, Intent: "${userIntent}", Depth: ${recursionDepth}, Exa Mode: ${liveCrawlMode}`);

    const initialIntent = await extractUserIntent(userIntent);
    if (!initialIntent.object && !url.match(/\.(jpeg|jpg|png|gif|webp)$/i)) { // Allow direct image links to proceed without intent
      return { error: "Could not understand the main object of your request.", url, narration: "I'm sorry, I had trouble understanding what you're looking for. Could you rephrase?", overallStats: { totalTimeMs: Date.now() - overallStartTime } };
    }

    // --- Method 1: Exa Content Extraction (Fast Path for Text) ---
    async function fetchWithExa(targetUrl: string, crawlMode: "preferred" | "always" | "never") {
      const exaStartTime = Date.now();
      console.log(`[Exa Fetch] Starting for ${targetUrl} with mode: ${crawlMode}`);
      try {
        const response = await exa.getContents([targetUrl], { livecrawl: crawlMode }); // Corrected livecrawl mapping
        const result = response.results[0];
        if (!result || !result.text) throw new Error("Exa returned no content.");
        console.log(`[Exa Fetch] Success. Got ${result.text.length} chars. Took ${Date.now() - exaStartTime}ms.`);
        return { source: 'exa', success: true, textContent: result.text, elapsedMs: Date.now() - exaStartTime };
      } catch (error: any) {
        console.error(`[Exa Fetch] Failed for ${targetUrl}:`, error.message);
        return { source: 'exa', success: false, error: error.message, elapsedMs: Date.now() - exaStartTime };
      }
    }

    // --- Method 2: The FULL, ORIGINAL Vision-Enabled Recursive Fetch ---
    async function fetchAndAnalyzeRecursively() {
      const directFetchStartTime = Date.now();
      const visited = new Set<string>();
      let pagesFetchedCount = 0;
      const maxPages = 10;
      let operationTimedOut = false;
      const baseOrigin = (() => { try { return new URL(url).origin; } catch { return null; } })();
      if (!baseOrigin) return { source: 'direct', success: false, error: "Invalid base URL", elapsedMs: Date.now() - directFetchStartTime };

      async function getLinkSubject(linkText: string, linkHref: string, userGoal: string): Promise<string> {
        try { const linkModel = google('gemma-3n-e4b-it'); const prompt = `A user's goal is to "${userGoal}". On a webpage, there is a link with the text "${linkText}" that points to "${linkHref}". What is the primary subject of THIS LINK? Respond with a single noun or short phrase.`; const { text } = await generateText({ model: linkModel, prompt, temperature: 0.1, maxTokens: 20 }); return text.trim().toLowerCase(); } catch (e) { console.warn(`[getLinkSubject] LLM call failed`); return "unknown"; }
      }
      async function extractAndScoreLinks(htmlContent: string, currentUrl: string, CIntent: any): Promise<{ href: string, text: string, score: number }[]> {
        const aTagRegex = /<a[^>]+href=["']([^"'#?]+)["'][^>]*>(.*?)<\/a>/gi; const potentialLinks: { href: string; text: string }[] = []; let match; while ((match = aTagRegex.exec(htmlContent)) !== null) { const href = match[1]; const textContent = match[2].replace(/<[^>]+>/g, ' ').trim(); if (!href || href.startsWith('#') || textContent.length < 3) continue; try { const absoluteHref = new URL(href, currentUrl).toString(); if (new URL(absoluteHref).origin === baseOrigin && !visited.has(absoluteHref)) potentialLinks.push({ href: absoluteHref, text: textContent }); } catch { } } const scoredLinks: { href: string; text: string; score: number }[] = []; const linkAnalysisPromises = potentialLinks.slice(0, 10).map(async link => { if (Date.now() - overallStartTime > timeoutMs - 5000) return; const subject = await getLinkSubject(link.text, link.href, CIntent.object); let score = 0; const intentKeywords = [CIntent.object, ...CIntent.expanded].filter(Boolean).map(k => k.toLowerCase()); if (intentKeywords.some(kw => subject.includes(kw))) score += 10; else if (intentKeywords.some(kw => link.text.toLowerCase().includes(kw))) score += 2; if (score > 3) scoredLinks.push({ ...link, score }); }); await Promise.all(linkAnalysisPromises); scoredLinks.sort((a, b) => b.score - a.score); return scoredLinks.slice(0, 5);
      }
      function extractMainContent(html: string): string { return html.replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(); }
      async function describeImageWithVision(src: string, CIntent: any): Promise<{ description: string; confidence: number; isRelevant: boolean; }> {
        try { const visionModel = google('gemma-3-27b-it'); const prompt = `Analyze image at ${src}. User wants: "${CIntent.object}". JSON: { "description": "15-word description.", "confidence": "0.0-1.0 confidence it matches user intent." }`; const { text } = await generateText({ model: visionModel, prompt, temperature: 0.2 }); const parsed = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || '{}'); return { description: parsed.description || "No description.", confidence: Number(parsed.confidence) || 0, isRelevant: (Number(parsed.confidence) || 0) > 0.6 }; } catch (e) { return { description: "Vision error", confidence: 0, isRelevant: false }; }
      }
      async function describeVideoWithVision(src: string, CIntent: any): Promise<{ description: string; confidence: number; isRelevant: boolean; }> {
        try { const visionModel = google('gemma-3-27b-it'); const prompt = `Analyze video at ${src}. User wants: "${CIntent.object}". JSON: { "description": "20-word summary.", "confidence": "0.0-1.0 confidence it matches." }`; const { text } = await generateText({ model: visionModel, prompt, temperature: 0.2 }); const parsed = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || '{}'); return { description: parsed.description || "No summary.", confidence: Number(parsed.confidence) || 0, isRelevant: (Number(parsed.confidence) || 0) > 0.6 }; } catch (e) { return { description: "Vision error", confidence: 0, isRelevant: false }; }
      }
      async function filterImagesWithVision(imagesFromHtml: { src: string, alt: string }[], CIntent: any) {
        const results = []; for (const img of imagesFromHtml.slice(0, 10)) { if (Date.now() - overallStartTime > timeoutMs) { operationTimedOut = true; break; } const visionAnalysis = await describeImageWithVision(img.src, CIntent); if (visionAnalysis.isRelevant) results.push({ ...img, ...visionAnalysis }); } results.sort((a, b) => b.confidence - a.confidence); return results;
      }
      async function filterVideosWithVision(videosFromHtml: { src: string, poster?: string, alt?: string }[], CIntent: any) {
        const results = []; for (const vid of videosFromHtml.slice(0, 5)) { if (Date.now() - overallStartTime > timeoutMs) { operationTimedOut = true; break; } const visionAnalysis = await describeVideoWithVision(vid.src, CIntent); if (visionAnalysis.isRelevant) results.push({ ...vid, ...visionAnalysis }); } results.sort((a, b) => b.confidence - a.confidence); return results;
      }

      async function doFetchAndAnalyze({ currentUrl, currentDepth, CIntent }: { currentUrl: string, currentDepth: number, CIntent: any }): Promise<any> {
        if (operationTimedOut || Date.now() - overallStartTime > timeoutMs || pagesFetchedCount >= maxPages || visited.has(currentUrl)) {
          return { error: 'Aborted fetch due to limits.', url: currentUrl, steps: ["Aborted fetch"], images: [], videos: [], textContent: "" };
        }
        visited.add(currentUrl); pagesFetchedCount++;
        const localSteps: string[] = [`Direct Fetch L${recursionDepth - currentDepth}: ${currentUrl}`];

        let res: Response;
        try {
          res = await fetch(currentUrl, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AvurnaBot/1.0)' }, signal: AbortSignal.timeout(15000) });
          if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        } catch (fetchError: any) {
          return { error: `Fetch error: ${fetchError.message}`, url: currentUrl, steps: localSteps, images: [], videos: [], textContent: "" };
        }

        const contentType = res.headers.get('content-type') || '';

        if (contentType.startsWith('image/')) {
          localSteps.push('Detected direct image link. Sending for analysis.');
          const visionResult = await describeImageWithVision(currentUrl, CIntent);
          const imageResult = { src: currentUrl, alt: visionResult.description, ...visionResult };
          return { url: currentUrl, images: [imageResult], videos: [], textContent: "", steps: localSteps };
        } else if (contentType.includes('application/pdf')) {
          return { type: 'document', url: currentUrl, description: 'Link is a PDF. Content analysis not supported.', steps: localSteps, images: [], videos: [], textContent: "" };
        } else if (!contentType.includes('text/html')) {
          const text = await res.text();
          return { type: 'file', url: currentUrl, description: `File (${contentType})`, steps: localSteps, images: [], videos: [], textContent: text.slice(0, 500) };
        }

        const htmlContent = await res.text();
        localSteps.push('Processing HTML content for media and text.');

        let pageResults: { images: any[], videos: any[], textContent?: string } = { images: [], videos: [] };
        const inferredModality = CIntent.modality || (userIntent.toLowerCase().includes('video') ? 'video' : (userIntent.toLowerCase().includes('image') ? 'image' : 'summary'));

        const imagesOnPage = extractImagesFromHtml(htmlContent, currentUrl);
        const videosOnPage = await extractVideosFromHtml(htmlContent, currentUrl);
        pageResults.images = await filterImagesWithVision(imagesOnPage, CIntent);
        pageResults.videos = await filterVideosWithVision(videosOnPage, CIntent);

        const textContent = extractMainContent(htmlContent);
        pageResults.textContent = textContent.length > 200 ? textContent : "";

        let isGoodEnoughFound = (inferredModality === 'image' && pageResults.images.length > 0) || (inferredModality === 'video' && pageResults.videos.length > 0) || (inferredModality === 'summary' && textContent.length > 1000);
        let pageRecursiveResults: any[] = [];
        if (currentDepth > 0 && !isGoodEnoughFound && !operationTimedOut) {
          const pageNavLinks = await extractAndScoreLinks(htmlContent, currentUrl, CIntent);
          if (pageNavLinks.length > 0) {
            localSteps.push(`Semantically exploring top link: ${pageNavLinks[0].href}`);
            const subResult = await doFetchAndAnalyze({ currentUrl: pageNavLinks[0].href, currentDepth: currentDepth - 1, CIntent });
            if (subResult && !subResult.error) pageRecursiveResults.push(subResult);
          }
        }

        const allImages = [...pageResults.images, ...pageRecursiveResults.flatMap(r => r.images || [])];
        const allVideos = [...pageResults.videos, ...pageRecursiveResults.flatMap(r => r.videos || [])];
        const allText = pageResults.textContent || pageRecursiveResults.map(r => r.textContent).find(t => t) || "";
        allImages.sort((a, b) => b.confidence - a.confidence);
        allVideos.sort((a, b) => b.confidence - a.confidence);

        return { url: currentUrl, images: allImages, videos: allVideos, textContent: allText, steps: localSteps };
      }

      const result = await doFetchAndAnalyze({ currentUrl: url, currentDepth: recursionDepth, CIntent: initialIntent });
      return { source: 'direct', success: !result.error, ...result, elapsedMs: Date.now() - directFetchStartTime };
    }

    // Execute Both Fetch Methods in Parallel
    const [exaResult, directResult] = await Promise.allSettled([
      fetchWithExa(url, liveCrawlMode),
      fetchAndAnalyzeRecursively()
    ]);

    const mergedResult: any = { url, images: [], videos: [], textContent: "", narration: "", steps: [], fetchMethods: {}, overallStats: {} };

    const exaData = exaResult.status === 'fulfilled' && exaResult.value.success ? exaResult.value : null;
    const directData = directResult.status === 'fulfilled' && directResult.value.success ? directResult.value : null;

    mergedResult.fetchMethods.exa = { success: !!exaData, elapsedMs: exaResult.status === 'fulfilled' ? exaResult.value.elapsedMs : 0, error: exaData ? null : (exaResult.status === 'fulfilled' ? exaResult.value.error : exaResult.reason?.message || 'Exa fetch failed') };
    mergedResult.fetchMethods.direct = { success: !!directData, elapsedMs: directData ? directData.elapsedMs : 0, error: directData ? directData.error : (directResult.status === 'fulfilled' ? directResult.value.error : directResult.reason?.message || 'Direct fetch failed') };


    if (!exaData && !directData) {
      return { error: `Both fetch methods failed. Exa: ${mergedResult.fetchMethods.exa.error}. Direct: ${mergedResult.fetchMethods.direct.error}`, narration: "I'm sorry, I was unable to retrieve content from that URL. The site may be down or blocking access.", url, fetchMethods: mergedResult.fetchMethods, overallStats: { totalTimeMs: Date.now() - overallStartTime } };
    }

    mergedResult.images = directData?.images || [];
    mergedResult.videos = directData?.videos || [];
    mergedResult.textContent = exaData?.textContent || directData?.textContent || "";
    mergedResult.steps = directData?.steps || ['Exa fetch completed, direct fetch failed or provided no steps.'];

    if (initialIntent.modality === 'summary' && mergedResult.textContent) {
      try {
        const summaryModel = google('gemma-3-27b-it');
        const { text } = await generateText({ model: summaryModel, prompt: `Provide a concise summary of this text: "${mergedResult.textContent.substring(0, 25000)}"` });
        mergedResult.narration = text;
      } catch (e: any) { mergedResult.narration = `Extracted article text, but summarization failed: ${e.message}`; }
    } else {
      const objectStr = initialIntent.object || "the requested content";
      const hasMedia = mergedResult.images.length > 0 || mergedResult.videos.length > 0;
      if (hasMedia) {
        mergedResult.narration = `I found ${mergedResult.images.length} relevant image(s) and ${mergedResult.videos.length} relevant video(s) for "${objectStr}".`;
      } else if (mergedResult.textContent) {
        mergedResult.narration = `I successfully extracted the page content for "${objectStr}". While no specific media was found, I have the full text available for summarization.`;
      } else {
        mergedResult.narration = `I attempted to fetch content for "${objectStr}" but couldn't retrieve specific media or extensive text.`;
      }
    }

    mergedResult.overallStats = { totalTimeMs: Date.now() - overallStartTime, timedOut: Date.now() - overallStartTime >= timeoutMs };
    return mergedResult;
  },
});


// --- CORRECTED Exa Search Tool (Uses exa.answer for general queries) ---

// --- Helper: Infer domains to include based on user intent (image, video, etc.) ---
function inferDomainsFromIntent(query: string): string[] {
  // Lowercase for easier matching
  const q = query.toLowerCase();
  // If user asks for images/photos/pictures, include image-rich domains
  if (/\b(image|photo|picture|wallpaper|gallery|pic|jpeg|jpg|png|gif|unsplash|pinterest|flickr|stock)\b/.test(q)) {
    return [
      'unsplash.com',
      'pinterest.com',
      'flickr.com',
      'gettyimages.com',
      'pexels.com',
      'stock.adobe.com',
      'shutterstock.com',
      '500px.com',
      'istockphoto.com',
      'deviantart.com',
      'wallhaven.cc',
      'pixabay.com',
      'freepik.com',
      'dreamstime.com',
      'canva.com',
      'unsplash.com',
    ];
  }
  // If user asks for videos, include video domains
  if (/\b(video|movie|film|clip|trailer|watch|youtube|vimeo|dailymotion)\b/.test(q)) {
    return [
      'youtube.com',
      'vimeo.com',
      'dailymotion.com',
      'tiktok.com',
      'metacafe.com',
      'veoh.com',
      'bilibili.com',
      'twitch.tv',
    ];
  }
  // Default: no domain filter (broad search)
  return [];
}

// --- The Final, Hybrid Search Tool ---
export const exaSearchTool = tool({
  description: "Performs a web search using Exa. It can handle a single query for specific media (images, videos) or multiple queries in parallel for general research. Use 'queries' for multiple topics, and 'query' for a single, specific request.",
  parameters: z.object({
    query: z.string().optional().describe("A single search query, best for specific media requests like 'images of cats' or 'video of a recipe'."),
    queries: z.array(z.string()).optional().describe("An array of search queries to run in parallel, best for general research on multiple topics."),
    findSimilar: z.string().optional().describe("Optional URL to find similar content for instead of performing a regular search."),
    excludeSourceDomain: z.boolean().optional().describe("When using findSimilar, whether to exclude results from the same domain (default: false)."),
    numResults: z.number().optional().describe("Number of results to return (default: 10)."),
  }).refine(data => (!!data.query && !data.queries) || (!data.query && !!data.queries) || !!data.findSimilar, {
    message: "You must provide either a single 'query', an array of 'queries', or a 'findSimilar' URL.",
  }),

  execute: async ({ 
    query, 
    queries, 
    findSimilar, 
    excludeSourceDomain = false, 
    numResults = 10  
  }) => {
    const start = Date.now();
    
    // --- MODE 1: FIND SIMILAR (Highest Priority) ---
    if (findSimilar) {
      console.log(`[Exa Search] Mode: Find Similar. URL: ${findSimilar}`);
      try {
        const response = await exa.findSimilarAndContents(findSimilar, { numResults, excludeSourceDomain, text: true, summary: true });
        const similarLinks = response.results.map(result => ({ title: result.title, url: result.url, score: result.score, favicon: result.favicon, snippet: result.text ? result.text.substring(0, 200) + "..." : "", summary: result.summary, siteName: result.title || (() => { try { return new URL(result.url).hostname.replace(/^www\./, ''); } catch { return result.url; }})(), publishedDate: result.publishedDate, author: result.author, }));
        const imagesForCarousel = response.results.filter(r => typeof r.image === 'string' && !!r.image).map(r => ({ src: String(r.image), alt: (r.title || r.url), source: { url: r.url, title: r.title }, }));
        return { query: `similar to ${findSimilar}`, sourceUrl: findSimilar, narration: `Found ${similarLinks.length} similar links.`, sources: similarLinks, searchResults: response.results, images: imagesForCarousel, isSimilarSearch: true, elapsedMs: Date.now() - start, };
      } catch (error: any) {
        return { query: `similar to ${findSimilar}`, sourceUrl: findSimilar, error: `Failed to find similar links: ${error.message}`, isSimilarSearch: true };
      }
    }

    // Unify input: searchTerms will always be an array of strings.
    const searchTerms = queries || (query ? [query] : []);
    if (searchTerms.length === 0) {
      return { error: "No search query was provided." };
    }
    
    // Use the first term to determine the primary intent of the search.
    const primaryQuery = searchTerms[0];
    const isImageRequest = /\b(image|photo|picture|wallpaper|gallery|pic|jpeg|jpg|png|gif)\b/i.test(primaryQuery);
    const isVideoRequest = /\b(video|movie|film|clip|trailer|watch|youtube|vimeo)\b/i.test(primaryQuery);

    // --- MODE 2: SINGLE MEDIA SEARCH (Image or Video) ---
    // This triggers only for a single 'query' that asks for media. It uses exa.search.
    if (query && (isImageRequest || isVideoRequest)) {
      console.log(`[Exa Search] Mode: Single Media. Query: "${query}"`);
      try {
        const searchResponse = await exa.search(query, { numResults: 10, includeDomains: inferDomainsFromIntent(query) });
        let imagesForCarousel: any[] = [];
        let videosForCarousel: any[] = [];
        let visionFilteringInfo: any = null;

        if (isImageRequest) {
          const rawImages = searchResponse.results.filter(r => typeof r.image === 'string' && !!r.image).map(r => ({ src: String(r.image), alt: (r.title || r.url), source: { url: r.url, title: r.title } }));
          const intent = await extractUserIntent(query);
          visionFilteringInfo = await filterImagesWithVision(rawImages, query, intent);
          imagesForCarousel = visionFilteringInfo.filtered;
        }
        
        if (isVideoRequest) {
          videosForCarousel = searchResponse.results.filter(r => r.url && /youtube|vimeo|dailymotion|tiktok/.test(r.url)).map((result: any) => ({ type: 'video', src: result.url, title: result.title, poster: result.image, source: { url: result.url, title: result.title } }));
        }

        const sourcesFromSearch = searchResponse.results.map(r => ({ url: r.url, sourceUrl: r.url, title: r.title || r.url, snippet: r.text || '', image: r.image, favicon: r.favicon, siteName: r.title || (r.url ? (() => { try { return new URL(r.url).hostname.replace(/^www\./, ''); } catch { return r.url; } })() : ''), publishedDate: r.publishedDate, author: r.author, score: r.score }));
        
        return {
          query,
          narration: isImageRequest ? `I found ${imagesForCarousel.length} images for you.` : `I found ${videosForCarousel.length} videos for you.`,
          images: imagesForCarousel,
          videos: videosForCarousel,
          sources: sourcesFromSearch,
          searchResults: searchResponse.results,
          webSearchQueries: [query],
          elapsedMs: Date.now() - start,
          visionFiltering: visionFilteringInfo,
        };
      } catch (error: any) {
        return { query, error: `Failed to execute media search: ${error.message}` };
      }
    }

    // --- MODE 3: PARALLEL GENERAL SEARCH ---
    // This is the fallback for single non-media queries or multiple queries. It uses exa.answer.
    console.log(`[Exa Search] Mode: Parallel General. Queries:`, searchTerms);
    try {
      interface ExaCitation {
        url: string;
        title?: string;
        text?: string;
        image?: string;
        publishedDate?: string;
        author?: string;
        favicon?: string;
      }

      interface ExaAnswerResponse {
        answer?: string;
        citations?: ExaCitation[];
      }

      const searchPromises: Promise<ExaAnswerResponse>[] = searchTerms.map(async (term: string) => {
        const response = await exa.answer(term, {});
        // Ensure 'answer' is a string or undefined
        let answer: string | undefined;
        if (typeof response.answer === 'string') {
          answer = response.answer;
        } else if (response.answer && typeof response.answer === 'object') {
          answer = JSON.stringify(response.answer);
        } else {
          answer = undefined;
        }
        return { ...response, answer } as ExaAnswerResponse;
      });
      const responses = await Promise.all(searchPromises);

      let combinedAnswer = "";
      const allCitations: any[] = [];
      
      responses.forEach((response, index) => {
        if (response.answer) {
          combinedAnswer += `\n\n## Results for: "${searchTerms[index]}"\n\n${response.answer}`;
        }
        if (response.citations) {
          allCitations.push(...response.citations);
        }
      });

      const sourcesForCards = allCitations.map(c => ({ url: c.url as string, sourceUrl: c.url as string, title: c.title || c.url as string, snippet: c.text || '', siteName: c.title || (c.url ? (() => { try { return new URL(c.url as string).hostname.replace(/^www\./, ''); } catch { return c.url as string; } })() : ''), image: c.image, publishedDate: c.publishedDate, author: c.author, favicon: c.favicon }));

      return {
        query: searchTerms.join(', '),
        answer: combinedAnswer.trim(),
        sources: sourcesForCards,
        searchResults: allCitations,
        webSearchQueries: searchTerms,
        elapsedMs: Date.now() - start,
      };
    } catch (error: any) {
      return { query: searchTerms.join(', '), error: `Failed to execute parallel search: ${error.message}` };
    }
  },
});

// =================================================================================
// === NEW: THE MONOLITHIC GITHUB AGENT TOOL (FULLY IMPLEMENTED & CORRECTED SCHEMA) ===
// =================================================================================

// =================================================================================
// === THE CORRECTED GITHUB AGENT TOOL ===
// =================================================================================

// 1. Define a simpler, "flat" schema for a workflow step.
// This is the key fix: all possible parameters are defined at the top level and are optional.
const githubStepSchema = z.object({
  action: z.enum([
    'listFiles', 'readFile', 'createBranch', 'createOrUpdateFile',
    'createPullRequest', 'getCommitStatus', 'createIssue', 'updateWorkflow',
    'updatePullRequest', 'forkRepo'
  ]).describe("The specific GitHub action to perform."),

  // All possible parameters are now optional at this top level.
  path: z.string().optional().describe("The file or directory path."),
  branch: z.string().optional().describe("The branch name for the action."),
  newBranchName: z.string().optional().describe("The name for a new branch."),
  fromBranch: z.string().optional().describe("The base branch for creating a new branch."),
  newContent: z.string().optional().describe("The new content for a file."),
  commitMessage: z.string().optional().describe("The commit message."),
  title: z.string().optional().describe("The title for a PR or issue."),
  body: z.string().optional().describe("The body content for a PR or issue."),
  headBranch: z.string().optional().describe("The head branch for a pull request."),
  baseBranch: z.string().optional().describe("The base branch for a pull request."),
  assignees: z.array(z.string()).optional().describe("GitHub usernames to assign to an issue."),
  pullNumber: z.number().optional().describe("The number of the pull request to update."),
});

// 2. The main tool schema that accepts a workflow.
export const githubTool = tool({
  description: "Executes a workflow of sequential actions on a GitHub repository.",
  parameters: z.object({
    owner: z.string().describe("The repository owner."),
    repo: z.string().describe("The repository name."),
    workflow: z.array(githubStepSchema).min(1).describe("An array of sequential steps to execute."),
  }),

  // 3. The 'execute' function now accesses parameters directly from the step object.
  execute: async ({ owner, repo, workflow }) => {
    const stepResults: any[] = [];
    let lastResult: any = null;

    for (const step of workflow) {
      console.log(`[GitHub Workflow] Executing: ${step.action} on ${owner}/${repo}`);
      try {
        let result: any;
        // The switch statement now correctly uses the flattened step parameters
        switch (step.action) {
          case 'listFiles':
            const { data: files } = await octokit.rest.repos.getContent({ owner, repo, path: step.path || '' });
            result = Array.isArray(files) ? files.map(f => ({ name: f.name, type: f.type, path: f.path })) : { name: files.name, type: files.type, path: files.path };
            break;
          case 'readFile':
            const { data: fileContent } = await octokit.rest.repos.getContent({ owner, repo, path: step.path!, ref: step.branch });
            if ('content' in fileContent) result = { path: fileContent.path, content: Buffer.from(fileContent.content, 'base64').toString('utf-8') };
            else throw new Error("Path is a directory.");
            break;
          case 'createBranch':
            try {
              // Step 1: Intelligently find the default branch if not provided.
              const { data: repoData } = await octokit.rest.repos.get({ owner, repo });
              const fromBranch = step.fromBranch || repoData.default_branch;

              // Step 2: Get the SHA of the base branch.
              const { data: baseBranchData } = await octokit.rest.repos.getBranch({ owner, repo, branch: fromBranch });

              // Step 3: Create the new branch from that SHA.
              const { data: newBranch } = await octokit.rest.git.createRef({
                owner, repo, ref: `refs/heads/${step.newBranchName!}`, sha: baseBranchData.commit.sha
              });
              result = { success: true, status: 'created', branchName: step.newBranchName, ref: newBranch.ref };
            } catch (error: any) {
              // Step 4: If the branch already exists, don't fail. Treat it as a success.
              if (error.message && error.message.includes('Reference already exists')) {
                console.warn(`[GitHub Workflow] Branch '${step.newBranchName}' already exists. Proceeding.`);
                result = { success: true, status: 'existed', branchName: step.newBranchName };
              } else {
                // For any other error, re-throw it.
                throw error;
              }
            }
            break;
          // Inside the `githubTool` execute function, in the `switch` statement:
          case 'createOrUpdateFile':
            let sha: string | undefined;
            try {
              // Attempt to get the file to see if it exists and get its SHA.
              const { data: existingFile } = await octokit.rest.repos.getContent({
                owner, repo, path: step.path!, ref: step.branch!
              });
              if (!Array.isArray(existingFile) && existingFile.type === 'file') {
                sha = existingFile.sha; // This is an update, so we need the SHA.
              }
            } catch (error: any) {
              // If it's a 404, the file doesn't exist. This is fine, it's a new file.
              if (error.status !== 404) throw error;
            }

            // Now, create or update the file. The 'sha' parameter is only added if the file exists.
            const { data: commit } = await octokit.rest.repos.createOrUpdateFileContents({
              owner, repo, path: step.path!, message: step.commitMessage!, content: Buffer.from(step.newContent!).toString('base64'), branch: step.branch!, sha
            });
            result = { success: true, url: commit.commit.html_url };
            break;
            
          case 'createPullRequest':
            const { data: pr } = await octokit.rest.pulls.create({ owner, repo, title: step.title!, body: step.body, head: step.headBranch!, base: step.baseBranch! });
            result = { success: true, url: pr.html_url, number: pr.number };
            break;

          case 'createIssue':
            const { data: issue } = await octokit.rest.issues.create({
              owner,
              repo,
              title: step.title!,
              body: step.body,
              assignees: step.assignees, // Supports assigning the issue
            });
            result = { success: true, url: issue.html_url, number: issue.number };
            break;

          case 'getCommitStatus':
            const { data: status } = await octokit.rest.repos.getCombinedStatusForRef({
              owner, repo, ref: step.branch!
            });
            result = { success: true, state: status.state, statuses: status.statuses.map(s => ({ context: s.context, state: s.state, target_url: s.target_url })) };
            break;

          case 'updateWorkflow':
            if (!step.path || !step.path.startsWith('.github/workflows/')) {
              throw new Error("The 'updateWorkflow' action is only permitted for paths inside '.github/workflows/'.");
            }
            // This logic is identical to createOrUpdateFile, but scoped to the workflows directory for safety.
            let wfSha: string | undefined;
            try {
              const { data: existingWf } = await octokit.rest.repos.getContent({ owner, repo, path: step.path, ref: step.branch });
              if (!Array.isArray(existingWf) && existingWf.type === 'file') wfSha = existingWf.sha;
            } catch (e: any) {
              if (e.status !== 404) throw e;
            }
            const { data: wfCommit } = await octokit.rest.repos.createOrUpdateFileContents({
              owner, repo, path: step.path, message: step.commitMessage!, content: Buffer.from(step.newContent!).toString('base64'), branch: step.branch!, sha: wfSha
            });
            result = { success: true, url: wfCommit.commit.html_url };
            break;

          case 'updatePullRequest':
            if (!step.pullNumber) {
              throw new Error("The 'updatePullRequest' action requires a 'pullNumber'.");
            }
            const { data: updatedPr } = await octokit.rest.pulls.update({
              owner,
              repo,
              pull_number: step.pullNumber,
              title: step.title, // Can update title
              body: step.body,   // Can update body/description
              // You can also update state (e.g., 'closed'), base branch, etc.
            });
            result = { success: true, url: updatedPr.html_url, number: updatedPr.number };
            break;

          case 'forkRepo':
            const { data: fork } = await octokit.rest.repos.createFork({
              owner, // The owner of the repo to fork
              repo,  // The repo to fork
            });
            // The result gives the details of the NEW forked repo
            result = {
              success: true,
              message: "Forking process initiated. It may take a few moments for the new repository to become available.",
              forkedRepo: {
                owner: fork.owner.login,
                repo: fork.name,
                fullName: fork.full_name,
                url: fork.html_url,
              }
            };
            break;

          default:
            throw new Error(`Unsupported GitHub action: ${step.action}`);
        }
        lastResult = result;
        stepResults.push({ action: step.action, status: 'success', result });
      } catch (error: any) {
        return { status: 'failed', error: `Workflow failed at step '${step.action}': ${error.message}`, completedSteps: stepResults };
      }
    }
    return { status: 'success', completedSteps: stepResults, finalResult: lastResult };
  }
});


// --- HTML Media Extraction Utilities (No changes) ---
function extractImagesFromHtml(html: string, baseUrl: string): { src: string, alt: string, width?: number, height?: number }[] {
  const imgTagRegex = /<img\s+([^>]*?)>/gi; const srcRegex = /src=["']([^"']+)["']/; const altRegex = /alt=["']([^"']*)["']/; const widthRegex = /width=["']?(\d+)/; const heightRegex = /height=["']?(\d+)/; const images: { src: string, alt: string, width?: number, height?: number }[] = []; const commonUiPatterns = /\/(logo|icon|sprite|spinner|loader|avatar|profile|badge|button|arrow|thumb|pixel|spacer)-?.*\.(\w{3,4})$/i; const commonUiKeywordsInAlt = ['logo', 'icon', 'button', 'arrow', 'avatar', 'profile', 'badge', 'banner ad', 'advertisement']; let match; while ((match = imgTagRegex.exec(html)) !== null) { const imgTagContent = match[1]; const srcMatch = srcRegex.exec(imgTagContent); if (!srcMatch || !srcMatch[1]) continue; let src = srcMatch[1]; const altMatch = altRegex.exec(imgTagContent); let alt = altMatch ? altMatch[1] : ''; try { src = new URL(src, baseUrl).toString(); const widthMatch = widthRegex.exec(imgTagContent); const heightMatch = heightRegex.exec(imgTagContent); const width = widthMatch ? parseInt(widthMatch[1], 10) : undefined; const height = heightMatch ? parseInt(heightMatch[1], 10) : undefined; if (commonUiPatterns.test(src) || commonUiKeywordsInAlt.some(kw => alt.toLowerCase().includes(kw))) continue; if ((width !== undefined && width < 50) && (height !== undefined && height < 50)) continue; images.push({ src, alt, width, height }); } catch { /* Invalid URL */ } } return images;
}
async function extractVideosFromHtml(html: string, baseUrl: string): Promise<{ src: string, poster?: string, alt?: string }[]> {
  const videos: { src: string, poster?: string, alt?: string }[] = []; const videoTagRegex = /<video[^>]*?(?:poster=["']([^"']*)["'])?[^>]*>([\s\S]*?)<\/video>/gi; const sourceTagRegex = /<source[^>]+src=["']([^"']+)["'][^>]*?(?:type=["']video\/([^"']+)["'])?/gi; const iframeRegex = /<iframe[^>]+src=["']([^"']+)["'][^>]*><\/iframe>/gi; let match; while ((match = videoTagRegex.exec(html)) !== null) { const poster = match[1]; const videoInnerHtml = match[2]; let sourceMatch; let videoSrc: string | null = null; while ((sourceMatch = sourceTagRegex.exec(videoInnerHtml)) !== null) { if (sourceMatch[1] && (!videoSrc || (sourceMatch[2] && sourceMatch[2].includes('mp4')))) { videoSrc = sourceMatch[1]; if (sourceMatch[2] && sourceMatch[2].includes('mp4')) break; } } if (!videoSrc) { const videoSrcAttrMatch = /src=["']([^"']+)["']/.exec(match[0]); if (videoSrcAttrMatch) videoSrc = videoSrcAttrMatch[1]; } if (videoSrc) { try { const absoluteSrc = new URL(videoSrc, baseUrl).toString(); videos.push({ src: absoluteSrc, poster, alt: poster || "video content" }); } catch { /* Invalid URL */ } } } while ((match = iframeRegex.exec(html)) !== null) { const iframeSrc = match[1]; let absoluteSrc: string; try { absoluteSrc = new URL(iframeSrc, baseUrl).toString(); } catch { continue; } if (/youtube\.(com|nocookie\.com)\/embed\//.test(absoluteSrc)) { videos.push({ src: absoluteSrc, alt: "YouTube video" }); continue; } if (/player\.vimeo\.com\/video\//.test(absoluteSrc)) { videos.push({ src: absoluteSrc, alt: "Vimeo video" }); continue; } videos.push({ src: absoluteSrc, alt: "embedded video player" }); } return videos;
}