import { useState } from 'react';

/**
 * useExtractSiteTitle - React hook to fetch and extract the <title> of a website from a given URL.
 * @returns [title, extractTitle]
 *   title: string | null - The extracted title or null if not fetched/failed
 *   extractTitle: (url: string) => Promise<void> - Call this with a URL to fetch and extract the title
 */
export function useExtractSiteTitle(): [string | null, (url: string) => Promise<void>] {
  const [title, setTitle] = useState<string | null>(null);

  async function extractTitle(url: string) {
    setTitle(null);
    try {
      // Always ensure the URL is absolute
      const fullUrl = url.match(/^https?:\/\//i) ? url : `https://${url}`;
      const res = await fetch(fullUrl, { method: 'GET' });
      const html = await res.text();
      const match = html.match(/<title>(.*?)<\/title>/i);
      setTitle(match ? match[1].trim() : '');
    } catch (e) {
      setTitle('');
    }
  }

  return [title, extractTitle];
}
