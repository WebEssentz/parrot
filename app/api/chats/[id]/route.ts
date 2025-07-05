5.  // app/api/chats/[id]/route.ts

import { db } from '@/lib/db';
import { chat } from '@/lib/db/schema';
import { auth } from '@clerk/nextjs/server';
import { eq, and } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { userId } = await auth();
  const { id: chatId } = params;

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    // --- FIX: Destructure both possible fields ---
    const { messages, title } = body;

    // A request must have at least one field to update
    if (!messages && !title) {
        return NextResponse.json({ error: 'No data provided for update' }, { status: 400 });
    }

    const updateData: { updatedAt: Date; messages?: any; title?: string } = {
        updatedAt: new Date(),
    };

    if (messages) {
        updateData.messages = messages;
    }
    if (title) {
        updateData.title = title;
    }

    const [updatedChat] = await db.update(chat)
      .set(updateData)
      .where(and(eq(chat.id, chatId), eq(chat.userId, userId)))
      .returning({
        id: chat.id,
        title: chat.title,
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
