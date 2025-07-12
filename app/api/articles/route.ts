// FILE: app/api/articles/route.ts

import { db } from "@/lib/db"
import { article as articleTable, chat as chatTable } from "@/lib/db/schema"
import { auth } from "@clerk/nextjs/server"
import { and, eq } from "drizzle-orm"
import { google } from "@ai-sdk/google"
import { streamText } from "ai"
import { z } from "zod"

// Zod Schema updated to use chatId for security and efficiency
const createArticleRequestSchema = z.object({
  chatId: z.string().uuid("Invalid Chat ID format."),
})

// System prompt for professional article generation
const systemPrompt = `You are Avurna, a professional technical writer. Transform this chat conversation into a comprehensive, well-structured technical article.

REQUIREMENTS:
- Write a compelling title using # (H1)
- Create an engaging introductory hook (2-3 paragraphs)
- Organize content with ## (H2) and ### (H3) headers
- Include all code examples with proper formatting
- Write in a single, professional voice (don't mention "user asked" or "AI said")
- End with a conclusion and key takeaways
- Use proper Markdown formatting
- Aim for 800-1500 words

Write the article now:`

export async function POST(req: Request) {
  console.log(`\n🚀 [ARTICLES API] Request received at ${new Date().toISOString()}`)

  try {
    const { userId } = await auth()
    if (!userId) {
      console.error("❌ [ARTICLES API] Unauthorized request")
      return new Response("Unauthorized", { status: 401 })
    }

    const body = await req.json()
    console.log("📥 [ARTICLES API] Body parsed:", { chatId: body.chatId })

    const validated = createArticleRequestSchema.safeParse(body)
    if (!validated.success) {
      console.error("❌ [ARTICLES API] Validation failed:", validated.error.flatten())
      return new Response(JSON.stringify({ error: validated.error.flatten() }), { status: 400 })
    }

    const { chatId } = validated.data

    // 1. CREATE FIRST: Create a placeholder draft article immediately
    const tempSlug = `draft-${Date.now()}`
    console.log("📝 [ARTICLES API] Creating draft article with slug:", tempSlug)

    const [newArticle] = await db
      .insert(articleTable)
      .values({
        authorId: userId,
        sourceChatId: chatId,
        title: "Generating Article...",
        slug: tempSlug,
        content_md: "Please wait while your article is being generated...",
        status: "draft",
      })
      .returning({ id: articleTable.id, slug: articleTable.slug })

    if (!newArticle) {
      throw new Error("Failed to create initial article draft in the database.")
    }

    console.log("✅ [ARTICLES API] Draft article created:", newArticle)

    // 2. SECURELY FETCH CHAT after creating the draft
    const chatToTransform = await db.query.chat.findFirst({
      where: and(eq(chatTable.id, chatId), eq(chatTable.userId, userId)),
      columns: { messages: true },
    })

    if (!chatToTransform) {
      console.error("❌ [ARTICLES API] Chat not found, cleaning up draft")
      // Clean up the draft we just created if chat is not found
      await db.delete(articleTable).where(eq(articleTable.id, newArticle.id))
      return new Response("Chat not found or you do not have permission to access it.", { status: 404 })
    }

    console.log("📋 [ARTICLES API] Chat found, processing messages...")

    const conversationText = (chatToTransform.messages as any[])
      .map((msg: { role: string; content: string }) => `${msg.role.toUpperCase()}: ${msg.content}`)
      .join("\n\n")

    console.log("🤖 [ARTICLES API] Calling AI model...")

    // 3. INITIATE STREAM
    const result = await streamText({
      model: google("gemini-2.0-flash-exp"),
      system: systemPrompt,
      prompt: `Here is the conversation to transform into an article:\n\n${conversationText}`,
      temperature: 0.6,
      maxTokens: 4096,
      onFinish: async ({ text }) => {
        console.log("🎯 [ARTICLES API] Stream finished, updating article...")
        // 4. ON FINISH, UPDATE THE DRAFT
        const titleMatch = text.match(/^#\s*(.*)/)
        const title = titleMatch ? titleMatch[1] : "Untitled Article"
        const finalSlug =
          title
            .toLowerCase()
            .replace(/\s+/g, "-")
            .replace(/[^\w-]+/g, "") || `article-${newArticle.id}`

        await db
          .update(articleTable)
          .set({
            title: title,
            slug: finalSlug,
            content_md: text,
          })
          .where(eq(articleTable.id, newArticle.id))


        // WIP: Add a delete function to find any article with
        // 1. temporary slug
        // 2. temporary id
        // 3. Generic title and content (The ones we gave by default)
        console.log(`✅ [ARTICLES API] Updated article ${newArticle.id} with final slug: ${finalSlug}`)
      },
    })

    console.log("📡 [ARTICLES API] Streaming response to client...")

    // 5. RETURN STREAM WITH HEADERS
    return result.toDataStreamResponse({
      headers: {
        "X-Article-Id": newArticle.id,
        "X-Article-Temp-Slug": tempSlug,
      },
      getErrorMessage: (error) => {
        console.error("❌ [ARTICLES API] Stream error:", error)
        return `Article generation failed: ${error instanceof Error ? error.message : "Unknown error"}`
      },
    })
  } catch (error) {
    console.error("❌ [ARTICLES API] Unexpected error:", error)
    return new Response("Internal Server Error", { status: 500 })
  }
}
