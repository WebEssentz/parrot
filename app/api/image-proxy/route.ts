// src/app/api/image-proxy/route.ts

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const imageUrl = searchParams.get('url');

    if (!imageUrl) {
      return new NextResponse('URL parameter is missing', { status: 400 });
    }

    // Validate the URL to prevent abuse
    const validUrl = new URL(imageUrl);
    if (!['http:', 'https:'].includes(validUrl.protocol)) {
       return new NextResponse('Invalid URL protocol', { status: 400 });
    }

    // Fetch the image from the external source
    const response = await fetch(validUrl.toString(), {
      headers: {
        // Mimic a browser to avoid some simple blocks
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });

    if (!response.ok) {
      return new NextResponse('Failed to fetch the image', { status: response.status });
    }

    const imageBuffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'application/octet-stream';

    // Return the image data with the correct content type
    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable', // Cache aggressively
      },
    });

  } catch (error) {
    console.error('[IMAGE PROXY] Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}