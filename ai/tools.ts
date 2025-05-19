import { tool } from "ai";
import { z } from "zod";
import { google } from '@ai-sdk/google';      // For Gemini vision model
import { generateText } from 'ai';         // For calling the Gemini model

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

// EXPLAIN Recursive Link Following (with safeguards):

// Allow the tool to recursively follow links within the initial page, up to a certain depth, to gather more comprehensive information.
// Add a recursionDepth parameter to the fetchUrlTool's parameters schema, limiting the depth of recursion to prevent infinite loops.
// Implement logic to recursively call the fetchUrlTool for each link found on the page, up to the specified depth.
// Add safeguards to prevent the tool from getting stuck in infinite loops or consuming excessive resources (e.g., by limiting the number of pages fetched and the total execution time). AND Content Summarization with Abstractive Summarization:

// Instead of just extracting snippets of text, use an abstractive summarization technique to generate a concise and coherent summary of the web page content.
// Integrate a summarization model (e.g., using the transformers library) to generate the summary.
// Replace the summary field in the fetchUrlTool's output with the generated abstractive summary. AND Automatic Language Detection:

// Use a language detection library (e.g., franc) to automatically detect the language of the web page content.
// Add a language field to the fetchUrlTool's output, indicating the detected language code (e.g., "en" for English, "es" for Spanish).

// Alright, let's dive deep into these three SUPER features: Recursive Link Following, Abstractive Summarization, and Automatic Language Detection! 🤩

// ### 1. Recursive Link Following (with Safeguards) 🔗

// Imagine your web scraping tool as a curious explorer. Instead of just looking at the surface (the initial web page), it can venture deeper by following links to related pages. This is what recursive link following does.

// *   **The Idea:** The tool starts at a given URL, extracts all the links, and then *automatically* visits those links, extracting information from them as well. This process can repeat, creating a "tree" of visited pages.
// *   **Why it's SUPER:**
//     *   **Comprehensive Data:** Get a much broader understanding of a topic by gathering information from multiple related pages.
//     *   **Discover Hidden Content:** Find content that might not be directly linked from the homepage but is still relevant.
//     *   **Automated Exploration:** Automate the process of exploring a website's structure and content.
// *   **The Code (Conceptual):**

//     ```typescript
//     async function fetchUrlToolExecute({ url, recursionDepth = 0 }: { url: string, recursionDepth: number }) {
//         // 1. Fetch and analyze the initial page (as before)
//         const initialResult = await analyzePage(url);

//         if (recursionDepth > 0) {
//             // 2. Extract links from the initial page
//             const links = initialResult.navLinks.map(l => l.href); // Assuming navLinks contains the URLs

//             // 3. Recursively call fetchUrlTool for each link (with reduced depth)
//             const childResults = await Promise.all(
//                 links.map(link =>
//                     fetchUrlToolExecute({ url: link, recursionDepth: recursionDepth - 1 })
//                 )
//             );

//             // 4. Combine the results (e.g., merge extracted tables, summaries, etc.)
//             return combineResults(initialResult, childResults);
//         } else {
//             return initialResult; // Base case: no more recursion
//         }
//     }
//     ```
// *   **The Safeguards (CRITICAL):**
//     *   **`recursionDepth` Parameter:** Limits how many levels deep the tool will go. A depth of 0 means no recursion, 1 means follow links on the initial page only, 2 means follow links on those pages, and so on.
//     *   **Maximum Pages Fetched:** Set a hard limit on the total number of pages the tool will fetch to prevent it from running indefinitely.
//     *   **Timeout:** Implement a timeout mechanism to stop the tool if it takes too long to process a single page or the entire process.
//     *   **Visited Links Tracking:** Keep track of the links that have already been visited to avoid infinite loops (e.g., if page A links to page B, and page B links back to page A).
//     *   **Domain Restriction:** Only follow links within the same domain as the initial URL to prevent the tool from wandering off to unrelated websites.
// *   **Example:**

//     > User: "Fetch and analyze [https://example.com](https://example.com) with a recursion depth of 2."
//     >
//     > The tool would:
//     >
//     > 1.  Fetch and analyze [https://example.com](https://example.com).
//     > 2.  Extract all links from [https://example.com](https://example.com).
//     > 3.  Fetch and analyze each of those links.
//     > 4.  Extract all links from those pages.
//     > 5.  Fetch and analyze each of *those* links (depth of 2 reached).
//     > 6.  Combine all the extracted information into a single result.

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

// ### 3. Automatic Language Detection 🌐

// Knowing the language of a web page can be useful for a variety of reasons, such as:

// *   **Filtering Content:** Only process pages in a specific language.
// *   **Translation:** Automatically translate content into the user's preferred language.
// *   **Improved Analysis:** Use language-specific NLP techniques for better analysis.
// *   **The Idea:** Use a language detection library to analyze the text content of the web page and identify the language it's written in.
// *   **Why it's SUPER:**
//     *   **Automatic Identification:** No need to manually specify the language of each page.
//     *   **Enables Language-Specific Processing:** Allows you to tailor your analysis and processing based on the detected language.
//     *   **Improved Accuracy:** Language detection libraries are typically very accurate.
// *   **The Code (Conceptual):**

//     ```typescript
//     import franc from 'franc';

//     async function fetchUrlToolExecute({ url }: { url: string }) {
//         // ...
//         const html = await res.text();
//         const mainText = extractMainText(html); // Function to extract the main content
//         const language = franc(mainText, { minLength: 3 }); // Detect the language

//         return {
//             // ...
//             language // Add the language code to the output
//         };
//     }
//     ```

//     *   **Note:** This example uses the `franc` library. You'll need to install it (`npm install franc`). The `minLength` option is used to ensure that the text is long enough for accurate detection.
// *   **Example:**

//     > Text: "This is an English sentence."
//     >
//     > Language Code: "eng"
//     >
//     > Text: "Esta es una frase en español."
//     >
//     > Language Code: "spa"

// By combining these three SUPER features, you can create a web scraping tool that is not only powerful but also intelligent and adaptable! 🚀 Let me know if you have any more questions.


export const fetchUrlTool = tool({
  description: // UPDATED description
    "Enterprise-grade: Deeply fetch and analyze a URL. Extracts product cards, prices, features, navigation, HTML tables, FAQs, news/blogs, and classifies site type. Supports multi-step reasoning and interactive data analysis on extracted tables. If the URL is an image, it will be previewed and an AI will analyze and describe its content. Returns structured data, reasoning steps, and rich summaries.",
  parameters: z.object({
    url: z.string().describe("The URL to fetch and analyze"), // Removed .url() for Gemini compatibility
    referer: z.string().optional().describe("The referring page, for multi-step navigation"),
    userIntent: z.string().optional().describe("The user's question or intent, for focused extraction, including data analysis requests like 'analyze the table'."),
  }),
  execute: async ({ url, referer, userIntent }) => {
    const start = Date.now();
    const steps = [];
    try {
      steps.push(`Step 1: Fetching ${url}`);
      const headers: HeadersInit = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      };
      if (referer) {
        headers['Referer'] = referer;
      }
      const res = await fetch(url, { method: 'GET', headers });
      const contentType = res.headers.get('content-type') || '';

      // --- Handle image types ---
      if (contentType.startsWith('image/')) {
        steps.push('Step 2: Detected image file. Previewing and initiating AI analysis.');
        const imageType = contentType.split('/')[1] || 'image';
        // Extract filename for more descriptive alt text if possible
        let imageName = 'image';
        try {
            imageName = new URL(url).pathname.split('/').pop() || 'image';
        } catch { /* ignore if URL parsing for name fails */ }

        const markdownPreview = `![Preview of ${imageName}](${url})`;
        let analysis = "Image analysis could not be performed at this time.";
        let analysisError = null;

        try {
          steps.push('Step 2a: Sending image to Gemini for analysis.');
          const geminiModel = google('gemini-2.0-flash'); // Use a capable Gemini vision model
          
          const analysisResult = await generateText({
            model: geminiModel,
            messages: [
              {
                role: 'user',
                content: [
                  { type: 'text', text: 'Describe this image in detail. What is depicted (objects, beings, scene)? What are the key visual elements (colors, composition, style)? If there are actions or a story, briefly describe it. Provide a comprehensive and objective description.' },
                  { type: 'image', image: new URL(url) }, // Pass URL object
                ],
              },
            ],
          });
          analysis = analysisResult.text;
          steps.push('Step 2b: Image analysis received from Gemini.');
        } catch (e: any) {
          steps.push(`Step 2b: Error during Gemini image analysis: ${e.message || String(e)}`);
          console.error(`fetchUrlTool: Gemini image analysis error for ${url}:`, e);
          analysisError = `AI analysis failed: ${e.message || String(e)}`;
          analysis = `AI-powered analysis of the image failed. Details: ${e.message || String(e)}`;
        }

        return {
          type: 'image_analyzed', // New type to signify AI analysis was attempted/done
          url,
          markdown: markdownPreview,
          analysis: analysis, 
          description: `The URL points to an image (${imageType.toUpperCase()}). Markdown Preview: ${markdownPreview}. AI-generated analysis: ${analysis}`,
          ...(analysisError && { analysisErrorDetail: analysisError }),
          steps,
          elapsed: Date.now() - start,
        };
      } else if (contentType.includes('application/pdf')) {
        steps.push('Step 2: Detected PDF document.');
        return {
          type: 'document', url, description: 'PDF document. Content analysis and table extraction are not supported by this tool for PDFs.', steps, elapsed: Date.now() - start
        };
      } else if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml') && !contentType.includes('application/xml')) {
        steps.push('Step 2: Detected non-HTML, non-image, non-PDF file. Attempting to extract plain text preview.');
        let textPreview = "Content is not plain text or could not be previewed.";
        if (contentType.startsWith('text/')) {
            try {
                const text = await res.text();
                textPreview = text.slice(0, 500) + (text.length > 500 ? '...' : '');
            } catch (e: any) {
                steps.push(`Step 2c: Error reading text content: ${e.message || String(e)}`);
                textPreview = "Error reading text content.";
            }
        }
        return {
          type: 'file', url, preview: textPreview, contentType, description: `File (${contentType}). Preview: ${textPreview}`, steps, elapsed: Date.now() - start
        };
      }

      // --- Process HTML ---
      steps.push('Step 2: Processing HTML content.');
      const html = await res.text();

      const metaDescription = (html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["'][^>]*>/i) || [])[1] || '';
      const ogTitle = (html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["'][^>]*>/i) || [])[1] || '';
      const ogDescription = (html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["'][^>]*>/i) || [])[1] || '';
      const headings = Array.from(html.matchAll(/<(h[1-3])[^>]*>(.*?)<\/\1>/gi)).map(m => ({ tag: m[1], text: m[2].replace(/<[^>]+>/g, '').trim() })).slice(0, 10);
      const navLinks = Array.from(html.matchAll(/<a[^>]+href=["']([^"'#?]+)["'][^>]*>(.*?)<\/a>/gi))
        .map(m => {
             try {
                 return { href: new URL(m[1], url).toString(), text: m[2].replace(/<[^>]+>/g, '').trim() };
             } catch { return null; }
         })
         .filter(l => l && l.text && l.href && l.href.length < 256 && l.href.startsWith('https'))
         .slice(0, 20);
      const productCards = Array.from(html.matchAll(/<div[^>]*class=["'][^"']*(product|card|item|listing)[^"']*["'][^>]*>([\s\S]*?)(<\/div>)/gi))
         .map(m => {
              const block = m[2];
              const name = (block.match(/<h[1-4][^>]*>(.*?)<\/h[1-4]>/i) || [])[1]?.replace(/<[^>]+>/g, '').trim() || '';
              const price = (block.match(/\$[0-9,.]+/) || [])[0] || '';
              const features = Array.from(block.matchAll(/<li[^>]*>(.*?)<\/li>/gi)).map(x => x[1].replace(/<[^>]+>/g, '').trim());
              const img = (block.match(/<img[^>]+src=["']([^"']+)["']/i) || [])[1] || '';
              return { name, price, features, img };
         }).filter(card => card.name || card.price || card.features.length > 0).slice(0, 10);
      const faqs = Array.from(html.matchAll(/<details[\s\S]*?<\/details>/gi)).map(f => f[0].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 200));
      const newsSections = Array.from(html.matchAll(/<(section|div)[^>]+(news|blog|update)[^>]*>[\s\S]*?<\/(section|div)>/gi)).map(s => s[0].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 400));

      steps.push('Step 3: Extracting table data.');
      const extractedTables = parseHtmlTables(html);
      let chartMarkdown: string | null = null;
      if (
        userIntent &&
        /chart|visualize|plot|bar chart|graph/i.test(userIntent) &&
        extractedTables.length > 0
      ) {
        let col: string | undefined;
        const match = userIntent.match(/(?:of|for)\s+([\w\s]+)/i);
        if (match && match[1]) {
          const guess = match[1].trim().toLowerCase();
          col = extractedTables[0].headers.find(h => h.toLowerCase().includes(guess));
        }
        if (!col && extractedTables[0].headers.length > 0) {
          for (const h of extractedTables[0].headers) {
            const vals = extractedTables[0].rows.map(r => r[h].replace(/[$,%]/g, '').replace(/,/g, ''));
            if (vals.some(v => !isNaN(parseFloat(v)))) {
              col = h;
              break;
            }
          }
        }
        if (col) {
          chartMarkdown = generateMarkdownBarChart(extractedTables[0], col);
        }
      }
      steps.push(`Step 4: Found ${extractedTables.length} potential table(s).`);

      const mainText = html
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<head[\s\S]*?<\/head>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
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
               .filter((l): l is { href: string; text: string } => !!l)
               .filter(l => {
                   const linkTextLower = l.text.toLowerCase();
                   return lowerIntent.split(' ').some(word => word.length > 3 && linkTextLower.includes(word)) || linkTextLower.includes(lowerIntent);
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
            .map(m => {
                 try {
                     const href = new URL(m[1], url).toString();
                     const text = m[2].replace(/<[^>]+>/g, '').trim();
                     const isArticle = /(\/article|\/news|\/blog|\/post|\/story|[\d-]+\.html?$)/i.test(href);
                     return (isArticle && text && href.startsWith('http')) ? { href, text } : null;
                 } catch { return null; }
            })
            .filter(Boolean).slice(0, 50) as { href: string; text: string }[];

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
        steps,
        elapsed: Date.now() - start
      };

    } catch (e: any) {
      steps.push(`Error: ${e.message || String(e)}`);
      console.error(`fetchUrlTool Error processing ${url}:`, e);
      return { error: `Failed to fetch or analyze the URL: ${e.message || String(e)}`, steps };
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
      const modelInstance = google('gemini-2.0-flash', { // User-provided model
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