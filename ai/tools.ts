import { tool } from "ai";
import { z } from "zod";
import { google } from '@ai-sdk/google'; // Import the Google provider
import { generateText } from 'ai'; // Import generateText

// --- Simple Markdown Bar Chart Generator ---
// Generates a Markdown bar chart for a given column in a table
function generateMarkdownBarChart(
  table: { headers: string[]; rows: Record<string, string>[] },
  column: string,
  options?: { maxBars?: number; maxWidth?: number }
): string | null {
  const maxBars = options?.maxBars ?? 10;
  const maxWidth = options?.maxWidth ?? 30;
  if (!table.headers.includes(column)) return null;
  // Count or sum values by category if categorical, or plot numeric values
  // Try to parse as numbers
  const values = table.rows.map(row => {
    let val = row[column];
    if (!val) return null;
    // Remove $ , % etc.
    val = val.replace(/[$,%]/g, '').replace(/,/g, '');
    const num = parseFloat(val);
    return isNaN(num) ? null : num;
  }).filter(v => v !== null) as number[];
  if (values.length === 0) return null;
  // For bar chart, show top N values (sorted descending)
  const sorted = values.slice().sort((a, b) => b - a).slice(0, maxBars);
  const max = Math.max(...sorted);
  if (max === 0) return null;
  let chart = `\n\n**Bar Chart for '${column}'**\n\n`;
  sorted.forEach((v, i) => {
    const bar = '█'.repeat(Math.round((v / max) * maxWidth));
    chart += `${v.toLocaleString()} | ${bar}\n`;
  });
  return chart;
}

// Utility: Format a value as inline code (ChatGPT style)
export function formatInlineCode(value: string): string {
  // Escape backticks and wrap in single backticks
  return `\`${value.replace(/`/g, '\u0060')}\``;
}
// --- Helper Function for Basic Table Parsing (Simplified Regex Approach) ---
// WARNING: Regex for HTML is fragile. A proper parser is more robust.
// This handles simple tables without nested tables or complex structures.
function parseHtmlTables(html: string): { headers: string[], rows: Record<string, string>[] }[] {
    const tables = [];
    // Match table tags
    const tableRegex = /<table[\s\S]*?>(.*?)<\/table>/gi;
    let tableMatch;

    while ((tableMatch = tableRegex.exec(html)) !== null && tables.length < 5) { // Limit to 5 tables
        const tableHtml = tableMatch[1];
        let headers: string[] = [];
        const rows: string[][] = [];

        // Extract headers (th within thead or first tr)
        const headerRegex = /<th[^>]*>([\s\S]*?)<\/th>/gi;
        const firstRowHeaderRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/i; // Find first row
        const cellInHeaderRegex = /<(?:td|th)[^>]*>([\s\S]*?)<\/(?:td|th)>/gi; // Cells in first row

        let headerMatch;
        let foundHeaders = false;

        // Try finding explicit <th> tags first
        while ((headerMatch = headerRegex.exec(tableHtml)) !== null) {
            headers.push(headerMatch[1].replace(/<[^>]+>/g, '').trim());
            foundHeaders = true;
        }

        // If no <th>, try using the first row's <td>/<th> as headers
        if (!foundHeaders) {
            const firstRowMatch = firstRowHeaderRegex.exec(tableHtml);
            if (firstRowMatch) {
                let cellMatch;
                while ((cellMatch = cellInHeaderRegex.exec(firstRowMatch[1])) !== null) {
                    headers.push(cellMatch[1].replace(/<[^>]+>/g, '').trim());
                }
                foundHeaders = headers.length > 0; // Mark headers found if first row had cells
            }
        }


        // Extract rows (tr) and cells (td)
        const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
        const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
        let rowMatch;
        let rowsProcessed = 0;

        // Skip the first row if it was used for headers
        if (headers.length > 0 && !tableHtml.match(/<thead/i)){ // Simple check if first row likely was header row
             rowRegex.exec(tableHtml); // Consume first match
        }


        while ((rowMatch = rowRegex.exec(tableHtml)) !== null && rowsProcessed < 50) { // Limit rows per table
            const cells: string[] = [];
            let cellMatch;
             while ((cellMatch = cellRegex.exec(rowMatch[1])) !== null) {
                cells.push(cellMatch[1].replace(/<[^>]+>/g, '').trim());
            }
             // Only add row if it has the same number of cells as headers (or if no headers found)
             if (cells.length > 0 && (headers.length === 0 || cells.length === headers.length)) {
                rows.push(cells);
                rowsProcessed++;
            } else if (cells.length > 0 && headers.length > 0 && cells.length !== headers.length) {
                // Optional: Log inconsistent row length
                // console.log(`Skipping row with ${cells.length} cells, expected ${headers.length}`);
            }
        }

        if (headers.length > 0 && rows.length > 0) {
             // Convert to array of objects if headers exist
             const tableData = rows.map(row => {
                const rowObj: Record<string, string> = {};
                headers.forEach((header, index) => {
                    rowObj[header || `Column ${index + 1}`] = row[index] ?? ''; // Handle missing cells/headers
                });
                return rowObj;
             });
            tables.push({ headers, data: tableData }); // Return structured data
        } else if (rows.length > 0) {
             // Fallback if no headers found, return raw rows
             tables.push({ headers: [], data: rows });
        }
    }
    return tables.map(t => ({
        headers: t.headers,
        // Ensure data is always array of objects for consistency downstream, even if headers were missing
        rows: Array.isArray(t.data[0])
            ? (t.data as string[][]).map(row => Object.fromEntries(row.map((cell, i) => [`Column ${i + 1}`, cell])))
            : t.data as Record<string, string>[]
    }));
}
// --- End Helper Function ---


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
    "Enterprise-grade: Deeply fetch and analyze a URL. Extracts product cards, prices, features, navigation, HTML tables, FAQs, news/blogs, and classifies site type. Supports multi-step reasoning and interactive data analysis on extracted tables. Returns structured data, reasoning steps, and rich summaries.", // Updated description
  parameters: z.object({
    url: z.string().url().describe("The URL to fetch and analyze"),
    referer: z.string().optional().describe("The referring page, for multi-step navigation"),
    userIntent: z.string().optional().describe("The user's question or intent, for focused extraction, including data analysis requests like 'analyze the table'."), // Updated intent description
  }),
  execute: async ({ url, referer, userIntent }) => {
    const start = Date.now();
    const steps = [];
    try {
      steps.push(`Step 1: Fetching ${url}`);
      const res = await fetch(url, { method: 'GET', headers: referer ? { Referer: referer } : {} });
      const contentType = res.headers.get('content-type') || '';

      // --- Handle non-HTML types first ---
      if (contentType.startsWith('image/')) {
        steps.push('Step 2: Detected image file. Returning Markdown preview.');
        const imageType = contentType.split('/')[1] || 'image';
        return {
          type: 'image', url, markdown: `![Image preview](${url})`, description: `Here is the image (${imageType.toUpperCase()}) you provided:`, steps, elapsed: Date.now() - start
        };
      } else if (contentType.includes('application/pdf')) {
        steps.push('Step 2: Detected PDF document.');
        return {
          type: 'document', url, description: 'PDF document. Content analysis and table extraction are not supported.', steps, elapsed: Date.now() - start // Clarify no table extraction
        };
      } else if (!contentType.includes('text/html')) {
        const text = await res.text();
        steps.push('Step 2: Detected non-HTML file. Extracting plain text preview.');
        const preview = text.slice(0, 500) + (text.length > 500 ? '...' : '');
        return {
          type: 'file', url, preview, contentType, description: `File (${contentType}) preview: ${preview}`, steps, elapsed: Date.now() - start
        };
      }

      // --- Process HTML ---
      steps.push('Step 2: Processing HTML content.');
      const html = await res.text();

      // --- Extract Standard Elements (Meta, OG, Headings, Links, etc.) ---
      const metaDescription = (html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["'][^>]*>/i) || [])[1] || '';
      const ogTitle = (html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["'][^>]*>/i) || [])[1] || '';
      const ogDescription = (html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["'][^>]*>/i) || [])[1] || '';
      const headings = Array.from(html.matchAll(/<(h[1-3])[^>]*>(.*?)<\/\1>/gi)).map(m => ({ tag: m[1], text: m[2].replace(/<[^>]+>/g, '').trim() })).slice(0, 10);
      const navLinks = Array.from(html.matchAll(/<a[^>]+href=["']([^"'#?]+)["'][^>]*>(.*?)<\/a>/gi))
        .map(m => {
             try { // Resolve relative URLs safely
                 return { href: new URL(m[1], url).toString(), text: m[2].replace(/<[^>]+>/g, '').trim() };
             } catch { return null; } // Ignore invalid URLs
         })
         .filter(l => l && l.text && l.href && l.href.length < 256 && l.href.startsWith('https')) // Basic filter
         .slice(0, 20);
      const productCards = Array.from(html.matchAll(/<div[^>]*class=["'][^"']*(product|card|item|listing)[^"']*["'][^>]*>([\s\S]*?)(<\/div>)/gi))
         .map(m => {
             // ... (product card parsing remains the same) ...
              const block = m[2];
              const name = (block.match(/<h[1-4][^>]*>(.*?)<\/h[1-4]>/i) || [])[1]?.replace(/<[^>]+>/g, '').trim() || '';
              const price = (block.match(/\$[0-9,.]+/) || [])[0] || '';
              const features = Array.from(block.matchAll(/<li[^>]*>(.*?)<\/li>/gi)).map(x => x[1].replace(/<[^>]+>/g, '').trim());
              const img = (block.match(/<img[^>]+src=["']([^"']+)["']/i) || [])[1] || '';
              return { name, price, features, img };
         }).filter(card => card.name || card.price || card.features.length > 0).slice(0, 10);
      const faqs = Array.from(html.matchAll(/<details[\s\S]*?<\/details>/gi)).map(f => f[0].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 200));
      const newsSections = Array.from(html.matchAll(/<(section|div)[^>]+(news|blog|update)[^>]*>[\s\S]*?<\/(section|div)>/gi)).map(s => s[0].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 400));

      // --- NEW: Extract Table Data ---
      steps.push('Step 3: Extracting table data.');
      const extractedTables = parseHtmlTables(html);
    // --- NEW: Generate Markdown Chart if requested ---
    let chartMarkdown: string | null = null;
    if (
      userIntent &&
      /chart|visualize|plot|bar chart|graph/i.test(userIntent) &&
      extractedTables.length > 0
    ) {
      // Try to guess the column to chart: look for 'of <col>' or 'for <col>' in userIntent
      let col: string | undefined;
      const match = userIntent.match(/(?:of|for)\s+([\w\s]+)/i);
      if (match && match[1]) {
        // Try to find a header that matches
        const guess = match[1].trim().toLowerCase();
        col = extractedTables[0].headers.find(h => h.toLowerCase().includes(guess));
      }
      // Fallback: use the first numeric column
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

      // --- Extract Main Text & Determine Site Type ---
      const mainText = html // Remove scripts, styles, head for cleaner text
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<head[\s\S]*?<\/head>/gi, '')
        .replace(/<[^>]+>/g, ' ') // Remove remaining tags
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();
      let siteType = 'general';
      if (productCards.length > 2) siteType = 'e-commerce';
      else if (newsSections.length > 0 || /news|blog|article/i.test(html)) siteType = 'news/blog';
      else if (faqs.length > 0) siteType = 'docs/faq';
      else if (extractedTables.length > 0) siteType = 'data/table'; // Add new type

      // --- Reasoning & Suggested Links ---
      steps.push('Step 5: Analyzing content and intent.');
      let suggestedLinks: { href: string; text: string }[] = [];
       if (userIntent && !userIntent.toLowerCase().includes('analyze')) { // Don't suggest navigation if intent is analysis
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

      // Article links extraction (anchor tags with hrefs to articles)
      const articleLinks = Array.from(html.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi))
            .map(m => {
                 try { // Resolve relative URLs safely
                     const href = new URL(m[1], url).toString();
                     const text = m[2].replace(/<[^>]+>/g, '').trim();
                     const isArticle = /(\/article|\/news|\/blog|\/post|\/story|[\d-]+\.html?$)/i.test(href);
                     return (isArticle && text && href.startsWith('http')) ? { href, text } : null;
                 } catch { return null; } // Ignore invalid URLs
            })
            .filter(Boolean).slice(0, 50) as { href: string; text: string }[];

      // Compose summary
      const summary = [
        ogTitle || headings[0]?.text, // Start with title
        metaDescription || ogDescription,
        ...headings.slice(1, 3).map(h => h.text), // Add a couple more headings
        extractedTables.length > 0 ? `Contains ${extractedTables.length} data table(s).` : '', // Mention tables
        ...productCards.slice(0, 2).map(c => `${c.name} ${c.price}`), // Few products
        ...faqs.slice(0, 1),
        ...newsSections.slice(0, 1),
        mainText.slice(0, 500) // Limit main text in summary
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
        // NO LONGER RETURNING RAW HTML TABLES
        faqs,
        newsSections,
        extractedTables, // NEW: Return parsed table data
        chartMarkdown, // NEW: Markdown bar chart if requested
        summary,
        preview: mainText.slice(0, 1000) + (mainText.length > 1000 ? '...' : ''),
        suggestedLinks,
        articleLinks,
        steps,
        elapsed: Date.now() - start
      };

    } catch (e: any) {
      steps.push(`Error: ${e.message || e}`);
      console.error(`fetchUrlTool Error fetching ${url}:`, e);
      return { error: `Failed to fetch or analyze the URL: ${e.message || e}`, steps };
    }
  },
});


// --- Google Search Tool (No changes needed here) ---
export const googleSearchTool = tool({
  description: "Search the web using Google Search Grounding for up-to-date information, current events, or general knowledge questions.",
  parameters: z.object({
    query: z.string().describe("The search query to look up on the web"),
  }),
  execute: async ({ query }) => {
    console.log(`googleSearchTool: Executing search for query: "${query}"`);
    try {
      // Use a model that supports search grounding, like gemini-1.5-flash
      // Enable search grounding via model options
      const modelInstance = google('gemini-2.5-pro-exp-03-25', { // Switch back to stable model if needed
          useSearchGrounding: true,
      });

      const { text, sources, providerMetadata } = await generateText({
          model: modelInstance,
          prompt: query,
      });

      // Extract relevant metadata if needed (optional)
      // Types can be imported for better safety: import { GoogleGenerativeAIProviderMetadata } from '@ai-sdk/google';
      const metadata = providerMetadata?.google as any | undefined; // Cast for easier access, be mindful of potential undefined
      const webSearchQueries = metadata?.groundingMetadata?.webSearchQueries ?? [];
      // const safetyRatings = metadata?.safetyRatings ?? []; // Example of accessing safety ratings

      console.log(`googleSearchTool: Search successful for query: "${query}". Found ${sources?.length ?? 0} sources.`);

      // Return the grounded response and sources
      return {
          query,
          groundedResponse: text,
          sources: sources ?? [], // Ensure sources is always an array
          webSearchQueries, // Include the queries Google used
          // safetyRatings, // Optionally include safety ratings if useful downstream
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
// --- End of NEW Google Search Tool ---



// export const fetchUrlTool = tool({
//   description:
//     "Enterprise-grade: Deeply fetch and analyze a URL. Follows related links using a queue to gather more information. Extracts product cards, prices, features, navigation, tables, FAQs, news/blogs, and classifies site type. Returns structured data, steps, and summaries.",
//   parameters: z.object({
//     url: z.string().url().describe("The URL to fetch and analyze"),
//     referer: z.string().optional().describe("The referring page, for multi-step navigation"),
//     userIntent: z.string().optional().describe("The user's question or intent, for focused extraction"),
//     maxDepth: z.number().optional().default(2).describe("How deep to crawl (default 2)"),
//     maxPages: z.number().optional().default(5).describe("How many pages maximum to fetch (default 5)"),
//   }),
//   async execute({ url, referer, userIntent, maxDepth = 2, maxPages = 5 }) {
//     const start = Date.now();
//     const steps: string[] = [];
//     const visited = new Set<string>();
//     const queue: { url: string; depth: number }[] = [{ url, depth: 0 }];
//     const results: any[] = [];

//     async function fetchAndExtract(targetUrl: string, depth: number): Promise<any> {
//       try {
//         const res = await fetch(targetUrl, { method: 'GET', headers: referer ? { Referer: referer } : {} });
//         const contentType = res.headers.get('content-type') || '';

//         if (contentType.startsWith('image/') || contentType.includes('application/pdf')) {
//           return { url: targetUrl, type: 'file', note: 'Image or document skipped.' };
//         } else if (contentType.includes('text/html')) {
//           const html = await res.text();

//           const metaDescription = (html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["'][^>]*>/i) || [])[1] || '';
//           const ogTitle = (html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["'][^>]*>/i) || [])[1] || '';
//           const ogDescription = (html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["'][^>]*>/i) || [])[1] || '';

//           const headings = Array.from(html.matchAll(/<(h[1-3])[^>]*>(.*?)<\/\1>/gi)).map(m => ({ tag: m[1], text: m[2].replace(/<[^>]+>/g, '').trim() }));

//           const navLinks = Array.from(html.matchAll(/<a[^>]+href=["']([^"'#?]+)["'][^>]*>(.*?)<\/a>/gi))
//             .map(m => ({ href: m[1], text: m[2].replace(/<[^>]+>/g, '').trim() }))
//             .filter(l => l.text && l.href && l.href.length < 128);

//           const productCards = Array.from(html.matchAll(/<div[^>]*class=["'][^"']*(product|card|item|listing)[^"']*["'][^>]*>([\s\S]*?)(<\/div>)/gi))
//             .map(m => {
//               const block = m[2];
//               const name = (block.match(/<h[1-4][^>]*>(.*?)<\/h[1-4]>/i) || [])[1] || '';
//               const price = (block.match(/\$[0-9,.]+/) || [])[0] || '';
//               const features = Array.from(block.matchAll(/<li[^>]*>(.*?)<\/li>/gi)).map(x => x[1].replace(/<[^>]+>/g, '').trim());
//               const img = (block.match(/<img[^>]+src=["']([^"']+)["']/i) || [])[1] || '';
//               return { name, price, features, img };
//             }).filter(card => card.name || card.price || card.features.length > 0);

//           const mainText = html.replace(/<script[\s\S]*?<\/script>/gi, '')
//                                .replace(/<style[\s\S]*?<\/style>/gi, '')
//                                .replace(/<[^>]+>/g, ' ')
//                                .replace(/\s+/g, ' ')
//                                .trim();

//           let siteType = 'general';
//           if (productCards.length > 2) siteType = 'e-commerce';
//           else if (html.includes('news') || html.includes('blog')) siteType = 'news';

//           const summary = [metaDescription, ogTitle, ogDescription, ...headings.map(h => h.text), ...productCards.map(c => `${c.name} ${c.price}`)]
//             .filter(Boolean).join(' | ').slice(0, 1500);

//           // Discover new links based on userIntent
//           let newLinks: string[] = [];
//           if (userIntent) {
//             const lowerIntent = userIntent.toLowerCase();
//             newLinks = navLinks
//               .filter(l => l.text.toLowerCase().includes(lowerIntent) || lowerIntent.includes(l.text.toLowerCase()))
//               .map(l => new URL(l.href, targetUrl).href);
//           } else {
//             newLinks = navLinks.map(l => new URL(l.href, targetUrl).href);
//           }

//           return {
//             url: targetUrl,
//             siteType,
//             title: ogTitle || headings[0]?.text || targetUrl,
//             metaDescription,
//             ogTitle,
//             ogDescription,
//             headings,
//             navLinks,
//             productCards,
//             summary,
//             preview: mainText.slice(0, 1000) + (mainText.length > 1000 ? '...' : ''),
//             foundLinks: newLinks,
//             steps: [`Fetched ${targetUrl} (depth ${depth})`],
//           };
//         }
//         return { url: targetUrl, type: 'unknown', note: 'Non-HTML content skipped.' };
//       } catch (e) {
//         return { url: targetUrl, error: `Failed: ${e}` };
//       }
//     }

//     while (queue.length > 0 && results.length < maxPages) {
//       const { url: currentUrl, depth } = queue.shift()!;
//       if (visited.has(currentUrl) || depth > maxDepth) continue;
//       visited.add(currentUrl);

//       const result = await fetchAndExtract(currentUrl, depth);
//       results.push(result);
//       steps.push(...(result.steps || []));

//       if (result.foundLinks) {
//         for (const link of result.foundLinks) {
//           if (!visited.has(link) && queue.length + results.length < maxPages) {
//             queue.push({ url: link, depth: depth + 1 });
//           }
//         }
//       }
//     }

//     return {
//       initialUrl: url,
//       crawledPages: results.length,
//       results,
//       steps,
//       elapsed: Date.now() - start,
//     };
//   },
// });
