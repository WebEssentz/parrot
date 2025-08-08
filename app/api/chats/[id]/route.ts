// FILE: app/api/chats/[id]/route.ts

import { db } from "@/lib/db"
import { chat, attachment } from "@/lib/db/schema"
import { auth } from "@clerk/nextjs/server"
import { eq, and } from "drizzle-orm"
import { NextResponse } from "next/server"
import z from "zod"

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const { userId } = await auth()
  const { id: chatId } = params

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { messages, title } = body

    if (!messages && !title) {
      return NextResponse.json({ error: "No data provided for update" }, { status: 400 })
    }

    const updateData: { updatedAt: Date; messages?: any; title?: string } = {
      updatedAt: new Date(),
    }

    if (messages) {
      updateData.messages = messages
    }

    if (title) {
      updateData.title = title
    }

    const [updatedChat] = await db
      .update(chat)
      .set(updateData)
      .where(and(eq(chat.id, chatId), eq(chat.userId, userId)))
      .returning({
        id: chat.id,
        title: chat.title,
      })

    if (!updatedChat) {
      return NextResponse.json({ error: "Chat not found or access denied" }, { status: 404 })
    }

    return NextResponse.json(updatedChat, { status: 200 })
  } catch (error) {
    console.error(`Error updating chat ${chatId}:`, error)
    return NextResponse.json({ error: "Failed to update chat" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const { userId } = await auth()
  const { id: chatId } = params

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!chatId) {
    return NextResponse.json({ error: "Chat ID is missing" }, { status: 400 })
  }

  try {
    // First check if the chat exists and belongs to the user
    const [existingChat] = await db
      .select({ id: chat.id, title: chat.title })
      .from(chat)
      .where(and(eq(chat.id, chatId), eq(chat.userId, userId)))

    if (!existingChat) {
      return NextResponse.json({ error: "Chat not found or access denied" }, { status: 404 })
    }

    // Delete the chat
    const [deletedChat] = await db
      .delete(chat)
      .where(and(eq(chat.id, chatId), eq(chat.userId, userId)))
      .returning({
        id: chat.id,
        title: chat.title,
      })

    if (!deletedChat) {
      return NextResponse.json({ error: "Failed to delete chat" }, { status: 500 })
    }

    return NextResponse.json({ message: "Chat deleted successfully", chat: deletedChat }, { status: 200 })
  } catch (error) {
    console.error(`Error deleting chat ${chatId}:`, error)
    return NextResponse.json({ error: "Failed to delete chat" }, { status: 500 })
  }
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const { id: chatId } = await params
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!chatId) {
    return NextResponse.json({ error: "Chat ID is missing" }, { status: 400 })
  }

  try {
    const [userChat] = await db
      .select()
      .from(chat)
      .where(and(eq(chat.id, chatId), eq(chat.userId, userId)))

    if (!userChat) {
      return NextResponse.json({ error: "Chat not found or access denied" }, { status: 404 })
    }

    // --- NEW: Fetch all attachments associated with this chat ---
    const chatAttachments = await db
      .select()
      .from(attachment)
      .where(eq(attachment.chatId, chatId))

    // --- MODIFIED: Return the chat data PLUS the attachments ---
    return NextResponse.json({ ...userChat, attachments: chatAttachments }, { status: 200 })

  } catch (error) {
    console.error(`Error fetching chat ${chatId}:`, error)
    return NextResponse.json({ error: "Failed to fetch chat" }, { status: 500 })
  }
}

// We are adding a new PATCH handler.

// Define a Zod schema for validating the incoming request body.
// This ensures that only the fields we want to be updatable can be changed,
// and that they have the correct data types.
const patchChatSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  visibility: z.enum(['public', 'private']).optional(),
  isLiveSynced: z.boolean().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Security: Authenticate the user.
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Get the chat ID from the URL.
    const chatId = params.id;

    // 2. Validation: Parse and validate the request body.
    const body = await request.json();
    const validatedBody = patchChatSchema.safeParse(body);

    if (!validatedBody.success) {
      return new NextResponse('Invalid request body', { status: 400 });
    }

    // 3. Authorization & Update: Perform the database update.
    // The `and(eq(chat.id, chatId), eq(chat.userId, userId))` clause is the
    // critical security check. It ensures a user can ONLY update their own chats.
    const updatedChats = await db
      .update(chat)
      .set({
        ...validatedBody.data,
        updatedAt: new Date(), // Always update the `updatedAt` timestamp
      })
      .where(and(eq(chat.id, chatId), eq(chat.userId, userId)))
      .returning({
        id: chat.id,
        title: chat.title,
        visibility: chat.visibility,
        isLiveSynced: chat.isLiveSynced,
      });

    // 4. Handle Not Found / Forbidden cases.
    // If the array is empty, it means either the chat didn't exist OR
    // the user didn't have permission to update it. We return a 404
    // to avoid leaking information about which chats exist.
    if (updatedChats.length === 0) {
      return new NextResponse('Chat not found or you do not have permission to edit it', { status: 404 });
    }

    // 5. Success: Return the updated chat data.
    return NextResponse.json(updatedChats[0]);

  } catch (error) {
    console.error('[CHAT_PATCH_ERROR]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}