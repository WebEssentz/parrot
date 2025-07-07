"use client"

import type React from "react"

import { Trash2, Edit3, MoreHorizontal, Share, Archive } from "lucide-react" // Added Archive icon
import clsx from "clsx"
import { useEffect, useState, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { TooltipProvider } from "@/components/ui/tooltip"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import { setRenamingState } from "@/hooks/use-chats"
import { DeleteChatModal } from "./delete-chat-modal"

interface Chat {
  id: string
  title: string
  isOptimistic?: boolean
}

// NOTE: All hooks and logic functions (useTypewriter, handleRename, handleDelete, etc.) remain unchanged.
// The changes are purely stylistic in the JSX.
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

  useEffect(() => {
    if (!isEditing) setTitle(chat.title)
  }, [chat.title, isEditing])

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
    setRenamingState(true)
    try {
      updateChatTitle(chat.id, trimmedTitle, true)
      const response = await fetch(`/api/chats/${chat.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmedTitle }),
      })
      if (!response.ok) throw new Error("Failed to rename chat")
      updateChatTitle(chat.id, trimmedTitle, false)
    } catch (error) {
      toast.error("Failed to rename chat")
      updateChatTitle(chat.id, chat.title, false)
      setTitle(chat.title)
    } finally {
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
    setRenamingState(true)
    try {
      deleteChat(chat.id)
      const response = await fetch(`/api/chats/${chat.id}`, { method: "DELETE" })
      if (!response.ok) throw new Error("Failed to delete chat")
      setShowDeleteModal(false)
    } catch (error) {
      toast.error("Failed to delete chat")
    } finally {
      setIsDeleting(false)
      setRenamingState(false)
    }
  }

  const handleShare = () => {
    toast.info("Share feature coming soon!")
  }

  const handleArchive = () => {
    toast.info("Archive feature coming soon!")
  }

  return (
    <TooltipProvider>
      <div
        className={clsx(
          "group w-full h-10 flex items-center justify-start rounded-lg relative text-left text-sm truncate",
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
              <span className="flex-grow truncate px-3 pr-10">{finalTitle}</span>
              <div
                // --- THIS IS THE FIX ---
                // The menu is now visible if the item is active OR on hover.
                className={clsx(
                  "absolute right-1 top-0 h-full flex items-center transition-opacity",
                  {
                    "opacity-100": isActive,
                    "opacity-0 group-hover:opacity-100": !isActive,
                  },
                )}
                onClick={(e) => e.stopPropagation()}
              >
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="p-2 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-700/50 cursor-pointer"
                      aria-label="Chat options"
                    >
                      <MoreHorizontal size={16} />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    // FIX: Alignment is now 'start' to open towards the right.
                    align="start"
                    // FIX: Offset increased for better spacing.
                    sideOffset={8}
                    // FIX: Taller (p-2) and more rounded (rounded-2xl)
                    className="w-36 bg-white dark:bg-[#282828] p-2 shadow-xl border border-zinc-200/80 dark:border-zinc-700/80 rounded-3xl"
                  >
                    <DropdownMenuItem
                      onSelect={handleShare}
                      // FIX: Taller items (py-2) with more rounded hover state
                      className="flex items-center gap-3 cursor-pointer px-2 py-2 text-sm rounded-lg focus:bg-zinc-100 dark:focus:bg-zinc-700/50"
                    >
                      <Share size={15} className="text-zinc-500" />
                      <span>Share</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => setIsEditing(true)}
                      className="flex items-center gap-3 cursor-pointer px-2 py-2 text-sm rounded-lg focus:bg-zinc-100 dark:focus:bg-zinc-700/50"
                    >
                      <Edit3 size={15} className="text-zinc-500" />
                      <span>Rename</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-zinc-200/80 dark:bg-zinc-700/60 my-1 mx-1.5" />
                    <DropdownMenuItem
                      onSelect={handleArchive}
                      className="flex items-center gap-3 cursor-pointer px-2 py-2 text-sm rounded-lg focus:bg-zinc-100 dark:focus:bg-zinc-700/50"
                    >
                      <Archive size={15} className="text-zinc-500" />
                      <span>Archive</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => setShowDeleteModal(true)}
                      className="flex items-center gap-3 cursor-pointer px-2 py-2 text-sm rounded-lg text-red-600 dark:text-red-500 focus:bg-red-500/10 focus:text-red-600 dark:focus:text-red-500"
                    >
                      <Trash2 size={15} className="text-red-600 dark:text-red-500" />
                      <span>Delete</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
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