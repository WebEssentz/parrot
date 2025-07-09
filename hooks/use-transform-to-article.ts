"use-client"

import { useState, useCallback, useRef } from "react"
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

  // --- CHANGE 1: Add a ref to hold the AbortController for the current request ---
  const abortControllerRef = useRef<AbortController | null>(null)

  // --- CHANGE 2: The 'transform' function now handles cancellation ---
  const transform = useCallback(async (chatId: string) => {
    if (!chatId) {
      toast.error("Cannot transform: Chat ID is missing.")
      return
    }
    
    // Cancel any previous, ongoing transformation before starting a new one
    abortControllerRef.current?.abort()

    // Create a new controller for this specific request
    const controller = new AbortController()
    abortControllerRef.current = controller

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
        // Pass the AbortSignal to the fetch request
        signal: controller.signal,
      })

      console.log("📡 [ARTICLE HOOK] API Response status:", response.status)
      console.log("📡 [ARTICLE HOOK] API Response headers:", Object.fromEntries(response.headers.entries()))
      
      if (controller.signal.aborted) return // Check if cancelled before proceeding

      if (!response.ok) {
        const errorText = await response.text()
        console.error("❌ [ARTICLE HOOK] API Error:", errorText)
        throw new Error(`API returned ${response.status}: ${errorText}`)
      }
      
      // ... (The rest of your logic remains largely the same)

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

      // The for-await-of loop will automatically throw an AbortError if the stream is cancelled.
      for await (const textChunk of readDataStream(response.body)) {
          if (controller.signal.aborted) {
             console.log("🛑 [ARTICLE HOOK] Stream reading aborted.")
             break; // Exit the loop if cancelled.
          }
          if (textChunk && textChunk.length > 0) {
            chunkCount++
            totalContent += textChunk
            setArticle(totalContent)

            const now = Date.now()
            if (now - lastLogTime > 2000 || chunkCount % 20 === 0) {
              console.log(`📖 [ARTICLE HOOK] Progress: ${chunkCount} chunks, ${totalContent.length} chars`)
              lastLogTime = now
            }
          }
        }
      
      if (controller.signal.aborted) return; // Exit if cancelled after stream processing

      if (!totalContent || totalContent.trim().length === 0) {
        console.error("❌ [ARTICLE HOOK] No content received after processing stream")
        throw new Error("No article content was generated")
      }

      console.log("✅ [ARTICLE HOOK] Article stream completed!")

    } catch (e) {
      // --- This is the key change to gracefully handle cancellation ---
      // When fetch is aborted, it throws a DOMException with the name 'AbortError'.
      if (e instanceof DOMException && e.name === 'AbortError') {
        console.log("✅ [ARTICLE HOOK] Transformation successfully cancelled by user.")
        // Don't set an error or toast, this is an expected action.
        return;
      }
      
      const errorMessage = e instanceof Error ? e.message : "Unknown error occurred"
      console.error("❌ [ARTICLE HOOK] Article transformation failed:", errorMessage)
      setError(errorMessage)
      toast.error(`Article generation failed: ${errorMessage}`)
    } finally {
      // Only set loading to false if the request wasn't aborted by a *new* request.
      // This prevents a race condition.
      if (!controller.signal.aborted) {
        setIsLoading(false)
      }
    }
  }, [])

  // --- CHANGE 3: Expose a 'cancel' function to be called from the component ---
  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      console.log("🛑 [ARTICLE HOOK] Manually cancelling transformation.")
      abortControllerRef.current.abort()
      setIsLoading(false) // Immediately update UI to reflect cancellation
    }
  }, [])

  return {
    article,
    isLoading,
    error,
    transform,
    setArticle,
    artifact,
    cancel, // <-- Expose the new function
  }
}