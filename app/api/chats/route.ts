// app/api/chats/route.ts

import { db } from '@/lib/db'; // Corrected path assuming db is in lib
import { chat } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm'; // Import desc for ordering
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server'; // <-- IMPORT THIS


// --- GET Endpoint ---
export async function GET(request: Request) {
  try {
    // --- THIS IS THE FIX ---
    // 1. Get the userId securely from the server-side authentication session.
    const { userId } = await auth();

    // 2. If there's no user, they are not authorized.
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // const body = await request.json();
    // const { userId } = body;


    // --- THIS IS THE PAGINATION LOGIC ---
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = (page - 1) * limit;

    // Fetch the requested "page" of chats
    const userChats = await db.select({
      id: chat.id,
      title: chat.title,
    })
      .from(chat)
      .where(eq(chat.userId, userId))
      .orderBy(desc(chat.updatedAt))
      .limit(limit)
      .offset(offset);
      
    // --- Determine if there's a next page ---
    // A simple way is to check if the number of returned chats is equal to the limit.
    // If it is, there might be more. If it's less, we're on the last page.
    const hasMore = userChats.length === limit;
    const nextPage = hasMore ? page + 1 : null;

    // Return the data in a structured way that the frontend can use
    return NextResponse.json({
      chats: userChats,
      nextPage: nextPage,
    });

  } catch (error) {
    console.error('Error fetching chats:', error);
    return NextResponse.json({ error: 'Failed to fetch chats' }, { status: 500 });
  }
}

// --- POST Endpoint ---
export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // --- FIX: Read the body from the request ---
    const body = await request.json();
    const { messages, title } = body;

    // Validate the data
    if (!messages || messages.length === 0 || !title) {
      return NextResponse.json({ error: 'Title and messages are required' }, { status: 400 });
    }

    // Create the chat with the provided title and messages
    const [newChat] = await db.insert(chat).values({
      userId: userId,
      title: title, // Use the title from the request
      messages: messages, // Use the messages from the request
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning({
      id: chat.id,
      title: chat.title,
    });

    return NextResponse.json(newChat, { status: 201 });
  } catch (error) {
    console.error('Error creating chat:', error);
    return NextResponse.json({ error: 'Failed to create chat' }, { status: 500 });
  }
}