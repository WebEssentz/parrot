"use client"

import { ChatHistoryItem } from "./ChatHistoryItem"
import { useParams, useRouter } from "next/navigation"
import { Loader2, History, RefreshCcw } from "lucide-react"
import { useChats, getRenamingState } from "@/hooks/use-chats"
import { useInView } from "react-intersection-observer"
import { useEffect } from "react"

export const ChatHistoryList = () => {
  const params = useParams()
  const router = useRouter()
  const {
    chats,
    isLoading,
    isError,
    revalidateChats,
    updateChatTitle,
    deleteChat,
    hasMore,
    isLoadingMore,
    setSize,
    size,
  } = useChats()
  const activeChatId = Array.isArray(params.id) ? params.id[0] : params.id

  const { ref, inView } = useInView({
    threshold: 0,
    triggerOnce: false,
  })

  useEffect(() => {
    if (inView && hasMore && !isLoadingMore && !getRenamingState()) {
      setSize(size + 1)
    }
  }, [inView, hasMore, isLoadingMore, setSize, size])

  const handleChatClick = (id: string) => {
    router.push(`/chat/${id}`)
  }

  const handleRetry = () => {
    if (!getRenamingState()) {
      revalidateChats()
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center mt-35 pr-[0.60rem] justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="p-4 mt-10 text-center text-sm">
        <p className="text-red-500">Failed to load chats.</p>
        <button
          onClick={handleRetry}
          disabled={getRenamingState()}
          className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-primary dark:hover:bg-zinc-800 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCcw className="w-3.5 h-3.5" />
          Retry
        </button>
      </div>
    )
  }

  if (!Array.isArray(chats) || chats.length === 0) {
    return (
      <div className="flex flex-col mt-10 mr-4 items-center justify-center h-full px-4 py-10 text-center">
        <History className="w-8 h-8 mb-3 text-zinc-400 dark:text-zinc-500" />
        <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">No Chats Yet</p>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Your conversations will appear here.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <div className="px-4 py-1 mb-1">
        <span className="text-sm font-semibold tracking-wide text-zinc-900/40 dark:text-zinc-600/90">Chats</span>
      </div>

      <div className="flex flex-col space-y-1 px-2">
        {Array.isArray(chats) &&
          chats
            .filter((chat) => chat && chat.id)
            .map((chat) => (
              <ChatHistoryItem
                key={chat.id}
                chat={chat}
                isActive={chat.id === activeChatId}
                onClick={() => handleChatClick(chat.id)}
                updateChatTitle={updateChatTitle}
                deleteChat={deleteChat}
              />
            ))}

        {hasMore && !getRenamingState() && <div ref={ref} className="h-1" />}

        {isLoadingMore && !getRenamingState() && (
          <div className="flex justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
          </div>
        )}
      </div>
    </div>
  )
}
