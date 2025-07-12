// FILE: app/api/resolve-redirect/batch/route.ts

import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { urls } = await req.json();
  if (!Array.isArray(urls)) {
    return NextResponse.json({ error: "Missing urls array" }, { status: 400 });
  }

  // Helper to resolve a single URL
  async function resolveOne(url: string): Promise<{ original: string; resolved: string }> {
    try {
      // Prevent infinite loop: do not allow requests to this API itself
      const apiHost = req.headers.get("host") || "";
      if (url.includes("/api/resolve-redirect") && url.includes(apiHost)) {
        return { original: url, resolved: url };
      }
      let response = await fetch(url, { method: "HEAD", redirect: "follow" });
      if (!response.ok || response.url === url) {
        response = await fetch(url, { method: "GET", redirect: "follow" });
      }
      return { original: url, resolved: response.url };
    } catch {
      return { original: url, resolved: url };
    }
  }

  // Run all in parallel
  const results = await Promise.all(urls.map(resolveOne));
  // Return as a map for easy lookup
  const resolvedMap = Object.fromEntries(results.map(r => [r.original, r.resolved]));
  return NextResponse.json({ resolved: resolvedMap });
}
