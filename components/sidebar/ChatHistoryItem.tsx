// FILE: components/ChatHistoryItem.tsx

"use client"

import type React from "react"
import { useRouter } from "next/navigation"
import { Trash2, Edit3, MoreHorizontal, Share, Archive } from "lucide-react"
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
import { DeleteChatModal } from "../ui/modals/delete-chat-modal"
import { ShareChatModal } from "../share/share-chat-modal"

interface Chat {
  id: string
  title: string
  isOptimistic?: boolean
  messages?: any[]
  user?: any
  visibility?: "private" | "public"
  isLiveSynced?: boolean
  updatedAt?: string
}

// --- BUG FIX 1: Make the typewriter hook more robust ---
const useTypewriter = (text: string, speed = 30) => {
  const [displayText, setDisplayText] = useState("")

  useEffect(() => {
    setDisplayText("")

    let i = 0
    const typingInterval = setInterval(() => {
      if (i < text.length) {
        setDisplayText(text.slice(0, i + 1))
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
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [title, setTitle] = useState(chat.title)
  const inputRef = useRef<HTMLInputElement>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [isFetchingForShare, setIsFetchingForShare] = useState(false)
  const [fullChatData, setFullChatData] = useState<Chat | null>(null)

  useEffect(() => {
    if (!isEditing) setTitle(chat.title)
  }, [chat.title, isEditing])

  // --- BUG FIX 2: Correctly manage the animation lifecycle ---
  const prevTitleRef = useRef<string | null>(null)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    const previousTitle = prevTitleRef.current
    const currentTitle = chat.title
    if (currentTitle !== previousTitle && previousTitle === "New Chat" && currentTitle !== "New Chat") {
      setIsAnimating(true)
    }
    prevTitleRef.current = currentTitle
  }, [chat.title])

  const typedTitle = useTypewriter(chat.title)

  useEffect(() => {
    if (isAnimating && typedTitle === chat.title) {
      setIsAnimating(false)
    }
  }, [isAnimating, typedTitle, chat.title])

  const finalTitle = isActive ? chat.title : isAnimating ? typedTitle : chat.title

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
      router.push("/")
      const response = await fetch(`/api/chats/${chat.id}`, { method: "DELETE" })
      if (!response.ok) {
        throw new Error("Failed to delete chat")
      }
      toast.success("Chat deleted successfully.")
      setShowDeleteModal(false)
    } catch (error) {
      toast.error("Failed to delete chat on the server.")
    } finally {
      setIsDeleting(false)
      setRenamingState(false)
    }
  }

  // --- ENHANCED: Function to handle Share click ---
  const handleShare = async () => {
    setIsFetchingForShare(true)
    const toastId = toast.loading("Loading chat details...")

    try {
      const response = await fetch(`/api/chats/${chat.id}`)
      if (!response.ok) throw new Error("Could not load chat.")

      const data: Chat = await response.json()
      setFullChatData(data) // Store the full data
      setShowShareModal(true) // Open the modal
      toast.dismiss(toastId)
      toast.success("Chat loaded successfully!")
    } catch (error) {
      toast.error("Failed to load chat for sharing.")
      toast.dismiss(toastId)
    } finally {
      setIsFetchingForShare(false)
    }
  }

  const handleArchive = () => {
    toast.info("Archive feature coming soon!")
  }

  // --- ENHANCED: Close modal handler ---
  const handleCloseShareModal = () => {
    setShowShareModal(false)
    setFullChatData(null) // Clear the data when closing
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
                className={clsx("absolute right-1 top-0 h-full flex items-center transition-opacity", {
                  "opacity-100": isActive,
                  "opacity-0 group-hover:opacity-100": !isActive,
                })}
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
                    align="start"
                    sideOffset={8}
                    className="w-36 bg-white dark:bg-[#282828] p-2 shadow-xl border border-zinc-200/80 dark:border-zinc-700/80 rounded-3xl"
                  >
                    <DropdownMenuItem
                      onSelect={handleShare}
                      disabled={isFetchingForShare}
                      className="flex items-center gap-3 cursor-pointer px-2 py-2 text-sm rounded-lg focus:bg-zinc-100 dark:focus:bg-zinc-700/50"
                    >
                      <Share size={15} className="text-zinc-500" />
                      <span>{isFetchingForShare ? "Loading..." : "Share"}</span>
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

      {/* ENHANCED: ShareChatModal with better data handling and event handling */}
      <AnimatePresence>
        {showShareModal && fullChatData && (
          <div onClick={(e) => e.stopPropagation()}>
            <ShareChatModal
              isOpen={showShareModal}
              onClose={handleCloseShareModal}
              chatId={fullChatData.id}
              chatTitle={fullChatData.title}
              chat={{
                messages: fullChatData.messages || [],
                user: fullChatData.user || { firstName: "Anonymous" },
                visibility: fullChatData.visibility || "private",
                isLiveSynced: fullChatData.isLiveSynced || false,
                updatedAt: fullChatData.updatedAt || new Date().toISOString(),
              }}
            />
          </div>
        )}
      </AnimatePresence>
    </TooltipProvider>
  )
}
