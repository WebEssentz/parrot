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
    "Fetch and analyze a URL. Handles images, documents, and websites. Returns a summary, preview, or description depending on the content type. For images, returns a Markdown image preview. For restricted/login pages, returns a clear message.",
  parameters: z.object({
    url: z.string().url().describe("The URL to fetch and analyze"),
  }),
  async execute({ url }) {
    try {
      const res = await fetch(url, { method: 'GET' });
      const contentType = res.headers.get('content-type') || '';
      if (contentType.startsWith('image/')) {
        // Return a Markdown image preview and a confident message
        return {
          type: 'image',
          url,
          markdown: `![Image preview](${url})`,
          description: `Here is the image you provided:`
        };
      } else if (contentType.includes('text/html')) {
        const html = await res.text();
        // Extract meta tags
        const metaDescription = (html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["'][^>]*>/i) || [])[1] || '';
        const ogTitle = (html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["'][^>]*>/i) || [])[1] || '';
        const ogDescription = (html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["'][^>]*>/i) || [])[1] || '';
        // Extract headings
        const headings = Array.from(html.matchAll(/<(h[1-3])[^>]*>(.*?)<\/\1>/gi)).map(m => ({ tag: m[1], text: m[2].replace(/<[^>]+>/g, '').trim() })).slice(0, 10);
        // Extract main text (remove scripts/styles)
        const mainText = html
          .replace(/<script[\s\S]*?<\/script>/gi, '')
          .replace(/<style[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ');
        // Detect login/restricted pages
        const isLogin = /login|sign in|sign-in|authentication|password/i.test(html);
        const titleMatch = html.match(/<title>(.*?)<\/title>/i);
        const title = titleMatch ? titleMatch[1] : ogTitle || url;
        // Compose summary
        const summary = [
          metaDescription,
          ogTitle,
          ogDescription,
          ...headings.map(h => h.text),
          mainText.slice(0, 1000)
        ].filter(Boolean).join(' | ').slice(0, 1200);
        if (isLogin) {
          return {
            type: 'website',
            url,
            title,
            restricted: true,
            message: 'This page requires authentication. Only public information is shown below.',
            metaDescription,
            ogTitle,
            ogDescription,
            headings,
            summary,
            preview: mainText.slice(0, 500) + (mainText.length > 500 ? '...' : ''),
          };
        }
        return {
          type: 'website',
          url,
          title,
          restricted: false,
          metaDescription,
          ogTitle,
          ogDescription,
          headings,
          summary,
          preview: mainText.slice(0, 1000) + (mainText.length > 1000 ? '...' : ''),
        };
      } else if (contentType.includes('application/pdf')) {
        return {
          type: 'document',
          url,
          description: 'PDF document. Download and view for details.',
        };
      } else {
        const text = await res.text();
        return {
          type: 'file',
          url,
          preview: text.slice(0, 500) + (text.length > 500 ? '...' : ''),
        };
      }
    } catch (e) {
      return { error: `Failed to fetch or analyze the URL: ${e}` };
    }
  },
});
