import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return NextResponse.json({ error: "Missing url" }, { status: 400 });
  try {
    const res = await fetch(url, { method: "GET" });
    const html = await res.text();
    // Try to find <link rel="icon" ...> or <link rel="shortcut icon" ...>
    const match = html.match(/<link[^>]+rel=["'](?:shortcut )?icon["'][^>]*>/i);
    if (match) {
      const hrefMatch = match[0].match(/href=["']([^"']+)["']/i);
      if (hrefMatch) {
        let faviconUrl = hrefMatch[1];
        // Handle relative URLs
        if (!faviconUrl.startsWith("http")) {
          const base = new URL(url);
          if (faviconUrl.startsWith("/")) faviconUrl = base.origin + faviconUrl;
          else faviconUrl = base.origin + "/" + faviconUrl;
        }
        return NextResponse.json({ faviconUrl });
      }
    }
    return NextResponse.json({ faviconUrl: null });
  } catch (e) {
    return NextResponse.json({ faviconUrl: null });
  }
}
