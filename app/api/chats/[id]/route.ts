// app/api/chats/[id]/route.ts

import { db } from '@/lib/db';
import { chat } from '@/lib/db/schema';
import { auth } from '@clerk/nextjs/server';
import { eq, and } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function PUT(
  request: Request,
  // Correct way to receive params in App Router route handlers
  { params }: { params: { id: string } }
) {
  const { userId } = await auth();

  // --- THE FIX ---
  // Await the context object to safely access its properties.
  const { id: chatId } = await params;

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { messages } = body;

    if (!messages) {
      return NextResponse.json({ error: 'Messages are missing' }, { status: 400 });
    }

    // Update the chat record where the ID matches AND it belongs to the current user
    const [updatedChat] = await db.update(chat)
      .set({
        messages: messages,
        updatedAt: new Date(), // Update the timestamp
      })
      .where(and(eq(chat.id, chatId), eq(chat.userId, userId)))
      .returning({
        id: chat.id,
      });

    if (!updatedChat) {
      return NextResponse.json({ error: 'Chat not found or access denied' }, { status: 404 });
    }

    return NextResponse.json(updatedChat, { status: 200 });

  } catch (error) {
    console.error(`Error updating chat ${chatId}:`, error);
    return NextResponse.json({ error: 'Failed to update chat' }, { status: 500 });
  }
}

export async function GET(
  request: Request,
  // The context object directly contains the params
  { params }: { params: { id: string } }
) {
  // --- THE FIX ---
  // Destructure the id directly from params. No awaiting of context is needed.
  const { id: chatId } = await params;
  
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!chatId) {
    return NextResponse.json({ error: 'Chat ID is missing' }, { status: 400 });
  }

  try {
    const [userChat] = await db
      .select()
      .from(chat)
      .where(and(eq(chat.id, chatId), eq(chat.userId, userId)));

    if (!userChat) {
      return NextResponse.json({ error: 'Chat not found or access denied' }, { status: 404 });
    }
    
    return NextResponse.json(userChat, { status: 200 });
  } catch (error) {
    console.error(`Error fetching chat ${chatId}:`, error);
    return NextResponse.json({ error: 'Failed to fetch chat' }, { status: 500 });
  }
}