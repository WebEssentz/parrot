"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Markdown } from "./markdown"

interface StreamingTextRendererProps {
  fullText: string
  wordSpeed?: number // Milliseconds per word/token
  asMarkdown?: boolean // If true, renders displayedText through Markdown component (can be slow)
  className?: string
  onComplete?: () => void // Callback when typing is complete for the current fullText
  animationStyle?: "typewriter" | "void" | "fade" // Animation style options
}

// Helper to split text into words and preserve spaces/newlines between them
const splitIntoWordsAndSeparators = (text: string): string[] => {
  if (!text) return []
  return text.match(/\S+|\s+/g) || [] // Matches sequences of non-whitespace (words) or whitespace (separators)
}

export const StreamingTextRenderer: React.FC<StreamingTextRendererProps> = ({
  fullText,
  wordSpeed = 20, // Reduced default speed to match smoothStream's default
  asMarkdown = false,
  className,
  onComplete,
  animationStyle = "void", // Default to typewriter effect
}) => {
  const [displayedText, setDisplayedText] = useState("")
  const allTargetWordsRef = useRef<string[]>([])
  const currentWordIndexRef = useRef(0)
  const animationFrameIdRef = useRef<number | null>(null)
  const lastUpdateTimeRef = useRef(0)

  useEffect(() => {
    const newTargetWords = splitIntoWordsAndSeparators(fullText)

    // --- Handle Resets or Drastic Changes in fullText ---
    if (fullText === "") {
      allTargetWordsRef.current = []
      currentWordIndexRef.current = 0
      setDisplayedText("")
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current)
        animationFrameIdRef.current = null
      }
      return // Early exit for empty fullText
    }

    // Check if a reset is needed (e.g., fullText became shorter or diverged significantly)
    // A simple way: if the current displayed text is not a prefix of the new fullText (considering word boundaries)
    const currentDisplayedWords =
      displayedText === "" ? [] : allTargetWordsRef.current.slice(0, currentWordIndexRef.current)

    let commonPrefixLength = 0
    while (
      commonPrefixLength < currentDisplayedWords.length &&
      commonPrefixLength < newTargetWords.length &&
      currentDisplayedWords[commonPrefixLength] === newTargetWords[commonPrefixLength]
    ) {
      commonPrefixLength++
    }

    // If the stream seems to have reset or current animation is significantly behind
    if (currentWordIndexRef.current > newTargetWords.length || currentWordIndexRef.current > commonPrefixLength) {
      currentWordIndexRef.current = commonPrefixLength // Reset to the common part
      setDisplayedText(newTargetWords.slice(0, commonPrefixLength).join(""))
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current)
        animationFrameIdRef.current = null // Allow animation to restart
      }
    }

    allTargetWordsRef.current = newTargetWords

    // --- Animation Logic ---
    const typeWord = (timestamp: number) => {
      // Check if animation should stop (all target words displayed)
      if (currentWordIndexRef.current >= allTargetWordsRef.current.length) {
        // Ensure final text is exactly fullText in case of trailing spaces not forming a "word"
        if (displayedText !== fullText) {
          setDisplayedText(fullText)
        }
        if (onComplete) onComplete()
        animationFrameIdRef.current = null
        return
      }

      if (timestamp - lastUpdateTimeRef.current >= wordSpeed) {
        currentWordIndexRef.current += 1
        const wordsToShow = allTargetWordsRef.current.slice(0, currentWordIndexRef.current)
        setDisplayedText(wordsToShow.join(""))
        lastUpdateTimeRef.current = timestamp
      }

      // Request next frame if there are still words to type
      if (currentWordIndexRef.current < allTargetWordsRef.current.length) {
        animationFrameIdRef.current = requestAnimationFrame(typeWord)
      } else {
        // Typing just completed in this frame, ensure final sync
        if (displayedText !== fullText) setDisplayedText(fullText)
        if (onComplete) onComplete()
        animationFrameIdRef.current = null
      }
    }

    // --- Start or Continue Animation ---
    // If there are more words to display than currently shown, and no animation is running
    if (currentWordIndexRef.current < allTargetWordsRef.current.length && !animationFrameIdRef.current) {
      lastUpdateTimeRef.current = performance.now() // Reset time for the new segment of animation
      animationFrameIdRef.current = requestAnimationFrame(typeWord)
    } else if (currentWordIndexRef.current >= allTargetWordsRef.current.length && displayedText !== fullText) {
      // If animation was "done" but fullText has a slight difference (e.g. final punctuation/space)
      setDisplayedText(fullText)
    }

    // Cleanup animation frame on unmount or before effect re-runs
    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current)
        animationFrameIdRef.current = null
      }
    }
  }, [fullText, wordSpeed, onComplete, displayedText]) // displayedText is in dependency array to help re-evaluate reset logic.

  const content = asMarkdown ? <Markdown>{displayedText}</Markdown> : displayedText

  // Apply different animation styles based on the prop
  const getAnimationClass = () => {
    switch (animationStyle) {
      case "void":
        return "void-text"
      case "fade":
        return "fade-text"
      case "typewriter":
      default:
        return ""
    }
  }

  return (
    <div
      className={`${className} ${getAnimationClass()}`}
      style={!asMarkdown ? { whiteSpace: "pre-wrap", wordBreak: "break-word" } : {}}
    >
      {content}
    </div>
  )
}
