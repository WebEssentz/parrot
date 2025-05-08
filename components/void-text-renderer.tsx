"use client"

import type React from "react"
import { useEffect, useState, useRef } from "react"
import { Markdown } from "./markdown"

interface VoidTextRendererProps {
  text: string
  asMarkdown?: boolean
  className?: string
  onComplete?: () => void
  wordDelay?: number // Delay between words in ms
}

export const VoidTextRenderer: React.FC<VoidTextRendererProps> = ({
  text,
  asMarkdown = false,
  className = "",
  onComplete,
  wordDelay = 100,
}) => {
  const [words, setWords] = useState<string[]>([])
  const [renderedWords, setRenderedWords] = useState<string[]>([])
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Split text into words on component mount or when text changes
  useEffect(() => {
    if (!text) {
      setWords([])
      setRenderedWords([])
      return
    }

    // Split by words and spaces
    const splitWords = text.match(/\S+|\s+/g) || []
    setWords(splitWords)
    setRenderedWords([])
  }, [text])

  // Animate words appearing one by one
  useEffect(() => {
    if (words.length === 0 || renderedWords.length >= words.length) {
      if (renderedWords.length === words.length && words.length > 0 && onComplete) {
        onComplete()
      }
      return
    }

    timeoutRef.current = setTimeout(() => {
      setRenderedWords((prev) => [...prev, words[prev.length]])
    }, wordDelay)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [words, renderedWords, wordDelay, onComplete])

  // Render the content
  const content = renderedWords.map((word, index) => (
    <span key={index} className="void-word">
      {word}
    </span>
  ))

  if (asMarkdown) {
    return (
      <div className={`void-text ${className}`}>
        <Markdown>{renderedWords.join("")}</Markdown>
      </div>
    )
  }

  return (
    <div className={`void-text ${className}`} style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
      {content}
    </div>
  )
}
