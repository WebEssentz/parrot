import { db } from "@/lib/db"
import { chat } from "@/lib/db/schema"
import { auth } from "@clerk/nextjs/server"
import { eq, and } from "drizzle-orm"
import { NextResponse } from "next/server"

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

    return NextResponse.json(userChat, { status: 200 })
  } catch (error) {
    console.error(`Error fetching chat ${chatId}:`, error)
    return NextResponse.json({ error: "Failed to fetch chat" }, { status: 500 })
  }
}
