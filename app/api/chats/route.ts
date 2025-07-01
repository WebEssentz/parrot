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

    // Fetch chats and order them by creation date, newest first
    const userChats = await db.select({
      id: chat.id,
      title: chat.title,
    })
    .from(chat)
    .where(eq(chat.userId, userId))
    .orderBy(desc(chat.updatedAt)); // Order by newest

    return NextResponse.json(userChats, { status: 200 });
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

    // const body = await request.json();
    // const { messages, userId, title } = body;

    // if (!messages || messages.length === 0) {
    //   return NextResponse.json({ error: 'No messages to save' }, { status: 400 });
    // }
    
    const [newChat] = await db.insert(chat).values({
      userId: userId,
      title: "New Chat", // A default title, AI can rename it later
      messages: [], // Start with an empty message array
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning({
      id: chat.id,
      title: chat.title,
    });

    return NextResponse.json(newChat, { status: 201 });
  } catch (error) {
    console.error('Error saving chat:', error);
    return NextResponse.json({ error: 'Failed to save chat' }, { status: 500 });
  }
}