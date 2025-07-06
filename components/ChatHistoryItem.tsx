"use client"

import type React from "react"

import { Trash2, Edit3 } from "lucide-react"
import clsx from "clsx"
import { useEffect, useState, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { toast } from "sonner"
import { setRenamingState } from "@/hooks/use-chats"
import { DeleteChatModal } from "./delete-chat-modal"

interface Chat {
  id: string
  title: string
  isOptimistic?: boolean
}

const useTypewriter = (text: string, speed = 30) => {
  const [displayText, setDisplayText] = useState("")

  useEffect(() => {
    let i = 0
    setDisplayText("")
    const typingInterval = setInterval(() => {
      if (i < text.length) {
        setDisplayText((prev) => prev + text.charAt(i))
        i++
      } else {
        clearInterval(typingInterval)
      }
    }, speed)

    return () => clearInterval(typingInterval)
  }, [text, speed])

  return displayText
}

interface ChatHistoryItemProps {
  chat: Chat
  isActive: boolean
  onClick: () => void
  updateChatTitle: (chatId: string, newTitle: string, isOptimistic?: boolean) => void
  deleteChat: (chatId: string) => void
}

export const ChatHistoryItem = ({ chat, isActive, onClick, updateChatTitle, deleteChat }: ChatHistoryItemProps) => {
  const [isEditing, setIsEditing] = useState(false)
  const [title, setTitle] = useState(chat.title)
  const inputRef = useRef<HTMLInputElement>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Sync local title state with chat prop
  useEffect(() => {
    if (!isEditing) {
      setTitle(chat.title)
    }
  }, [chat.title, isEditing])

  // Typewriter logic
  const prevTitleRef = useRef<string | null>(null)
  const [shouldAnimate, setShouldAnimate] = useState(false)

  useEffect(() => {
    const previousTitle = prevTitleRef.current
    const currentTitle = chat.title

    if (currentTitle !== previousTitle && previousTitle === "New Chat" && currentTitle !== "New Chat") {
      setShouldAnimate(true)
    } else {
      setShouldAnimate(false)
    }

    prevTitleRef.current = currentTitle
  }, [chat.title])

  const typedTitle = useTypewriter(chat.title)
  const finalTitle = isActive ? chat.title : shouldAnimate ? typedTitle : chat.title

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [isEditing])

  const handleRename = async () => {
    const trimmedTitle = title.trim()
    setIsEditing(false)

    if (!trimmedTitle || trimmedTitle === chat.title) {
      setTitle(chat.title)
      return
    }

    // Set global renaming state
    setRenamingState(true)

    try {
      // 1. IMMEDIATE OPTIMISTIC UPDATE
      updateChatTitle(chat.id, trimmedTitle, true)

      // 2. BACKGROUND DATABASE UPDATE
      const response = await fetch(`/api/chats/${chat.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmedTitle }),
      })

      if (!response.ok) {
        throw new Error("Failed to rename chat")
      }

      // 3. SUCCESS - Update with final data (remove optimistic flag)
      updateChatTitle(chat.id, trimmedTitle, false)

      console.log("Rename successful:", trimmedTitle)
    } catch (error) {
      console.error("Rename failed:", error)
      toast.error("Failed to rename chat")

      // Rollback to original title
      updateChatTitle(chat.id, chat.title, false)
      setTitle(chat.title)
    } finally {
      // Always clear the renaming state
      setRenamingState(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleRename()
    } else if (e.key === "Escape") {
      setTitle(chat.title)
      setIsEditing(false)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    setRenamingState(true) // Prevent other operations during delete

    try {
      // 1. OPTIMISTIC DELETE - Remove from UI immediately
      deleteChat(chat.id)

      // 2. BACKGROUND DATABASE DELETE
      const response = await fetch(`/api/chats/${chat.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete chat")
      }

      console.log("Delete successful:", chat.title)
      setShowDeleteModal(false)
    } catch (error) {
      console.error("Delete failed:", error)
      toast.error("Failed to delete chat")

      // On error, we would need to restore the chat, but since we're doing optimistic delete,
      // we should revalidate the entire list to restore the correct state
      // This is a trade-off for the better UX of immediate removal
    } finally {
      setIsDeleting(false)
      setRenamingState(false)
    }
  }

  return (
    <TooltipProvider>
      <div
        className={clsx(
          "group w-full h-10 flex items-center justify-start rounded-lg relative",
          "text-left text-sm truncate",
          {
            "bg-zinc-200/80 dark:bg-zinc-700/20 text-zinc-900 dark:text-zinc-100 font-medium": isActive && !isEditing,
            "text-zinc-600 hover:text-primary dark:text-zinc-300/70 hover:bg-zinc-200/70 dark:hover:bg-zinc-700/30":
              !isActive && !isEditing,
            "ring-1 ring-inset ring-blue-500/50 bg-transparent": isEditing,
          },
        )}
      >
        <AnimatePresence initial={false} mode="wait">
          {isEditing ? (
            <motion.div
              key="editing-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="w-full h-full"
              onClick={(e) => e.stopPropagation()}
            >
              <input
                ref={inputRef}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={handleRename}
                className="w-full h-full px-3 bg-transparent outline-none text-zinc-900 dark:text-zinc-100"
                placeholder="Enter chat title..."
              />
            </motion.div>
          ) : (
            <motion.button
              key="normal-view"
              onClick={onClick}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="w-full h-full flex items-center text-left cursor-pointer"
            >
              <span className="flex-grow truncate px-3 pr-12">{finalTitle}</span>
              <div
                className={clsx(
                  "absolute right-0 top-0 h-full flex items-center pr-2",
                  "bg-gradient-to-l from-10% pl-6",
                  {
                    "from-zinc-200/80 dark:from-zinc-800/80": isActive,
                    "from-transparent group-hover:from-zinc-200/70 dark:from-transparent dark:group-hover:from-zinc-800/70":
                      !isActive,
                  },
                  "opacity-0 group-hover:opacity-100 transition-opacity duration-200",
                )}
              >
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => setIsEditing(true)}
                        className="p-1 rounded cursor-pointer hover:text-zinc-900 dark:hover:text-white transition-colors"
                        aria-label="Rename chat"
                      >
                        <Edit3 size={14} />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top">Rename</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => setShowDeleteModal(true)}
                        className="p-1 rounded cursor-pointer hover:text-red-500 transition-colors"
                        aria-label="Delete chat"
                      >
                        <Trash2 size={14} />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top">Delete</TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </motion.button>
          )}
        </AnimatePresence>
      </div>
      <DeleteChatModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        chatTitle={chat.title}
        isDeleting={isDeleting}
      />
    </TooltipProvider>
  )
}
