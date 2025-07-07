// FILE: app/api/public/share/[id]/route.ts

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { chat } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';

// This is a public route, so we do NOT use auth() here.

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const chatId = params.id;

    // 1. Validate the Chat ID format (optional but good practice)
    // A simple regex to check if it looks like a UUID.
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(chatId)) {
        return new NextResponse('Invalid Chat ID format', { status: 400 });
    }

    // 2. The Core Security Logic: The Database Query
    // We query for a chat that has BOTH the matching ID AND its visibility set to 'public'.
    // This is the single point of truth for whether a chat is shareable.
    const publicChat = await db.query.chat.findFirst({
      where: and(
        eq(chat.id, chatId), 
        eq(chat.visibility, 'public')
      ),
      // 3. Select only the necessary columns for the public page.
      // We explicitly avoid returning sensitive data like `userId`.
      columns: {
        id: true,
        title: true,
        messages: true,
        updatedAt: true,
        // We can also return isLiveSynced if the public page needs to know
        // whether to offer a "refresh" button or similar functionality.
        isLiveSynced: true, 
      },
      // We can also fetch related user data if we want to show the author's name.
      // This is safe because we are only doing it for chats that are already public.
      with: {
        user: {
          columns: {
            username: true,
            profilePic: true,
          }
        }
      }
    });

    // 4. Handle Not Found cases
    // If no chat is found (either because the ID is wrong or it's private),
    // we return a 404. This is crucial for privacy.
    if (!publicChat) {
      return new NextResponse('Chat not found or is private', { status: 404 });
    }

    // 5. Success: Return the public chat data.
    return NextResponse.json(publicChat);

  } catch (error) {
    // This could catch database connection errors, etc.
    console.error('[PUBLIC_CHAT_GET_ERROR]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}