// FILE: app/api/extract-description/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
import { google } from '@ai-sdk/google';

// Use the Google gemma-3n-e4b-it model to extract a key snippet from the article
async function extractKeyDescription(url: string): Promise<string> {
  try {
    let urlToFetch = url;
    if (url.includes('vertexaisearch.cloud.google.com/grounding-api-redirect/')) {
      let base = '';
      if (process.env.NEXT_PUBLIC_BASE_URL) {
        base = process.env.NEXT_PUBLIC_BASE_URL;
      } else if (process.env.VERCEL_URL) {
        base = `https://${process.env.VERCEL_URL}`;
      } else {
        base = 'http://localhost:3000';
      }
      // Prevent infinite loop: do not allow requests to this API itself
      if (url.startsWith(base + '/api/resolve-redirect')) {
        console.warn('[extractKeyDescription] Recursive call detected:', url);
        return '';
      }
      const res = await fetch(`${base}/api/resolve-redirect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.resolvedUrl) {
          urlToFetch = data.resolvedUrl;
        } else {
          console.warn('[extractKeyDescription] No resolvedUrl from redirect:', url);
          return '';
        }
      } else {
        console.warn('[extractKeyDescription] Failed to resolve redirect:', url);
        return '';
      }
    }
    // 1. Fetch the page content (simple fetch, no headless browser)
    const resp = await fetch(urlToFetch, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!resp.ok) {
      console.warn('[extractKeyDescription] Fetch failed:', urlToFetch, resp.status);
      return '';
    }
    const html = await resp.text();
    // 2. Extract main text content (very basic, can be improved)
    const mainText = html.replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!mainText || mainText.length < 100) {
      console.warn('[extractKeyDescription] Main text too short or empty:', urlToFetch, 'HTML length:', html.length);
      return '';
    }
    // 3. Call the Google model API (assume you have a function for this)
    const prompt = `Extract a short, enticing key snippet from the following article that would make a user want to click and read more. Do not summarize, but pick a compelling sentence or phrase.\n\nArticle:\n${mainText.slice(0, 4000)}\n\nKey snippet (return ONLY the snippet, no extra text):`;
    const snippet = await callGemmaModel(prompt);
    if (!snippet.trim()) {
      console.warn('[extractKeyDescription] Model returned empty snippet for:', urlToFetch);
    }
    return snippet.trim().replace(/^"|"$/g, '');
  } catch (err) {
    console.error('[extractKeyDescription] Error:', err);
    return '';
  }
}


async function callGemmaModel(prompt: string): Promise<string> {
  try {
    const model = google('gemma-3n-e4b-it');
    const { text } = await generateText({ model, prompt, temperature: 0.2, maxTokens: 80 });
    return text.trim();
  } catch (err) {
    console.error('[callGemmaModel] Error:', err);
    return '';
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get('url');
  if (!url) return new Response(JSON.stringify({ description: '' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  const description = await extractKeyDescription(url);
  return new Response(JSON.stringify({ description }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}