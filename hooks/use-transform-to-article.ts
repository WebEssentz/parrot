"use client"

import { useState, useCallback } from "react"
import { toast } from "sonner"
import { readDataStream } from "@/lib/read-data-stream"

interface ArticleArtifact {
  id: string
  slug: string
}

export const useTransformToArticle = () => {
  const [article, setArticle] = useState<string>("")
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [artifact, setArtifact] = useState<ArticleArtifact | null>(null)

  const transform = useCallback(async (chatId: string) => {
    if (!chatId) {
      toast.error("Cannot transform: Chat ID is missing.")
      return
    }

    console.log(`🚀 [ARTICLE HOOK] Starting transformation for chat: ${chatId}`)

    setIsLoading(true)
    setArticle("")
    setError(null)
    setArtifact(null)

    try {
      const response = await fetch("/api/articles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ chatId }),
      })

      console.log("📡 [ARTICLE HOOK] API Response status:", response.status)
      console.log("📡 [ARTICLE HOOK] API Response headers:", Object.fromEntries(response.headers.entries()))

      if (!response.ok) {
        const errorText = await response.text()
        console.error("❌ [ARTICLE HOOK] API Error:", errorText)
        throw new Error(`API returned ${response.status}: ${errorText}`)
      }

      const articleId = response.headers.get("X-Article-Id")
      const articleSlug = response.headers.get("X-Article-Temp-Slug")

      if (!articleId || !articleSlug) {
        throw new Error("API response is missing required article headers.")
      }

      setArtifact({ id: articleId, slug: articleSlug })
      console.log(`✅ [ARTICLE HOOK] Artifact created: ID=${articleId}, Slug=${articleSlug}`)

      if (!response.body) {
        throw new Error("No response body received from API")
      }

      console.log("📖 [ARTICLE HOOK] Starting to read stream for real-time preview...")

      let totalContent = ""
      let chunkCount = 0
      let lastLogTime = Date.now()

      try {
        for await (const textChunk of readDataStream(response.body)) {
          if (textChunk && textChunk.length > 0) {
            chunkCount++
            totalContent += textChunk
            setArticle(totalContent)

            // Log progress every 2 seconds or every 20 chunks
            const now = Date.now()
            if (now - lastLogTime > 2000 || chunkCount % 20 === 0) {
              console.log(`📖 [ARTICLE HOOK] Progress: ${chunkCount} chunks, ${totalContent.length} chars`)
              console.log(`📖 [ARTICLE HOOK] Latest chunk: "${textChunk.substring(0, 50)}..."`)
              lastLogTime = now
            }
          }
        }
      } catch (streamError) {
        console.error("❌ [ARTICLE HOOK] Stream reading error:", streamError)
        throw new Error(`Failed to read response stream: ${streamError}`)
      }

      if (!totalContent || totalContent.trim().length === 0) {
        console.error("❌ [ARTICLE HOOK] No content received after processing stream")
        throw new Error("No article content was generated")
      }

      console.log("✅ [ARTICLE HOOK] Article stream completed!")
      console.log(`📊 [ARTICLE HOOK] Final stats: ${chunkCount} chunks, ${totalContent.length} characters`)

      // After stream completes, get the updated article info using the article ID
      try {
        const updatedResponse = await fetch(`/api/articles/${articleId}`)
        if (updatedResponse.ok) {
          const updatedArticle = await updatedResponse.json()
          setArtifact({
            id: updatedArticle.id,
            slug: updatedArticle.slug,
          })
          console.log(`🔄 [ARTICLE HOOK] Updated artifact with final slug: ${updatedArticle.slug}`)
        }
      } catch (error) {
        console.warn("Could not fetch updated article info:", error)
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Unknown error occurred"
      console.error("❌ [ARTICLE HOOK] Article transformation failed:", errorMessage)
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
    artifact,
  }
}