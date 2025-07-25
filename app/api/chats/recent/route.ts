// FILE: app/api/chats/recent/route.ts

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db'; // Your Drizzle client
import { chat } from '@/lib/db/schema'; // Your chat schema
import { eq, and, gt, desc } from 'drizzle-orm';

// This is a GET request handler for the Next.js App Router
export async function GET() {
  try {
    const { userId } = await auth();

    // 1. Check for authentication
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // 2. Define a time threshold (e.g., last 3 days)
    // This prevents suggesting a very old chat.
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    // 3. Perform the database query using Drizzle
    // Your schema indexes on `userId` and `updatedAt` will make this very fast.
    const recentChat = await db.query.chat.findFirst({
      columns: {
        id: true,
        title: true,
      },
      where: and(
        eq(chat.userId, userId),
        gt(chat.updatedAt, threeDaysAgo) // Only find chats updated in the last 3 days
      ),
      orderBy: [desc(chat.updatedAt)], // Order by most recently updated
    });
    
    // 4. Handle the result
    if (!recentChat) {
      // It's not an error if no chat is found, just return a 404.
      return new NextResponse('No recent chats found', { status: 404 });
    }

    // Success: return the chat data
    return NextResponse.json(recentChat);

  } catch (error) {
    console.error('[CHATS_RECENT_GET]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}