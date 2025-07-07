"use client"

import { useState, useCallback } from "react"
import type { Message } from "ai"
import { toast } from "sonner"
import { readDataStream } from "@/lib/read-data-stream"

export const useTransformToArticle = () => {
  const [article, setArticle] = useState<string>("")
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const transform = useCallback(async (messages: Message[]) => {
    console.log("🚀 [ARTICLE HOOK] Starting transformation...")
    console.log("📝 Messages to transform:", messages.length)

    setIsLoading(true)
    setArticle("")
    setError(null)

    try {
      // Prepare and validate messages
      const validMessages = messages
        .filter((msg) => {
          const hasContent = msg.content && typeof msg.content === "string" && msg.content.trim().length > 0
          if (!hasContent) {
            console.warn("Filtering out invalid message:", msg)
          }
          return hasContent
        })
        .map((msg) => ({
          role: msg.role,
          content: typeof msg.content === "string" ? msg.content.trim() : String(msg.content).trim(),
        }))

      console.log("✅ Valid messages:", validMessages.length)

      if (validMessages.length === 0) {
        throw new Error("No valid messages found to transform into an article")
      }

      // Log first few messages for debugging
      console.log("📋 Sample messages:", validMessages.slice(0, 2))

      const response = await fetch("/api/transform/article", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messages: validMessages }),
      })

      console.log("📡 API Response status:", response.status)
      console.log("📡 API Response headers:", Object.fromEntries(response.headers.entries()))

      if (!response.ok) {
        const errorText = await response.text()
        console.error("❌ API Error:", errorText)
        throw new Error(`API returned ${response.status}: ${errorText}`)
      }

      if (!response.body) {
        throw new Error("No response body received from API")
      }

      console.log("📖 Starting to read stream...")

      let totalContent = ""
      let chunkCount = 0
      let lastLogTime = Date.now()

      try {
        for await (const textChunk of readDataStream(response.body)) {
          if (textChunk && textChunk.length > 0) {
            chunkCount++
            totalContent += textChunk

            // Update state with each chunk for real-time display
            setArticle(totalContent)

            // Log progress every 2 seconds or every 20 chunks
            const now = Date.now()
            if (now - lastLogTime > 2000 || chunkCount % 20 === 0) {
              console.log(`📖 Progress: ${chunkCount} chunks, ${totalContent.length} chars`)
              console.log(`📖 Latest chunk: "${textChunk.substring(0, 50)}..."`)
              lastLogTime = now
            }
          }
        }
      } catch (streamError) {
        console.error("❌ Stream reading error:", streamError)
        throw new Error(`Failed to read response stream: ${streamError}`)
      }

      if (!totalContent || totalContent.trim().length === 0) {
        console.error("❌ No content received after processing stream")
        throw new Error("No article content was generated")
      }

      console.log("✅ Article generation completed!")
      console.log(`📊 Final stats: ${chunkCount} chunks, ${totalContent.length} characters`)
      console.log(`📄 Article preview: "${totalContent.substring(0, 200)}..."`)
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Unknown error occurred"
      console.error("❌ Article transformation failed:", errorMessage)
      setError(errorMessage)
      toast.error(`Article generation failed: ${errorMessage}`)
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    article,
    isLoading,
    error,
    transform,
    setArticle,
  }
}
