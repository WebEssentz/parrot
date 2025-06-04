// tools.ts (Agent X integration scaffold)
// import { agentXWebAgent, AgentXInstruction } from "./agent-x/agentXWebAgent";
import { franc } from 'franc'; // For automatic language detection
import { tool } from "ai";
import { z } from "zod";
import { google } from '@ai-sdk/google';      // For Gemini vision model
import { generateText } from 'ai';         // For calling the Gemini model                                  
import { JSDOM } from 'jsdom';  // --- Enhanced Table Parsing using jsdom ---
// import { agentXWebAgent } from './agent-x/agentXWebAgent';

// --- Simple Markdown Bar Chart Generator ---
// ... (generateMarkdownBarChart function as provided)
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

// Utility: Format a value as inline code (ChatGPT style)
// ... (formatInlineCode function as provided)
export function formatInlineCode(value: string): string {
  return `\`${value.replace(/`/g, '\u0060')}\``;
}

/**
 * Parses HTML tables robustly using jsdom.
 * @param html The HTML string to parse.
 * @param options Optional: { maxTables, maxRows }
 */
function parseHtmlTables(
  html: string,
  options?: { maxTables?: number; maxRows?: number }
): { headers: string[]; rows: Record<string, string>[] }[] {
  const maxTables = options?.maxTables ?? 20;
  const maxRows = options?.maxRows ?? 200;
  const dom = new JSDOM(html);
  const document = dom.window.document;
  const tables = Array.from(document.querySelectorAll('table')).slice(0, maxTables);
  const parsedTables: { headers: string[]; rows: Record<string, string>[] }[] = [];

  for (const table of tables) {
    // Find headers
    let headers: string[] = [];
    const thead = table.querySelector('thead');
    if (thead) {
      const ths = Array.from(thead.querySelectorAll('th'));
      headers = ths.map(th => th.textContent?.trim() || '');
    } else {
      // Try first row as header
      const firstRow = table.querySelector('tr');
      if (firstRow) {
        const ths = Array.from(firstRow.querySelectorAll('th'));
        if (ths.length > 0) {
          headers = ths.map(th => th.textContent?.trim() || '');
        } else {
          const tds = Array.from(firstRow.querySelectorAll('td'));
          headers = tds.map((_, i) => `Column ${i + 1}`);
        }
      }
    }
    // Parse rows
    const rows: Record<string, string>[] = [];
    const rowEls = Array.from(table.querySelectorAll('tr')).slice(headers.length > 0 ? 1 : 0, maxRows + (headers.length > 0 ? 1 : 0));
    for (const rowEl of rowEls) {
      const cells = Array.from(rowEl.querySelectorAll('td,th'));
      if (cells.length === 0) continue;
      const rowObj: Record<string, string> = {};
      for (let i = 0; i < cells.length; i++) {
        const header = headers[i] || `Column ${i + 1}`;
        rowObj[header] = cells[i].textContent?.trim() || '';
      }
      rows.push(rowObj);
      if (rows.length >= maxRows) break;
    }
    if (rows.length > 0) {
      parsedTables.push({ headers, rows });
    }
  }
  return parsedTables;
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

export const fetchUrlTool = tool({
  description:
    "Enterprise-grade: Deeply fetch and analyze one or more URLs. Extracts product cards, prices, features, navigation, HTML tables, FAQs, news/blogs, and classifies site type. Supports multi-step reasoning and interactive data analysis on extracted tables. If the URL is an image, it will be previewed and an AI will analyze and describe its content. Returns structured data, reasoning steps, and rich summaries. Now supports 'moles' — background helpers that fetch summaries from links in parallel, so Avurna can stay on the main page and quickly gather info from many places. If multiple URLs are provided, each is explored in parallel with its own set of moles.",
  parameters: z.object({
    url: z.union([
      z.string().describe("A single URL to fetch and analyze"),
      z.array(z.string()).describe("Multiple URLs to fetch and analyze in parallel")
    ]),
    referer: z.string().optional().describe("The referring page, for multi-step navigation"),
    userIntent: z.string().optional().describe("The user's question or intent, for focused extraction, including data analysis requests like 'analyze the table'."),
    // agentX: z.boolean().optional().describe("If true, use Agent X for dynamic web interaction (Amazon, YouTube, etc.)"),
    recursionDepth: z.number().optional().describe("How many levels of links to follow recursively (0 = just this page, 1 = follow links on this page, etc.)"),
    maxPages: z.number().optional().describe("Maximum total number of pages to fetch (default 10)"),
    timeoutMs: z.number().optional().describe("Timeout in milliseconds for the entire operation (default 20000 ms)"),
    targetLanguage: z.string().optional().describe("ISO 639-3 code for the user's preferred language (e.g., 'eng', 'fra', 'spa'). If not provided, will be auto-detected from userIntent."),
  }),
  execute: async (params) => {

    let {
      url: urlOrUrls,
      referer,
      userIntent,
      // agentX,
      recursionDepth = 0, // Not used for moles, but kept for compatibility
      maxPages = 10,
      timeoutMs = 20000,
      targetLanguage,
    } = params;

    // --- Always detect user language from userIntent (ignore previous/cached translations) ---
    const supportedLangs = ['eng','fra','spa','deu','ita','rus','zho','jpn','kor','por','ara','hin'];
    let detectedUserLang: string | undefined = undefined;
    if (targetLanguage && supportedLangs.includes(targetLanguage)) {
      detectedUserLang = targetLanguage;
    } else if (userIntent && typeof userIntent === 'string' && userIntent.length > 0) {
      try {
        const lang = franc(userIntent, { minLength: 3 }) || 'und';
        // If detected language is supported, use it. If not, fallback to English.
        if (supportedLangs.includes(lang) && lang !== 'und') {
          detectedUserLang = lang;
        } else {
          detectedUserLang = 'eng';
        }
      } catch (e) {
        detectedUserLang = 'eng';
      }
    } else {
      detectedUserLang = 'eng';
    }
    // Always use detectedUserLang from the current message for translation decisions

    // --- Mole Memory: Shared cache for all moles (per process) ---
    const moleMemory: Map<string, any> = (fetchUrlTool as any)._moleMemory = (fetchUrlTool as any)._moleMemory || new Map<string, any>();

    async function processOneUrl(urlToFetch: string) {
      // --- Time Travel Mole: Fetches a snapshot from the Wayback Machine (web.archive.org) ---
      async function fetchWaybackSnapshot(url: string, yearsAgo: number): Promise<any> {
        // Use the Wayback Machine API to find the closest snapshot for a given number of years ago
        const now = new Date();
        const targetDate = new Date(now.getFullYear() - yearsAgo, now.getMonth(), now.getDate());
        const yyyymmdd = `${targetDate.getFullYear()}${String(targetDate.getMonth() + 1).padStart(2, '0')}${String(targetDate.getDate()).padStart(2, '0')}`;
        const apiUrl = `https://archive.org/wayback/available?url=${encodeURIComponent(url)}&timestamp=${yyyymmdd}`;
        try {
          const res = await fetch(apiUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
          const data = await res.json();
          const snapshotUrl = data?.archived_snapshots?.closest?.url;
          if (snapshotUrl) {
            // Fetch and analyze the snapshot as a normal page (but mark as time travel)
            const result = await fetchAndAnalyzeSingle({ url: snapshotUrl, referer: url, userIntent});
            return {
              ...result,
              timeTravel: true,
              yearsAgo,
              snapshotUrl,
              snapshotTimestamp: data?.archived_snapshots?.closest?.timestamp || null,
            };
          } else {
            return { error: 'No snapshot found', yearsAgo };
          }
        } catch (e) {
          return { error: String(e), yearsAgo };
        }
      }
      const visited = new Set<string>();
      const origin = (() => { try { return new URL(urlToFetch).origin; } catch { return null; } })();
      let pagesFetched = 0;
      let timedOut = false;
      const startTime = Date.now();

      // Helper: Fetch and analyze a single page (no recursion)
      async function fetchAndAnalyzeSingle({ url, referer, userIntent, agentX }: { url: string, referer?: string, userIntent?: string, agentX?: boolean }): Promise<any> {
          // --- Abstractive Summarization: Use Gemini to generate a fluent summary ---
          let abstractiveSummary = '';
          // (moved below, after mainText is defined)
          // --- Mole Memory: Check cache for translation after summary is built ---
          if (moleMemory.has(url)) {
            const cached = moleMemory.get(url);
            // If the cached result is an error, ignore it and retry fetch
            if (cached && typeof cached === 'object' && cached.error) {
              moleMemory.delete(url);
            } else if (cached && typeof cached === 'object') {
              // If no translation is needed (page language matches detectedUserLang), return cached
              if (!cached.language || cached.language === detectedUserLang) {
                return { ...cached, fromMemory: true };
              }
              // If translation is needed, only return cached if translation exists for the current detectedUserLang and summary matches
              // (rest of logic as before)
            }
          }
        if (timedOut) return { error: 'Timeout reached', url };
        if (pagesFetched >= maxPages) return { error: 'Max pages limit reached', url };
        if (visited.has(url)) return { error: 'Already visited', url };
        if (origin && !(url.startsWith(origin))) return { error: 'Out of domain', url };
        if (Date.now() - startTime > timeoutMs) { timedOut = true; return { error: 'Timeout reached', url }; }

        // Move cache check for translation after summary is built
        visited.add(url);
        pagesFetched++;
        // Use the original fetch/analyze logic (no recursion)
        const result = await (async () => {
          // --- BEGIN: Original fetch/analyze logic ---
          const steps: string[] = [];
          steps.push(`Step 1: Fetching ${url}`);
          const headers: Record<string, string> = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          };
          if (referer) headers['Referer'] = referer;
          let res: Response | undefined = undefined;
          let fetchError: string | null = null;
          let fetchTimedOut = false;
          let suspicious = false;
          // --- Broken/Slow/Dangerous Link Detection ---
          const suspiciousPatterns = [/\.exe$/i, /\.scr$/i, /\.zip$/i, /malware|phish|suspicious|danger/i];
          if (suspiciousPatterns.some((pat) => pat.test(url))) {
            suspicious = true;
          }
          let fetchStart = Date.now();
          try {
            const controller = new AbortController();
            const timeout = setTimeout(() => {
              controller.abort();
              fetchTimedOut = true;
            }, 8000); // 8s per-link timeout
            res = await fetch(url, { method: 'GET', headers, signal: controller.signal });
            clearTimeout(timeout);
          } catch (e: any) {
            fetchError = e?.name === 'AbortError' ? 'Timeout' : (e?.message || String(e));
          }
          const fetchElapsed = Date.now() - fetchStart;
          if (fetchTimedOut) fetchError = 'Timeout';
          if (!fetchError && res && res.status >= 400) fetchError = `HTTP ${res.status}`;
          const contentType = res && res.headers ? res.headers.get('content-type') || '' : '';
          // --- Alert for broken, slow, or suspicious links ---
          let linkAlert: string | null = null;
          if (fetchError) {
            linkAlert = `⚠️ Link could not be fetched: ${fetchError}`;
          } else if (fetchElapsed > 5000) {
            linkAlert = `⚠️ Link was very slow to respond (${(fetchElapsed / 1000).toFixed(1)}s)`;
          } else if (suspicious) {
            linkAlert = `⚠️ Link looks suspicious (may be unsafe)`;
          }

          if (linkAlert) {
            steps.push(`ALERT: ${linkAlert}`);
          }

          if (fetchError || !res) {
            return {
              type: 'error',
              url,
              error: fetchError || 'Unknown fetch error',
              alert: linkAlert,
              steps,
              elapsed: Date.now() - startTime
            };
          }

          if (contentType.startsWith('image/')) {
            steps.push('Step 2: Detected image file. Previewing and initiating AI analysis.');
            const imageType = contentType.split('/')[1] || 'image';
            let imageName = 'image';
            try { imageName = new URL(url).pathname.split('/').pop() || 'image'; } catch {}
            const markdownPreview = `![Preview of ${imageName}](${url})`;
            let analysis = "Image analysis could not be performed at this time.";
            let analysisError = null;
            try {
              steps.push('Step 2a: Sending image to Gemini for analysis.');
              const geminiModel = google('gemini-2.0-flash');
              const analysisResult = await generateText({
                model: geminiModel,
                messages: [
                  { role: 'user', content: [
                    { type: 'text', text: 'Describe this image in detail. What is depicted (objects, beings, scene)? What are the key visual elements (colors, composition, style)? If there are actions or a story, briefly describe it. Provide a comprehensive and objective description.' },
                    { type: 'image', image: new URL(url) },
                  ] },
                ],
              });
              analysis = analysisResult.text;
              steps.push('Step 2b: Image analysis received from Gemini.');
            } catch (e: unknown) {
              const msg = e instanceof Error ? e.message : String(e);
              steps.push(`Step 2b: Error during Gemini image analysis: ${msg}`);
              analysisError = `AI analysis failed: ${msg}`;
              analysis = `AI-powered analysis of the image failed. Details: ${msg}`;
            }
            return {
              type: 'image_analyzed', url, markdown: markdownPreview, analysis, description: `The URL points to an image (${imageType.toUpperCase()}). Markdown Preview: ${markdownPreview}. AI-generated analysis: ${analysis}`,
              ...(analysisError && { analysisErrorDetail: analysisError }), steps, elapsed: Date.now() - startTime,
            };
          } else if (contentType.includes('application/pdf')) {
            steps.push('Step 2: Detected PDF document.');
            return { type: 'document', url, description: 'PDF document. Content analysis and table extraction are not supported by this tool for PDFs.', steps, elapsed: Date.now() - startTime };
          } else if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml') && !contentType.includes('application/xml')) {
            steps.push('Step 2: Detected non-HTML, non-image, non-PDF file. Attempting to extract plain text preview.');
            let textPreview = "Content is not plain text or could not be previewed.";
          if (contentType.startsWith('text/')) {
            try {
              if (res) {
                const text = await res.text();
                textPreview = text.slice(0, 500) + (text.length > 500 ? '...' : '');
              }
            } catch (e: unknown) { const msg = e instanceof Error ? e.message : String(e); steps.push(`Step 2c: Error reading text content: ${msg}`); textPreview = "Error reading text content."; }
          }
          return { type: 'file', url, preview: textPreview, contentType, description: `File (${contentType}). Preview: ${textPreview}`, steps, elapsed: Date.now() - startTime };
          }
          // --- Process HTML ---
          steps.push('Step 2: Processing HTML content.');
          let html = '';
          if (res) {
            html = await res.text();
          }
          const metaDescription = (html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["'][^>]*>/i) || [])[1] || '';
          const ogTitle = (html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["'][^>]*>/i) || [])[1] || '';
          const ogDescription = (html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["'][^>]*>/i) || [])[1] || '';
          const headings = Array.from(html.matchAll(/<(h[1-3])[^>]*>(.*?)<\/\1>/gi)).map(m => ({ tag: m[1], text: m[2].replace(/<[^>]+>/g, '').trim() })).slice(0, 10);
          const navLinks = Array.from(html.matchAll(/<a[^>]+href=["']([^"'#?]+)["'][^>]*>(.*?)<\/a>/gi))
            .map(m => { try { return { href: new URL(m[1], url).toString(), text: m[2].replace(/<[^>]+>/g, '').trim() }; } catch { return null; } })
            .filter(l => l && l.text && l.href && l.href.length < 256 && l.href.startsWith('https'))
            .slice(0, 20);
          const productCards = Array.from(html.matchAll(/<div[^>]*class=["'][^"']*(product|card|item|listing)[^"']*["'][^>]*>([\s\S]*?)(<\/div>)/gi))
            .map(m => { const block = m[2]; const name = (block.match(/<h[1-4][^>]*>(.*?)<\/h[1-4]>/i) || [])[1]?.replace(/<[^>]+>/g, '').trim() || ''; const price = (block.match(/\$[0-9,.]+/) || [])[0] || ''; const features = Array.from(block.matchAll(/<li[^>]*>(.*?)<\/li>/gi)).map(x => x[1].replace(/<[^>]+>/g, '').trim()); const img = (block.match(/<img[^>]+src=["']([^"']+)["']/i) || [])[1] || ''; return { name, price, features, img }; }).filter(card => card.name || card.price || card.features.length > 0).slice(0, 10);
          const faqs = Array.from(html.matchAll(/<details[\s\S]*?<\/details>/gi)).map(f => f[0].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 200));
          const newsSections = Array.from(html.matchAll(/<(section|div)[^>]+(news|blog|update)[^>]*>[\s\S]*?<\/(section|div)>/gi)).map(s => s[0].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 400));
          steps.push('Step 3: Extracting table data.');
          const extractedTables = parseHtmlTables(html);
          let chartMarkdown = null;
          if (userIntent && /chart|visualize|plot|bar chart|graph/i.test(userIntent) && extractedTables.length > 0) {
            let col;
            const match = userIntent.match(/(?:of|for)\s+([\w\s]+)/i);
            if (match && match[1]) {
              const guess = match[1].trim().toLowerCase();
              col = extractedTables[0].headers.find(h => h.toLowerCase().includes(guess));
            }
            if (!col && extractedTables[0].headers.length > 0) {
              for (const h of extractedTables[0].headers) {
                const vals = extractedTables[0].rows.map(r => r[h].replace(/[$,%]/g, '').replace(/,/g, ''));
                if (vals.some(v => !isNaN(parseFloat(v)))) { col = h; break; }
              }
            }
            if (col) { chartMarkdown = generateMarkdownBarChart(extractedTables[0], col); }
          }
          steps.push(`Step 4: Found ${extractedTables.length} potential table(s).`);
          const mainText = html
            .replace(/<script[\s\S]*?<\/script>/gi, '')
            .replace(/<style[\s\S]*?<\/style>/gi, '')
            .replace(/<head[\s\S]*?<\/head>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

          // --- Abstractive Summarization: Use Gemini to generate a fluent summary ---
          try {
            if (mainText && mainText.length > 100) {
              const abstractivePrompt = `Summarize the following web page content in a concise, fluent, and readable way. Capture the main points and key facts, using your own words. Limit to 3-5 sentences.\n\n---\n${mainText.slice(0, 4000)}`;
              const geminiModel = google('gemini-2.5-flash-preview-05-20');
              const abstractiveResult = await generateText({ model: geminiModel, prompt: abstractivePrompt });
              abstractiveSummary = abstractiveResult.text.trim();
            }
          } catch (e) {
            abstractiveSummary = '';
          }

          // --- Automatic Language Detection ---
          let language = 'und';
          try {
            if (mainText && mainText.length > 20) {
              language = franc(mainText, { minLength: 3 }) || 'und';
            }
          } catch (e) {
            language = 'und';
          }

          // --- Build summary before translation logic ---
          // Use abstractive summary if available, otherwise fallback to old extractive summary
          const summary = abstractiveSummary || [
            ogTitle || headings[0]?.text,
            metaDescription || ogDescription,
            ...headings.slice(1, 3).map(h => h.text),
            extractedTables.length > 0 ? `Contains ${extractedTables.length} data table(s).` : '',
            ...productCards.slice(0, 2).map(c => `${c.name} ${c.price}`),
            ...faqs.slice(0, 1),
            ...newsSections.slice(0, 1),
            mainText.slice(0, 500)
          ].filter(Boolean).join(' | ').replace(/\s+/g, ' ').slice(0, 1500);

          // --- Language Mole: Translate only the summary if not user's language ---
          let translated = false;
          let translation = '';
          let targetLanguageForCache = detectedUserLang;
          // --- Translation Caching and Retry Logic ---
          // Use a hash of summary+targetLanguage for cache key
          function hashSummary(summary: string, lang: string) {
            let hash = 0, i, chr;
            if (!summary) return '0';
            for (i = 0; i < summary.length; i++) {
              chr = summary.charCodeAt(i);
              hash = ((hash << 5) - hash) + chr;
              hash |= 0;
            }
            return `${lang}_${Math.abs(hash)}`;
          }
          // Only translate if the page language is not the user's preferred language and not undetermined
          if (language !== detectedUserLang && language !== 'und' && mainText.length > 0) {
            const summaryHash = hashSummary(summary, detectedUserLang || 'eng');
            // Check if translation for this summary and target language is already cached
            const cacheKey = `translation_${summaryHash}`;
            const cached = moleMemory.get(cacheKey);
            if (cached && typeof cached === 'string' && cached.length > 0) {
              translation = cached;
              translated = true;
            } else {
              // Retry logic for Gemini translation
              const langMap: Record<string, string> = {
                eng: 'English',
                fra: 'French',
                spa: 'Spanish',
                deu: 'German',
                ita: 'Italian',
                rus: 'Russian',
                zho: 'Chinese',
                jpn: 'Japanese',
                kor: 'Korean',
                por: 'Portuguese',
                ara: 'Arabic',
                hin: 'Hindi',
              };
              const targetLangName = langMap[detectedUserLang ?? 'eng'] || 'English';
              let summaryToTranslate = summary && typeof summary === 'string' && summary.length > 0 ? summary : mainText.slice(0, 1000);
              const MAX_TRANSLATE_CHARS = 800;
              if (summaryToTranslate.length > MAX_TRANSLATE_CHARS) {
                const summarizePrompt = `Summarize the following text in ${targetLangName} in under ${MAX_TRANSLATE_CHARS} characters.\n\n---\n${summaryToTranslate}`;
                const geminiModel = google('gemini-2.5-flash-preview-05-20');
                let summaryResult;
                for (let attempt = 0; attempt < 2; attempt++) {
                  try {
                    summaryResult = await generateText({ model: geminiModel, prompt: summarizePrompt });
                    if (summaryResult && summaryResult.text) break;
                  } catch {}
                }
                summaryToTranslate = summaryResult?.text?.slice(0, MAX_TRANSLATE_CHARS) || summaryToTranslate.slice(0, MAX_TRANSLATE_CHARS);
              }
              const translationPrompt = `Translate the following summary to ${targetLangName}. Only output the translation, no explanation.\n\n---\n${summaryToTranslate}`;
              const geminiModel = google('gemini-2.5-flash-preview-05-20');
              let translationResult;
              for (let attempt = 0; attempt < 2; attempt++) {
                try {
                  translationResult = await generateText({ model: geminiModel, prompt: translationPrompt });
                  if (translationResult && translationResult.text) break;
                } catch {}
              }
              translation = translationResult?.text || '';
              if (translation) {
                translated = true;
                moleMemory.set(cacheKey, translation);
              } else {
                translated = false;
              }
            }
          }
          let siteType = 'general';
          if (productCards.length > 2) siteType = 'e-commerce';
          else if (newsSections.length > 0 || /news|blog|article/i.test(html)) siteType = 'news/blog';
          else if (faqs.length > 0) siteType = 'docs/faq';
          else if (extractedTables.length > 0) siteType = 'data/table';
          steps.push('Step 5: Analyzing content and intent.');
          let suggestedLinks: { href: string; text: string }[] = [];
          if (userIntent && !userIntent.toLowerCase().includes('analyze')) {
            const lowerIntent = userIntent.toLowerCase();
            suggestedLinks = navLinks
              .filter((l) => !!l)
              .filter((l): l is { href: string; text: string } => !!l)
              .filter(l => {
                const linkTextLower = l.text.toLowerCase();
                return lowerIntent.split(' ').some((word: string) => word.length > 3 && linkTextLower.includes(word)) || linkTextLower.includes(lowerIntent);
              });
            if (suggestedLinks.length > 0) {
              steps.push(`Step 6: Based on intent '${userIntent}', suggesting navigation to: ${suggestedLinks.map(l => `[${l.text}](${l.href})`).join(', ')}`);
            } else {
              steps.push(`Step 6: No direct navigation links found matching intent '${userIntent}'.`);
            }
          } else if (userIntent?.toLowerCase().includes('analyze') && extractedTables.length === 0) {
            steps.push(`Step 6: User asked to analyze data, but no tables were extracted.`);
          } else if (userIntent?.toLowerCase().includes('analyze') && extractedTables.length > 0) {
            steps.push(`Step 6: User asked to analyze data. Found ${extractedTables.length} table(s). Passing data to AI.`);
          }
          const articleLinks = Array.from(html.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi))
            .map(m => { try { const href = new URL(m[1], url).toString(); const text = m[2].replace(/<[^>]+>/g, '').trim(); const isArticle = /(\/article|\/news|\/blog|\/post|\/story|[\d-]+\.html?$)/i.test(href); return (isArticle && text && href.startsWith('http')) ? { href, text } : null; } catch { return null; } })
            .filter(Boolean).slice(0, 50);
          steps.push('Step 7: Compiling results.');
          const resultObj = {
            type: 'website',
            url,
            siteType,
            title: ogTitle || (headings[0]?.text ?? url),
            metaDescription,
            ogTitle,
            ogDescription,
            headings,
            navLinks,
            productCards,
            faqs,
            newsSections,
            extractedTables,
            chartMarkdown,
            summary,
            preview: mainText.slice(0, 1000) + (mainText.length > 1000 ? '...' : ''),
            suggestedLinks,
            articleLinks,
            language, // Add detected language code (e.g., 'eng', 'spa', 'und')
            ...(translated ? { translation } : {}),
            translated,
            targetLanguage: targetLanguageForCache,
            steps,
            elapsed: Date.now() - startTime,
            ...(linkAlert ? { alert: linkAlert } : {})
          };
          // --- Mole Memory: Save to cache (including translation and targetLanguage) ---
          // Only cache if not an error (type === 'error' means error)
          if (!resultObj.type || resultObj.type !== 'error') {
            moleMemory.set(url, resultObj);
          } else {
            moleMemory.delete(url);
          }
          return resultObj;
          // --- END: Original fetch/analyze logic ---
        })();
        // (cache is now handled above)
      }

      // --- Main Avurna fetch (no recursion, just main page) ---
      const mainResult = await fetchAndAnalyzeSingle({ url: urlToFetch, referer, userIntent });
      // --- Robust error handling: If mainResult is missing or is an error, return early ---
      if (!mainResult || mainResult.type === 'error') {
        return {
          ...mainResult,
          moles: [],
          topicClusters: [],
          timeTravelMoles: [],
          toolFeatures: `Error: ${mainResult?.error || 'Unknown error'}`
        };
      }

      // --- Smart Moles: Specialized moles with "skills" ---
      type MoleResult = {
        url: string;
        title?: string;
        summary?: string;
        siteType?: string;
        language?: string;
        error?: string;
        elapsed?: number;
        translation?: string;
        translated?: boolean;
        targetLanguage?: string;
        skill?: string;
        images?: string[];
        videos?: string[];
        facts?: string[];
      };
      let moleResults: MoleResult[] = [];
      let topicClusters: Record<string, any[]> = {};
      let clusterSummaries: { topic: string; count: number; summary: string }[] = [];
      if (mainResult && Array.isArray(mainResult.navLinks) && mainResult.navLinks.length > 0) {
        // Smart moles: assign skills
        type NavLink = { href: string; text: string };
        const allLinks = (mainResult.navLinks as NavLink[])
          .filter((link: NavLink) => link && link.href && !visited.has(link.href) && (!origin || link.href.startsWith(origin)));
        // Limit to remaining maxPages
        const availableSlots = Math.max(0, maxPages - pagesFetched);
        const linksToFetch = allLinks.slice(0, availableSlots);
        // Mark as visited before fetching to avoid race conditions
        linksToFetch.forEach((link: NavLink) => visited.add(link.href));

        // Define mole skills
        const moleSkills = [
          { skill: 'image-expert', match: (l: NavLink) => /image|img|photo|gallery|media|pic|unsplash|pexels|flickr|instagram|jpg|jpeg|png|gif/i.test(l.text + l.href) },
          { skill: 'video-expert', match: (l: NavLink) => /video|youtube|vimeo|mp4|mov|avi|stream/i.test(l.text + l.href) },
          { skill: 'facts-expert', match: (l: NavLink) => /fact|about|info|wiki|encyclopedia|data|stat/i.test(l.text + l.href) },
          { skill: 'summary-expert', match: (_l: NavLink) => true }, // fallback
        ];

        // Assign a skill to each mole
        const skilledLinks = linksToFetch.map((link, idx) => {
          const skillObj = moleSkills.find(s => s.match(link)) || moleSkills[moleSkills.length - 1];
          return { ...link, skill: skillObj.skill };
        });

        // Fetch all links concurrently (moles)
        let rawMoleResults: MoleResult[] = await Promise.all(
          skilledLinks.map(async (link: NavLink & { skill: string }): Promise<MoleResult> => {
            if (timedOut || pagesFetched >= maxPages) return { error: 'Timeout or maxPages reached', url: link.href, skill: link.skill };
            try {
              pagesFetched++;
              // Moles only fetch the page summary, not recursion
              const mole = await fetchAndAnalyzeSingle({ url: link.href, referer: urlToFetch, userIntent });
              // Skill-specific extraction
              let images: string[] = [];
              let videos: string[] = [];
              let facts: string[] = [];
              if (link.skill === 'image-expert') {
                // Extract images from navLink or HTML (if available)
                if (mole && mole.preview) {
                  images = Array.from((mole.preview as string).matchAll(/https?:[^\s]+\.(jpg|jpeg|png|gif)/gi)).map(m => m[0]);
                }
                if (mole && Array.isArray(mole.productCards)) {
                  for (const card of mole.productCards) {
                    if (card.img) images.push(card.img);
                  }
                }
              } else if (link.skill === 'video-expert') {
                if (mole && mole.preview) {
                  videos = Array.from((mole.preview as string).matchAll(/https?:[^\s]+\.(mp4|mov|avi|webm)/gi)).map(m => m[0]);
                  // YouTube/Vimeo links
                  videos = videos.concat(Array.from((mole.preview as string).matchAll(/https?:\/\/(www\.)?(youtube|vimeo)\.com\/[\w\-\?=&#]+/gi)).map(m => m[0]));
                }
              } else if (link.skill === 'facts-expert') {
                if (mole && mole.summary) {
                  // Extract short facts (split by period, filter short sentences)
                  facts = (mole.summary as string).split('.').map(s => s.trim()).filter(s => s.length > 10 && s.length < 120);
                }
              }
              return {
                url: mole.url,
                title: mole.title,
                summary: mole.summary,
                siteType: mole.siteType,
                language: mole.language,
                error: mole.error,
                elapsed: mole.elapsed,
                translation: mole.translation,
                translated: mole.translated,
                targetLanguage: mole.targetLanguage,
                skill: link.skill,
                images,
                videos,
                facts,
              };
            } catch (e) {
              return { error: String(e), url: link.href, skill: link.skill, translation: undefined, translated: false };
            }
          })
        );

        // --- Batch translation for moles if needed ---
        const molesNeedingTranslation = rawMoleResults.filter(mole => mole.summary && mole.language && mole.language !== detectedUserLang && mole.language !== 'und' && (!mole.translated || mole.targetLanguage !== detectedUserLang));
        if (molesNeedingTranslation.length > 0) {
          try {
            const langMap: Record<string, string> = {
              eng: 'English',
              fra: 'French',
              spa: 'Spanish',
              deu: 'German',
              ita: 'Italian',
              rus: 'Russian',
              zho: 'Chinese',
              jpn: 'Japanese',
              kor: 'Korean',
              por: 'Portuguese',
              ara: 'Arabic',
              hin: 'Hindi',
            };
            const targetLangName = langMap[detectedUserLang ?? 'eng'] || 'English';
            const summaries = molesNeedingTranslation.map((m, i) => `${i + 1}. ${m.summary}`);
            const batchPrompt = `Translate the following ${summaries.length} summaries to ${targetLangName}. Only output the translations, numbered, in the same order, no explanation.\n\n${summaries.join('\n')}`;
            const geminiModel = google('gemini-2.5-flash-preview-05-20');
            const translationResult = await generateText({ model: geminiModel, prompt: batchPrompt });
            const translations = translationResult.text.split(/\n+/).filter(line => line.trim()).map(line => line.replace(/^\d+\.\s*/, ''));
            molesNeedingTranslation.forEach((mole, idx) => {
              if (translations[idx]) {
                mole.translation = translations[idx];
                mole.translated = true;
                mole.targetLanguage = detectedUserLang;
                if (mole.url) {
                  const cached = moleMemory.get(mole.url) || {};
                  moleMemory.set(mole.url, { ...cached, ...mole });
                }
              }
            });
          } catch (e) {}
        }
        moleResults = rawMoleResults;
        // --- Topic Clustering ---
        for (const mole of moleResults) {
          const topic = mole.siteType || 'other';
          if (!topicClusters[topic]) topicClusters[topic] = [];
          topicClusters[topic].push(mole);
        }
        for (const topic of Object.keys(topicClusters)) {
          const group = topicClusters[topic];
          const summary = group.map(m => m.title || m.summary || m.url).slice(0, 3).join(' | ');
          clusterSummaries.push({ topic, count: group.length, summary });
        }
      }

      // --- Time Travel Moles: Fetch older versions of the main page using the Wayback Machine ---
      // Fetches for 1, 3, and 5 years ago (if available)
      const timeTravelMoles = await Promise.all([
        fetchWaybackSnapshot(urlToFetch, 1),
        fetchWaybackSnapshot(urlToFetch, 3),
        fetchWaybackSnapshot(urlToFetch, 5),
      ]);

      if (mainResult && Array.isArray(mainResult.navLinks) && mainResult.navLinks.length > 0) {
        // Avurna decides when to use moles: always if there are links, but can be made smarter later
        type NavLink = { href: string; text: string };
        const allLinks = (mainResult.navLinks as NavLink[])
          .filter((link: NavLink) => link && link.href && !visited.has(link.href) && (!origin || link.href.startsWith(origin)));
        // Limit to remaining maxPages
        const availableSlots = Math.max(0, maxPages - pagesFetched);
        const linksToFetch = allLinks.slice(0, availableSlots);
        // Mark as visited before fetching to avoid race conditions
        linksToFetch.forEach((link: NavLink) => visited.add(link.href));
        // Fetch all links concurrently (moles)
        moleResults = await Promise.all(
          linksToFetch.map(async (link: NavLink) => {
            if (timedOut || pagesFetched >= maxPages) return { error: 'Timeout or maxPages reached', url: link.href };
            try {
              // Each fetch increments pagesFetched
              pagesFetched++;
              // Moles only fetch the page summary, not recursion
              const mole = await fetchAndAnalyzeSingle({ url: link.href, referer: urlToFetch, userIntent });
              // Only return a summary and key info for each mole
              return {
                url: mole.url,
                title: mole.title,
                summary: mole.summary,
                siteType: mole.siteType,
                language: mole.language,
                error: mole.error,
                elapsed: mole.elapsed,
              };
            } catch (e) {
              return { error: String(e), url: link.href };
            }
          })
        );
        // --- Topic Clustering ---
        // Group by siteType (fallback to 'other'), then summarize each group
        for (const mole of moleResults) {
          const topic = mole.siteType || 'other';
          if (!topicClusters[topic]) topicClusters[topic] = [];
          topicClusters[topic].push(mole);
        }
        // Create a summary for each cluster
        for (const topic of Object.keys(topicClusters)) {
          const group = topicClusters[topic];
          // Simple summary: join titles or summaries
          const summary = group.map(m => m.title || m.summary || m.url).slice(0, 3).join(' | ');
          clusterSummaries.push({ topic, count: group.length, summary });
        }
      }

      // Return main result + mole results + topic clusters + time travel moles
      // --- Compose enhanced tool result summary ---
      let toolFeatures: string[] = [];
      // Defensive: check mainResult is defined and not an error before accessing properties
      if (!mainResult || mainResult.type === 'error') {
        return {
          ...mainResult,
          moles: moleResults,
          topicClusters: clusterSummaries,
          timeTravelMoles,
          toolFeatures: `Error: ${mainResult?.error || 'Unknown error'}`
        };
      }
      // Mention language detection and translation
      toolFeatures.push(`Language detected: "${mainResult.language || 'und'}"`);
      if (mainResult.translated) {
        toolFeatures.push(`Summary translated to user's language (${mainResult.targetLanguage || ''})`);
      } else {
        toolFeatures.push('No translation needed');
      }
      // Mention moles (subpage summaries)
      if (moleResults && moleResults.length > 0) {
        const moleSummaries = moleResults
          .filter(m => m && (m.summary || m.title))
          .map(m => `- [${m.title || m.url}]: ${m.summary ? m.summary.slice(0, 120) : ''}${m.translated ? ` (translated)` : ''}`)
          .join('\n');
        toolFeatures.push(`Mole results (subpage summaries):\n${moleSummaries}`);
      } else {
        toolFeatures.push('No mole (subpage) summaries available');
      }
      // Mention time-travel moles
      if (timeTravelMoles && timeTravelMoles.length > 0) {
        const timeTravelSummaries = timeTravelMoles.map((snap) => {
          if (snap && snap.snapshotUrl && !snap.error) {
            return `- Wayback snapshot from ${snap.yearsAgo} year(s) ago: ${snap.snapshotUrl}`;
          } else if (snap && snap.error) {
            return `- Wayback snapshot from ${snap.yearsAgo} year(s) ago: [${snap.error}]`;
          }
          return null;
        }).filter(Boolean).join('\n');
        toolFeatures.push(`Time-travel moles:\n${timeTravelSummaries}`);
      } else {
        toolFeatures.push('No time-travel moles available');
      }

      return {
        ...mainResult,
        moles: moleResults,
        topicClusters: clusterSummaries,
        timeTravelMoles,
        toolFeatures: toolFeatures.join('\n'),
      };
    }

    // --- Main entry: handle single or multiple URLs ---
    if (Array.isArray(urlOrUrls)) {
      // --- Parallel/concurrent processing: record total elapsed time ---
      const parallelStart = Date.now();
      // For each URL, measure its own elapsed time
      const urlElapsedTimes: Record<string, number> = {};
      const urlStartTimes: Record<string, number> = {};
      const urlResultsPromises = urlOrUrls.map(async (u) => {
        urlStartTimes[u] = Date.now();
        const res = await processOneUrl(u);
        urlElapsedTimes[u] = Date.now() - urlStartTimes[u];
        return res;
      });
      const results = await Promise.all(urlResultsPromises);
      const totalElapsed = Date.now() - parallelStart;

      // --- Always include full main result details for each URL in the results array ---
      // Each result is a detailed object, not just a cluster or summary
      const detailedResults = results.map(res => {
        if (!res) return {};
        // Remove fields that are only for clustering, but keep all main details and moles/timeTravelMoles
        const { topicClusters, ...rest } = res;
        // Always ensure url, title, summary, siteType are present
        return {
          url: rest.url,
          title: rest.title || '',
          summary: rest.summary || '',
          siteType: rest.siteType || 'other',
          elapsed: urlElapsedTimes[rest.url] || rest.elapsed || undefined,
          ...rest
        };
      });

      // --- Unified Clustering: cluster all main and mole results together by siteType ---
      // Flatten all main results and all their moles into a single array
      const allResults: any[] = [];
      for (const res of detailedResults) {
        if (res) {
          // Always include the main result
          allResults.push({
            url: res.url,
            title: res.title || '',
            summary: res.summary || '',
            siteType: res.siteType || 'other',
            isMain: true,
            moles: undefined,
            topicClusters: undefined,
            timeTravelMoles: undefined,
          });
          // Add moles if any
          if (Array.isArray(res.moles)) {
            for (const mole of res.moles) {
              if (mole && mole.url) {
                allResults.push({
                  url: mole.url,
                  title: mole.title || '',
                  summary: mole.summary || '',
                  siteType: mole.siteType || 'other',
                  isMain: false
                });
              }
            }
          }
        }
      }

      // --- Cluster by siteType ---
      const clusterMap: Record<string, any[]> = {};
      for (const item of allResults) {
        const topic = item.siteType || 'other';
        if (!clusterMap[topic]) clusterMap[topic] = [];
        clusterMap[topic].push(item);
      }

      // --- Always provide cluster summaries, even if there are no navLinks/moles ---
      const clusterSummaries: { topic: string; count: number; summary: string }[] = [];
      for (const topic of Object.keys(clusterMap)) {
        const group = clusterMap[topic];
        // Summarize: join up to 3 titles or summaries, fallback to url if missing
        const summary = group.map(m => m.title || m.summary || m.url || '').slice(0, 3).join(' | ');
        clusterSummaries.push({ topic, count: group.length, summary });
      }

      // --- Highlight news/blog cluster explicitly if present ---
      let newsBlogCluster: { topic: string; count: number; summary: string } | undefined = undefined;
      for (const cluster of clusterSummaries) {
        if (cluster.topic === 'news/blog') {
          newsBlogCluster = cluster;
          break;
        }
      }

      // --- Fallback: if no clusters found, return a cluster for each main result by siteType ---
      if (clusterSummaries.length === 0) {
        for (const res of detailedResults) {
          const topic = res.siteType || 'other';
          clusterSummaries.push({ topic, count: 1, summary: res.title || res.summary || res.url });
        }
      }

      // --- Compose parallel processing message ---
      const parallelMsg = `Parallel processing: All URLs were fetched and analyzed concurrently. Elapsed times per URL: ${detailedResults.map(r => `${r.url}: ${typeof r.elapsed === 'number' ? (r.elapsed / 1000).toFixed(2) + 's' : 'n/a'}`).join('; ')}. Total elapsed time: ${(totalElapsed / 1000).toFixed(2)}s.`;

      // Return results array, plus unified clusters, and parallel processing info
      return {
        results: detailedResults,
        topicClusters: clusterSummaries,
        ...(newsBlogCluster ? { newsBlogCluster } : {}),
        parallelProcessing: parallelMsg,
        totalElapsedMs: totalElapsed,
      };
    } else {
      // Single URL: process as before, but always cluster main result (even if no moles)
      const mainResult = await processOneUrl(urlOrUrls);
      // Always cluster the main result by siteType
      const topic = mainResult?.siteType || 'other';
      const clusterSummaries = [{
        topic,
        count: 1,
        summary: mainResult?.title || mainResult?.summary || mainResult?.url,
      }];
      // Attach topicClusters to the result
      // If news/blog, add explicit newsBlogCluster
      const newsBlogCluster = clusterSummaries.find(c => c.topic === 'news/blog');
      return {
        ...mainResult,
        topicClusters: clusterSummaries,
        ...(newsBlogCluster ? { newsBlogCluster } : {}),
      };
    }
  },
});

// --- Google Search Tool (as provided by user) ---
export const googleSearchTool = tool({
  description: "Search the web using Google Search Grounding for up-to-date information, current events, or general knowledge questions.",
  parameters: z.object({
    query: z.string().describe("The search query to look up on the web"),
  }),
  execute: async ({ query }) => {
    console.log(`googleSearchTool: Executing search for query: "${query}"`);
    try {
      const modelInstance = google('gemini-2.5-flash-preview-05-20', { // User-provided model
        useSearchGrounding: true,
        dynamicRetrievalConfig: {
          mode: 'MODE_DYNAMIC',
          dynamicThreshold: 0.8,
        },
      });

      const { text, sources, providerMetadata } = await generateText({ // generateText for google search
          model: modelInstance,
          prompt: query,
      });

      const metadata = providerMetadata?.google as any | undefined;
      const webSearchQueries = metadata?.groundingMetadata?.webSearchQueries ?? [];
      
      console.log(`googleSearchTool: Search successful for query: "${query}". Found ${sources?.length ?? 0} sources.`);

      return {
          query,
          groundedResponse: text,
          sources: sources ?? [],
          webSearchQueries,
      };
    } catch (error: any) {
        console.error(`googleSearchTool Error searching for "${query}":`, error);
        return {
          query,
          error: `Failed to execute Google search: ${error.message || error}`,
          groundedResponse: null,
          sources: [],
          webSearchQueries: [],
        };
    }
  },
});