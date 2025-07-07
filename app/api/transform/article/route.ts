import { google } from "@ai-sdk/google"
import { smoothStream, streamText } from "ai"
import { z } from "zod"

const articleRequestSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string(),
    }),
  ),
})

// Simplified but effective system prompt
const systemPrompt = `You are a professional technical writer. Transform this chat conversation into a comprehensive, well-structured technical article.

REQUIREMENTS:
- Write a compelling title using # (H1)
- Create an engaging introduction (2-3 paragraphs)
- Organize content with ## (H2) and ### (H3) headers
- Include all code examples with proper formatting
- Write in a single, professional voice (don't mention "user asked" or "AI said")
- End with a conclusion and key takeaways (TD;LR)
- Use proper Markdown formatting
- Aim for 800-1500 words

Write the article now:`

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const validated = articleRequestSchema.safeParse(body)
    if (!validated.success) {
      console.error("❌ [ARTICLE API] Validation failed:", validated.error.errors)
      return new Response(
        JSON.stringify({
          error: "Invalid request format",
          details: validated.error.errors,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      )
    }

    const { messages } = validated.data

    // Create a single prompt with the conversation
    const conversationText = messages.map((msg) => `${msg.role.toUpperCase()}: ${msg.content}`).join("\n\n")

    const result = await streamText({
      model: google("gemini-2.5-flash"),
      system: systemPrompt,
      prompt: `Here is the conversation to transform into an article:\n\n${conversationText}`,
      temperature: 0.3,
      experimental_transform: smoothStream({ delayInMs: 20, chunking: 'word' }),
      maxTokens: 4000,
    })

    return result.toDataStreamResponse({
      getErrorMessage: (error) => {
        console.error("❌ [ARTICLE API] Stream error:", error)
        return `Article generation failed: ${error instanceof Error ? error.message : "Unknown error"}`
      },
    })
  } catch (error) {
    console.error("❌ [ARTICLE API] Unexpected error:", error)
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    )
  }
}
