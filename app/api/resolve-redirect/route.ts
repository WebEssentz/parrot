import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { url } = await req.json();
  if (!url) return NextResponse.json({ error: "Missing url" }, { status: 400 });

  // Prevent infinite loop: do not allow requests to this API itself
  try {
    const apiHost = req.headers.get("host") || "";
    if (url.includes("/api/resolve-redirect") && url.includes(apiHost)) {
      return NextResponse.json({ error: "Recursive call detected" }, { status: 400 });
    }

    // Use HEAD to follow redirects, fallback to GET if HEAD fails
    let response = await fetch(url, { method: "HEAD", redirect: "follow" });
    if (!response.ok || response.url === url) {
      response = await fetch(url, { method: "GET", redirect: "follow" });
    }
    return NextResponse.json({ resolvedUrl: response.url });
  } catch (e) {
    return NextResponse.json({ error: "Failed to resolve" }, { status: 500 });
  }
}
