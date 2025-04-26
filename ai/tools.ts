import { tool } from "ai";
import { z } from "zod";

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
    "Enterprise-grade: Deeply fetch and analyze a URL. Extracts product cards, prices, features, navigation, tables, FAQs, news/blogs, and classifies site type. Supports multi-step reasoning by suggesting next links to follow if info is not found. Returns structured data, reasoning steps, and rich summaries for the AI to synthesize and present.",
  parameters: z.object({
    url: z.string().url().describe("The URL to fetch and analyze"),
    referer: z.string().optional().describe("The referring page, for multi-step navigation"),
    userIntent: z.string().optional().describe("The user's question or intent, for focused extraction"),
  }),
  async execute({ url, referer, userIntent }) {
    const start = Date.now();
    const steps = [];
    try {
      steps.push(`Step 1: Fetching ${url}`);
      const res = await fetch(url, { method: 'GET', headers: referer ? { Referer: referer } : {} });
      const contentType = res.headers.get('content-type') || '';
      if (contentType.startsWith('image/')) {
        steps.push('Step 2: Detected image file. Returning Markdown preview.');
        return {
          type: 'image', url, markdown: `![Image preview](${url})`, description: `Here is the image you provided:`, steps, elapsed: Date.now() - start
        };
      } else if (contentType.includes('text/html')) {
        const html = await res.text();
        // Meta & OG
        const metaDescription = (html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["'][^>]*>/i) || [])[1] || '';
        const ogTitle = (html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["'][^>]*>/i) || [])[1] || '';
        const ogDescription = (html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["'][^>]*>/i) || [])[1] || '';
        // Headings
        const headings = Array.from(html.matchAll(/<(h[1-3])[^>]*>(.*?)<\/\1>/gi)).map(m => ({ tag: m[1], text: m[2].replace(/<[^>]+>/g, '').trim() })).slice(0, 10);
        // Navigation links
        const navLinks = Array.from(html.matchAll(/<a[^>]+href=["']([^"'#?]+)["'][^>]*>(.*?)<\/a>/gi))
          .map(m => ({ href: m[1], text: m[2].replace(/<[^>]+>/g, '').trim() }))
          .filter(l => l.text && l.href && l.href.length < 128)
          .slice(0, 20);
        // Product cards (very basic: look for cards with price or product keywords)
        const productCards = Array.from(html.matchAll(/<div[^>]*class=["'][^"']*(product|card|item|listing)[^"']*["'][^>]*>([\s\S]*?)(<\/div>)/gi))
          .map(m => {
            const block = m[2];
            const name = (block.match(/<h[1-4][^>]*>(.*?)<\/h[1-4]>/i) || [])[1] || '';
            const price = (block.match(/\$[0-9,.]+/) || [])[0] || '';
            const features = Array.from(block.matchAll(/<li[^>]*>(.*?)<\/li>/gi)).map(x => x[1].replace(/<[^>]+>/g, '').trim());
            const img = (block.match(/<img[^>]+src=["']([^"']+)["']/i) || [])[1] || '';
            return { name, price, features, img };
          }).filter(card => card.name || card.price || card.features.length > 0);
        // Tables
        const tables = Array.from(html.matchAll(/<table[\s\S]*?<\/table>/gi)).map(t => t[0].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 300));
        // FAQs
        const faqs = Array.from(html.matchAll(/<details[\s\S]*?<\/details>/gi)).map(f => f[0].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 200));
        // News/blogs
        const newsSections = Array.from(html.matchAll(/<(section|div)[^>]+(news|blog|update)[^>]*>[\s\S]*?<\/(section|div)>/gi)).map(s => s[0].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 400));
        // Main text
        const mainText = html
          .replace(/<script[\s\S]*?<\/script>/gi, '')
          .replace(/<style[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ');
        // Site type
        let siteType = 'general';
        if (productCards.length > 2) siteType = 'e-commerce';
        else if (newsSections.length > 0) siteType = 'news';
        else if (faqs.length > 0) siteType = 'docs/faq';
        // Reasoning steps
        steps.push('Step 2: Extracted meta, headings, navigation, products, tables, FAQs, news/blogs.');
        // Multi-step: suggest next links if user intent matches a product or section
        let suggestedLinks: { href: string; text: string }[] = [];
        if (userIntent) {
          const lowerIntent = userIntent.toLowerCase();
          suggestedLinks = navLinks.filter(l => lowerIntent.includes(l.text.toLowerCase()) || l.text.toLowerCase().includes(lowerIntent.split(' ')[0]));
          if (suggestedLinks.length > 0) {
            steps.push(`Step 3: Info not found on homepage. Suggesting navigation to: ${suggestedLinks.map(l => l.text).join(', ')}`);
          }
        }
        // Article links extraction (anchor tags with hrefs to articles)
        const articleLinks = Array.from(html.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi))
          .map(m => {
            const href = m[1];
            const text = m[2].replace(/<[^>]+>/g, '').trim();
            // Heuristic: likely an article if href contains '/article', '/news', '/story', or ends with .html/.htm
            const isArticle = /\/article|\/news|\/story|\.html?$/.test(href);
            return isArticle ? { href, text } : null;
          })
          .filter(Boolean)
          .slice(0, 50) as { href: string; text: string }[];
        // Compose summary
        const summary = [
          metaDescription,
          ogTitle,
          ogDescription,
          ...headings.map(h => h.text),
          ...productCards.map(c => `${c.name} ${c.price}`),
          ...tables,
          ...faqs,
          ...newsSections,
          mainText.slice(0, 1000)
        ].filter(Boolean).join(' | ').slice(0, 1500);
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
          tables,
          faqs,
          newsSections,
          summary,
          preview: mainText.slice(0, 1000) + (mainText.length > 1000 ? '...' : ''),
          suggestedLinks,
          articleLinks,
          steps,
          elapsed: Date.now() - start
        };
      } else if (contentType.includes('application/pdf')) {
        steps.push('Step 2: Detected PDF document.');
        return {
          type: 'document', url, description: 'PDF document. Download and view for details.', steps, elapsed: Date.now() - start
        };
      } else {
        const text = await res.text();
        steps.push('Step 2: Fallback to plain text extraction.');
        return {
          type: 'file', url, preview: text.slice(0, 500) + (text.length > 500 ? '...' : ''), steps, elapsed: Date.now() - start
        };
      }
    } catch (e) {
      steps.push(`Error: ${e}`);
      return { error: `Failed to fetch or analyze the URL: ${e}`, steps };
    }
  },
});


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
