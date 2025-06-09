// tools.ts (Agent X integration scaffold)
// import { agentXWebAgent, AgentXInstruction } from "./agent-x/agentXWebAgent";
import { franc } from 'franc'; // For automatic language detection
import { tool } from "ai";
import { z } from "zod";
import { google } from '@ai-sdk/google';      // For Gemini vision model
import { generateText } from 'ai';         // For calling the Gemini model
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


// Utility: Use LLM to parse user intent into AgentXInstruction (placeholder)
// async function parseInstructionWithLLM(userMessage: string): Promise<AgentXInstruction> {
//   // If Agent X is enabled, use Gemini LLM to parse the user intent dynamically
//   // This function is only called when agentX is true
//   try {
//     const geminiModel = google('gemini-2.5-flash-preview-04-17');
//     const prompt = `You are an expert web automation agent. Given the following user instruction, extract the user's goal (e.g., \"search video\", \"search product\", \"browse\", \"compare prices\", etc.), the main website to use (e.g., \"youtube.com\", \"amazon.com\", \"twitter.com\", etc.), and the query or keywords (if any) to use for the action.\n\nReturn a JSON object with keys: goal, site, query.\n\nUser instruction: \"${userMessage}\"`;
//     const { text } = await generateText({
//       model: geminiModel,
//       prompt,
//     });
//     // Try to parse the LLM output as JSON
//     let parsed: any = {};
//     try {
//       parsed = JSON.parse(text);
//     } catch {
//       // Fallback: try to extract with regex if not valid JSON
//       const goal = text.match(/goal\s*[:=]\s*["']?([\w\s-]+)["']?/i)?.[1] || "browse";
//       const site = text.match(/site\s*[:=]\s*["']?([\w.-]+)["']?/i)?.[1] || "";
//       const query = text.match(/query\s*[:=]\s*["']?([\w\s-]+)["']?/i)?.[1] || userMessage;
//       parsed = { goal, site, query };
//     }
//     // Ensure all fields are present
//     return {
//       goal: parsed.goal || "browse",
//       site: parsed.site || "",
//       query: parsed.query || userMessage,
//     };
//   } catch (e) {
//     // On error, fallback to simple rules
//     if (/youtube/i.test(userMessage)) {
//       return { goal: "search video", site: "youtube.com", query: userMessage.replace(/.*youtube/i, '').trim() || "" };
//     }
//     if (/amazon/i.test(userMessage)) {
//       return { goal: "search product", site: "amazon.com", query: userMessage.replace(/.*amazon/i, '').trim() || "" };
//     }
//     // Add more site rules as needed
//     return { goal: "browse", site: "", query: userMessage };
//   }
// }

// Utility: Format a value as inline code (ChatGPT style)
// ... (formatInlineCode function as provided)
export function formatInlineCode(value: string): string {
  return `\`${value.replace(/`/g, '\u0060')}\``;
}
// --- Helper Function for Basic Table Parsing (Simplified Regex Approach) ---
// ... (parseHtmlTables function as provided)
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

        if (headers.length > 0 && !tableHtml.match(/<thead/i)){
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
            } else if (cells.length > 0 && headers.length > 0 && cells.length !== headers.length) {
                // console.log(`Skipping row with ${cells.length} cells, expected ${headers.length}`);
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
            tables.push({ headers, data: tableData });
        } else if (rows.length > 0) {
             tables.push({ headers: [], data: rows });
        }
    }
    return tables.map(t => ({
        headers: t.headers,
        rows: Array.isArray(t.data[0])
            ? (t.data as string[][]).map(row => Object.fromEntries(row.map((cell, i) => [`Column ${i + 1}`, cell])))
            : t.data as Record<string, string>[]
    }));
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

// ### 2. Content Summarization with Abstractive Summarization 📝

// Instead of just grabbing snippets of text from a web page (like the `summary` field currently does), abstractive summarization aims to generate a *new*, concise, and coherent summary that captures the main points of the content.

// *   **The Idea:** Use a machine learning model to understand the meaning of the text and then re-write it in a shorter form, using different words and sentence structures.
// *   **Why it's SUPER:**
//     *   **More Readable Summaries:** Abstractive summaries are typically more fluent and easier to understand than extractive summaries (which just pull out existing sentences).
//     *   **Better at Capturing the Essence:** The model can identify the most important information and discard irrelevant details.
//     *   **Handles Complex Text:** Can summarize text that is difficult to summarize using simple techniques.
// *   **The Code (Conceptual):**

//     ```typescript
//     import { pipeline } from '@xenova/transformers';

//     let summarizer = null;

//     async function initializeSummarizer() {
//         summarizer = await pipeline('summarization', 'Xenova/distilbart-cnn-12-6');
//     }

//     async function generateAbstractiveSummary(text: string) {
//         if (!summarizer) {
//             await initializeSummarizer();
//         }
//         const output = await summarizer(text, {
//             max_length: 130,
//             min_length: 30,
//             do_sample: false
//         });
//         return output[0].summary_text;
//     }

//     async function fetchUrlToolExecute({ url }: { url: string }) {
//         // ...
//         const html = await res.text();
//         const mainText = extractMainText(html); // Function to extract the main content
//         const abstractiveSummary = await generateAbstractiveSummary(mainText);

//         return {
//             // ...
//             summary: abstractiveSummary // Replace the old summary with the new one
//         };
//     }
//     ```

//     *   **Note:** This example uses the `transformers` library (specifically, the `@xenova/transformers` version for browser/serverless environments) and a pre-trained summarization model. You'll need to install the library (`npm install @xenova/transformers`).
// *   **Example:**

//     > Original Text: "The quick brown rabbit jumps over the lazy frogs with no effort. The frogs are tired and sleepy. The rabbit is very fast."
//     >
//     > Abstractive Summary: "A fast rabbit effortlessly jumps over tired, sleepy frogs."

export const fetchUrlTool = tool({
  description:
    "Enterprise-grade: Deeply fetch and analyze a URL. Extracts product cards, prices, features, navigation, HTML tables, FAQs, news/blogs, and classifies site type. Supports multi-step reasoning and interactive data analysis on extracted tables. If the URL is an image, it will be previewed and an AI will analyze and describe its content. Returns structured data, reasoning steps, and rich summaries. Now supports Agent X for dynamic site interaction (Amazon, YouTube, more). Now supports recursive link following with safeguards (recursionDepth, maxPages, timeout, domain restriction, visited tracking). Now supports extracting and rendering images and videos embedded in HTML pages.",
  parameters: z.object({
    url: z.string().describe("The URL to fetch and analyze"),
    referer: z.string().optional().describe("The referring page, for multi-step navigation"),
    userIntent: z.string().optional().describe("The user's question or intent, for focused extraction, including data analysis requests like 'analyze the table'."),
    agentX: z.boolean().optional().describe("If true, use Agent X for dynamic web interaction (Amazon, YouTube, etc.)"),
    recursionDepth: z.number().optional().describe("How many levels of links to follow recursively (0 = just this page, 1 = follow links on this page, etc.)"),
    maxPages: z.number().optional().describe("Maximum total number of pages to fetch (default 10)"),
    timeoutMs: z.number().optional().describe("Timeout in milliseconds for the entire operation (default 20000 ms)"),
  }),
  execute: async (params) => {
    // --- Recursive Link Following Implementation ---
    const {
      url,
      referer,
      userIntent,
      agentX,
      recursionDepth = 0,
      maxPages = 10,
      timeoutMs = 20000,
    } = params;
    const visited = new Set<string>();
    const origin = (() => { try { return new URL(url).origin; } catch { return null; } })();
    let pagesFetched = 0;
    let timedOut = false;
    const startTime = Date.now();

    async function fetchAndAnalyze({ url, referer, userIntent, agentX, depth }: { url: string, referer?: string, userIntent?: string, agentX?: boolean, depth: number }): Promise<any> {
      if (timedOut) return { error: 'Timeout reached', url };
      if (pagesFetched >= maxPages) return { error: 'Max pages limit reached', url };
      if (visited.has(url)) return { error: 'Already visited', url };
      if (origin && !(url.startsWith(origin))) return { error: 'Out of domain', url };
      if (Date.now() - startTime > timeoutMs) { timedOut = true; return { error: 'Timeout reached', url }; }
      visited.add(url);
      pagesFetched++;
      // Call the original fetch/analyze logic (non-recursive)
      // Use the original tool logic, but skip recursion params
      const result = await (async () => {
        // --- BEGIN: Original fetch/analyze logic ---
        // if (agentX) {
        //   const instruction = userIntent
        //     ? await parseInstructionWithLLM(userIntent)
        //     : { goal: "browse", site: url, query: "" };
        //   const siteUrl = instruction.site || url;
        //   const result = await agentXWebAgent({ instruction, url: siteUrl });
        //   return result;
        // }
        const steps: string[] = [];
        steps.push(`Step 1: Fetching ${url}`);
        const headers: Record<string, string> = {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        };
        if (referer) headers['Referer'] = referer;
        const res = await fetch(url, { method: 'GET', headers });
        const contentType = res.headers.get('content-type') || '';
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
            try { const text = await res.text(); textPreview = text.slice(0, 500) + (text.length > 500 ? '...' : ''); } catch (e: unknown) { const msg = e instanceof Error ? e.message : String(e); steps.push(`Step 2c: Error reading text content: ${msg}`); textPreview = "Error reading text content."; }
          }
          return { type: 'file', url, preview: textPreview, contentType, description: `File (${contentType}). Preview: ${textPreview}`, steps, elapsed: Date.now() - startTime };
        }
        // --- Process HTML ---
        steps.push('Step 2: Processing HTML content.');
        const html = await res.text();
        // Extract images and videos from HTML
        const images = extractImagesFromHtml(html, url);
        const videos = extractVideosFromHtml(html, url);
        // Render all images as Markdown previews (batch)
        const imagesMarkdown = renderImagesAsMarkdown(images);
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

        // --- Automatic Language Detection ---
        let language = 'und';
        try {
          if (mainText && mainText.length > 20) {
            language = franc(mainText, { minLength: 3 }) || 'und';
          }
        } catch (e) {
          language = 'und';
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
        const summary = [
          ogTitle || headings[0]?.text,
          metaDescription || ogDescription,
          ...headings.slice(1, 3).map(h => h.text),
          extractedTables.length > 0 ? `Contains ${extractedTables.length} data table(s).` : '',
          ...productCards.slice(0, 2).map(c => `${c.name} ${c.price}`),
          ...faqs.slice(0, 1),
          ...newsSections.slice(0, 1),
          mainText.slice(0, 500)
        ].filter(Boolean).join(' | ').replace(/\s+/g, ' ').slice(0, 1500);
        steps.push('Step 7: Compiling results.');
        return {
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
          images, // Embedded images extracted from HTML
          imagesMarkdown, // Markdown batch preview of all images
          videos, // Embedded videos extracted from HTML
          steps,
          elapsed: Date.now() - startTime
        };
        // --- END: Original fetch/analyze logic ---
      })();
      // --- RECURSION: If depth > 0, follow links ---
      if (depth > 0 && result && 'navLinks' in result && Array.isArray((result as any).navLinks)) {
        // Gather eligible links for concurrent fetching
        const allLinks = ((result as any).navLinks as { href: string; text: string }[])
          .filter(link => link && link.href && !visited.has(link.href) && (!origin || link.href.startsWith(origin)));
        // Limit to remaining maxPages
        const availableSlots = Math.max(0, maxPages - pagesFetched);
        const linksToFetch = allLinks.slice(0, availableSlots);
        // Mark as visited before fetching to avoid race conditions
        linksToFetch.forEach(link => visited.add(link.href));
        // Fetch all links concurrently
        const childResults = await Promise.all(
          linksToFetch.map(async link => {
            if (timedOut || pagesFetched >= maxPages) return { error: 'Timeout or maxPages reached', url: link.href };
            try {
              // Each fetch increments pagesFetched
              pagesFetched++;
              return await fetchAndAnalyze({ url: link.href, referer: url, userIntent, agentX, depth: depth - 1 });
            } catch (e) {
              return { error: String(e), url: link.href };
            }
          })
        );
        return { ...result, childResults };
      } else {
        return result;
      }
    }
    // --- Start recursion ---
    return await fetchAndAnalyze({ url, referer, userIntent, agentX, depth: recursionDepth });
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

// --- New Utilities: Extract Images and Videos from HTML ---
function extractImagesFromHtml(html: string, baseUrl: string): { src: string, alt: string }[] {
  const imgTagRegex = /<img\s+[^>]*src=["']([^"']+)["'][^>]*?(?:alt=["']([^"']*)["'])?[^>]*>/gi;
  const images: { src: string, alt: string }[] = [];
  let match;
  while ((match = imgTagRegex.exec(html)) !== null) {
    let src = match[1] || '';
    let alt = match[2] || '';
    try {
      src = new URL(src, baseUrl).toString();
      images.push({ src, alt });
    } catch {}
  }
  return images;
}

// Utility: Render images as Markdown previews (batch)
function renderImagesAsMarkdown(images: { src: string, alt: string }[]): string {
  if (!images.length) return '';
  return images.map((img, i) => {
    const alt = img.alt?.trim() || `Image ${i + 1}`;
    return `![${alt}](${img.src})`;
  }).join('\n\n');
}

function extractVideosFromHtml(html: string, baseUrl: string): { src: string, poster?: string, alt?: string }[] {
  const videoTagRegex = /<video[^>]*?(?:poster=["']([^"']*)["'])?[^>]*>([\s\S]*?)<\/video>/gi;
  const sourceTagRegex = /<source[^>]*src=["']([^"']+)["'][^>]*>/gi;
  const videos: { src: string, poster?: string, alt?: string }[] = [];
  let match;
  while ((match = videoTagRegex.exec(html)) !== null) {
    const poster = match[1];
    const videoInner = match[2];
    // Search for <source> tags inside <video>
    let src = '';
    let sourceMatch;
    if ((sourceMatch = sourceTagRegex.exec(videoInner)) !== null) {
      src = sourceMatch[1];
    } else {
      // Fallback: try <video src="...">
      const videoSrcMatch = /src=["']([^"']+)["']/.exec(match[0]);
      if (videoSrcMatch) src = videoSrcMatch[1];
    }
    if (src) {
      try {
        src = new URL(src, baseUrl).toString();
        videos.push({ src, poster, alt: poster });
      } catch {}
    }
  }
  return videos;
}