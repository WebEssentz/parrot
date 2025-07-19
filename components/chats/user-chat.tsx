"use client"

import React from "react"
import { getDefaultModel } from "@/ai/providers"
import { type Message as TMessage, useChat } from "@ai-sdk/react"
import { useEffect, useRef, useState } from "react"
import { Share, MoreHorizontal, Pin, Edit3, Archive, Download, Trash2 } from "lucide-react"
import { useUser } from "@clerk/nextjs"
import { Messages } from "../messages"
import { toast } from "sonner"
import { useLiveSuggestedPrompts } from "@/hooks/use-suggested-prompts"
import { UserChatHeader } from "../ui/infobar/user-chat-header"
import { ChatScrollAnchor } from "../chat-scroll-anchor"
import { useSidebar } from "@/lib/sidebar-context"
import { motion, AnimatePresence } from "framer-motion"
import { ScrollToBottomButton } from "../scroll-to-bottom-button"
import { ChatInputArea } from "../chat-input-area"
import { DeleteChatModal } from "../ui/modals/delete-chat-modal"
import { RenameChatModal } from "../ui/modals/rename-chat-modal"
import { useChats } from "@/hooks/use-chats"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu"
import { useRouter } from "next/navigation"
import { ShareChatModal } from "../share/share-chat-modal"

function GreetingBanner() {
  const { user, isLoaded } = useUser()
  let displayName = "User"

  if (isLoaded && user) {
    displayName = user.firstName || user.username || "User"
  }

  const hour = new Date().getHours()
  let greeting = "Good evening"
  if (hour < 12) greeting = "Good morning"
  else if (hour < 18) greeting = "Good afternoon"

  return (
    <div className="w-full flex flex-col items-center">
      <div className="text-2xl sm:text-3xl font-semibold text-zinc-800 dark:text-zinc-200 text-center select-none">
        {greeting},{' '}
        <span className="bg-gradient-to-r from-[#3B82F6] to-[#06B6D4] dark:from-[#F59E0B] dark:to-[#EF4444] bg-clip-text text-transparent font-bold">
          {displayName}
        </span>
      </div>
    </div>
  )
}

function useReconnectToClerk() {
  const [offlineState, setOfflineState] = useState<"online" | "reconnecting" | "offline">("online")
  const [hasShownReconnect, setHasShownReconnect] = useState(false)

  useEffect(() => {
    const handleOnline = () => {
      setOfflineState("online")
      toast.dismiss("reconnect")
      setHasShownReconnect(false)
    }
    const handleOffline = () => {
      setOfflineState("reconnecting")
      if (!hasShownReconnect) {
        toast.loading("Connection lost. Attempting to reconnect...", { id: "reconnect", duration: 999999 })
        setHasShownReconnect(true)
      }
    }
    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)
    if (!navigator.onLine) handleOffline()
    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
      toast.dismiss("reconnect")
    }
  }, [hasShownReconnect])
  return offlineState
}

export default function UserChat({ initialChat }: { initialChat?: any }) {
  const router = useRouter()
  const offlineState = useReconnectToClerk()
  const containerRef = useRef<HTMLDivElement>(null)
  const endRef = useRef<HTMLDivElement>(null) as React.RefObject<HTMLDivElement>
  const { user, isLoaded, isSignedIn } = useUser()
  const [selectedModel, setSelectedModel] = useState<string>(() => getDefaultModel(!!isSignedIn))
  
  const [isTabletOrLarger, setIsTabletOrLarger] = useState<boolean>(false)

  const [isSubmittingSearch, setIsSubmittingSearch] = useState(false)
  const dynamicSuggestedPrompts = useLiveSuggestedPrompts()
  const { isDesktopSidebarCollapsed } = useSidebar()
  const [chatId, setChatId] = useState<string | null>(initialChat?.id ?? null)
  const [dbUser, setDbUser] = useState<any>(null)
  const [chatTitle, setChatTitle] = useState(initialChat?.title || "New Chat")
  const { mutateChats, updateChatTitle, deleteChat } = useChats()
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false)
  const prevStatusRef = useRef<string | null>(null)
  const [predictivePrompts, setPredictivePrompts] = useState<string[]>([])
  const [isPredicting, setIsPredicting] = useState(false)
  const [isPredictiveVisible, setIsPredictiveVisible] = useState(true)
  const [showScrollButton, setShowScrollButton] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showRenameModal, setShowRenameModal] = useState(false)
  const [isRenaming, setIsRenaming] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [isFetchingForShare, setIsFetchingForShare] = useState(false)
  const [fullChatDataForShare, setFullChatDataForShare] = useState<any>(null)

  const MAX_COMPLETION_INPUT_LENGTH = 90
  const userInfo = isLoaded && user ? {
    firstName: user.firstName || user.username || "",
    email: user.emailAddresses?.[0]?.emailAddress || user.primaryEmailAddress?.emailAddress || "",
  } : undefined

  useEffect(() => {
    const syncUser = async () => {
      if (isSignedIn) {
        try {
          const response = await fetch("/api/user", { method: "POST" })
          if (!response.ok) throw new Error("Failed to sync user")
          const userData = await response.json()
          setDbUser(userData)
        } catch (error) {
          console.error("User sync error:", error)
          toast.error("There was an issue loading your profile.")
        }
      }
    }
    syncUser()
  }, [isSignedIn])

  useEffect(() => {
    setSelectedModel(getDefaultModel(!!isSignedIn))
  }, [isSignedIn])

  const generateAndSyncTitle = async (currentChatId: string, firstMessageContent: string) => {
    setIsGeneratingTitle(true)
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generateTitle", messages: [{ role: "user", content: firstMessageContent }] }),
      })
      if (!response.ok) throw new Error("Title generation failed")
      const data = await response.json()
      if (data.title) {
        document.title = data.title
        setChatTitle(data.title)
        updateChatTitle(currentChatId, data.title)
        await fetch(`/api/chats/${currentChatId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: data.title }),
        })
      }
    } catch (error) {
      console.error("Error generating and syncing title:", error)
    } finally {
      setIsGeneratingTitle(false)
    }
  }

  const { messages, input, handleInputChange, setInput, status, setMessages, stop, append } = useChat({
    api: "/api/chat",
    maxSteps: 5,
    body: { selectedModel, user: dbUser ? { ...dbUser } : undefined },
    initialMessages: initialChat?.messages || [],
    id: chatId ?? undefined,
    onError: (error) => {
      toast.error(error.message || "An error occurred.", { position: "top-center", richColors: true })
      setSelectedModel(getDefaultModel(!!isSignedIn))
      setIsSubmittingSearch(false)
    },
  })

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!dbUser?.id) {
      toast.error("User profile not loaded yet, please wait!")
      return
    }
    const trimmedInput = input.trim()
    if (!trimmedInput) return
    if (!chatId) {
      const userMessage: TMessage = { id: crypto.randomUUID(), role: "user", content: trimmedInput }
      const tempTitle = trimmedInput.substring(0, 50)
      try {
        const response = await fetch("/api/chats", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: [userMessage], userId: dbUser.id, title: tempTitle }),
        })
        if (!response.ok) throw new Error("Failed to create chat in database.")
        const newChat = await response.json()
        const newPersistentId = newChat.id
        setChatId(newPersistentId)
        setChatTitle(tempTitle)
        document.title = tempTitle
        window.history.replaceState({}, "", `/chat/${newPersistentId}`)
        mutateChats((currentPagesData = []) => {
          const newChatSummary = { id: newPersistentId, title: "New Chat", isOptimistic: true }
          const firstPage = currentPagesData[0] || { chats: [] }
          const newFirstPage = { ...firstPage, chats: [newChatSummary, ...firstPage.chats] }
          return [newFirstPage, ...currentPagesData.slice(1)]
        }, false)
        append(userMessage)
        setInput("")
        await generateAndSyncTitle(newPersistentId, trimmedInput)
      } catch (error) {
        toast.error("Could not create new chat. Please try again.")
        return
      }
    } else {
      append({ id: crypto.randomUUID(), role: "user", content: trimmedInput })
      setInput("")
    }
  }

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 768px)")
    const check = (e: MediaQueryListEvent | MediaQueryList) => {
      setIsTabletOrLarger(e.matches)
    }
    check(mediaQuery) // Initial check
    mediaQuery.addEventListener('change', check)
    return () => mediaQuery.removeEventListener('change', check)
  }, [])

  const uiIsLoading = status === "streaming" || status === "submitted" || isSubmittingSearch || isGeneratingTitle
  const isExistingChat = useRef(!!initialChat)

  useEffect(() => {
    if (isExistingChat.current || !isTabletOrLarger || !input.trim() || input.trim().length < 3 || input.trim().length > MAX_COMPLETION_INPUT_LENGTH) {
      setPredictivePrompts([])
      return
    }
    const controller = new AbortController()
    const handler = setTimeout(async () => {
      setIsPredicting(true)
      try {
        const response = await fetch("/api/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ input }),
          signal: controller.signal,
        })
        if (!response.ok) throw new Error("Failed to fetch completions")
        const data = await response.json()
        setPredictivePrompts(data.completions || [])
        setIsPredictiveVisible(true)
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          console.error("Error fetching predictive prompts:", error)
          setPredictivePrompts([])
        }
      } finally {
        if (!controller.signal.aborted) setIsPredicting(false)
      }
    }, 150)
    return () => {
      clearTimeout(handler)
      controller.abort()
    }
  }, [input, isTabletOrLarger])

  const hasSentMessage = messages.length > 0
  const authorInfo = {
    username: user?.username || user?.firstName || "Anonymous",
    profilePic: user?.imageUrl || null,
    firstName: user?.firstName ?? null,
  }

  const chatInputAreaProps = {
    handleSubmit,
    predictivePrompts,
    input,
    setInput: (newInput: string) => {
      setInput(newInput)
      setPredictivePrompts([])
      setIsPredictiveVisible(true)
    },
    handleInputChange,
    isPredicting,
    uiIsLoading,
    status,
    stop,
    hasSentMessage,
    isDesktop: isTabletOrLarger,
    selectedModel,
    setSelectedModel,
    dynamicSuggestedPrompts,
    isPredictiveVisible,
    setIsPredictiveVisible,
    disabled: offlineState !== "online",
    offlineState: offlineState,
  }

  useEffect(() => {
    if (prevStatusRef.current === "streaming" && status === "ready") {
      if (!chatId || messages.length < 2) return
      const saveChat = async () => {
        try {
          await fetch(`/api/chats/${chatId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messages: messages, title: chatTitle }),
          })
          mutateChats()
        } catch {
          toast.error("Could not save the conversation.")
        }
      }
      saveChat()
    }
    prevStatusRef.current = status
  }, [status, messages, chatId, chatTitle, mutateChats])

  useEffect(() => {
    if (!hasSentMessage) return
    const mainEl = containerRef.current
    if (!mainEl) return
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = mainEl
      const isAtBottom = scrollHeight - scrollTop - clientHeight <= 1
      setShowScrollButton(!isAtBottom)
    }
    mainEl.addEventListener("scroll", handleScroll, { passive: true })
    handleScroll()
    return () => mainEl.removeEventListener("scroll", handleScroll)
  }, [hasSentMessage])

  const handleScrollToBottom = () => {
    endRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const handleDelete = async () => {
    if (!chatId) return
    setIsDeleting(true)
    router.push("/chat")
    deleteChat(chatId)
    setShowDeleteModal(false)
    try {
      await fetch(`/api/chats/${chatId}`, { method: "DELETE" })
      toast.success("Chat deleted successfully.")
    } catch (error) {
      toast.error("An error occurred while deleting the chat.")
    }
  }

  const handleRename = async (newTitle: string) => {
    if (!chatId) return
    setIsRenaming(true)
    const originalTitle = chatTitle
    try {
      setChatTitle(newTitle)
      updateChatTitle(chatId, newTitle, true)
      setShowRenameModal(false)
      const response = await fetch(`/api/chats/${chatId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle }),
      })
      if (!response.ok) throw new Error("Failed to rename chat")
      updateChatTitle(chatId, newTitle, false)
      mutateChats()
    } catch (error) {
      toast.error("Failed to rename chat")
      setChatTitle(originalTitle)
      updateChatTitle(chatId, originalTitle, false)
    } finally {
      setIsRenaming(false)
    }
  }

  const handleShare = async () => {
    if (!chatId) {
      toast.error("No chat to share")
      return
    }
    setIsFetchingForShare(true)
    try {
      const response = await fetch(`/api/chats/${chatId}`)
      if (!response.ok) throw new Error("Could not load chat.")
      const data = await response.json()
      setFullChatDataForShare({ ...data, messages, user: authorInfo })
      setShowShareModal(true)
      toast.success("Chat ready to share!")
    } catch (error) {
      toast.error("Failed to prepare chat for sharing.")
    } finally {
      setIsFetchingForShare(false)
    }
  }

  const handleCloseShareModal = () => {
    setShowShareModal(false)
    setFullChatDataForShare(null)
  }

  const Modals = () => (
    <>
      <DeleteChatModal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} onConfirm={handleDelete} chatTitle={chatTitle} isDeleting={isDeleting} />
      <RenameChatModal isOpen={showRenameModal} onClose={() => setShowRenameModal(false)} onConfirm={handleRename} currentTitle={chatTitle} isRenaming={isRenaming} />
      <AnimatePresence>
        {showShareModal && fullChatDataForShare && (
          <div onClick={(e) => e.stopPropagation()}>
            <ShareChatModal isOpen={showShareModal} onClose={handleCloseShareModal} chatId={chatId!} chatTitle={chatTitle} chat={{
              messages: fullChatDataForShare.messages || [],
              user: fullChatDataForShare.user || authorInfo,
              visibility: fullChatDataForShare.visibility || "private",
              isLiveSynced: fullChatDataForShare.isLiveSynced || false,
              updatedAt: fullChatDataForShare.updatedAt || new Date().toISOString(),
            }} />
          </div>
        )}
      </AnimatePresence>
    </>
  )
  
  return (
    // FIX 1: Restored the background color to cover the overlay element.
    <div className="flex h-dvh flex-col bg-background w-screen overflow-x-hidden md:w-full md:overflow-auto">
      <Modals />
      
      <UserChatHeader>
        {hasSentMessage ? (
          <div className="flex w-full items-center justify-between px-2 sm:px-4">
            <span className="truncate text-sm font-medium text-zinc-900 dark:text-white sm:text-base max-w-[60%] sm:max-w-none">
              {chatTitle}
            </span>
            <div className="flex items-center gap-1 sm:gap-2">
              <button
                disabled={!chatId || isFetchingForShare} 
                onClick={handleShare}
                className="flex rounded-2xl sm:rounded-3xl cursor-pointer items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-zinc-900 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Share size={14} className="sm:w-[15px] sm:h-[15px]" />
                <span className="hidden sm:inline">
                  {isFetchingForShare ? "Loading..." : "Share"}
                </span>
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="p-1.5 sm:p-2 cursor-pointer rounded-lg text-zinc-600 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                    <MoreHorizontal size={14} className="sm:w-4 sm:h-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  align="end" 
                  sideOffset={8} 
                  className="w-44 sm:w-48 bg-white dark:bg-[#282828] p-2 shadow-xl border border-zinc-200/80 dark:border-zinc-700/80 rounded-xl sm:rounded-2xl mr-2 sm:mr-0"
                >
                  <DropdownMenuItem onSelect={() => toast.info("Pin feature coming soon!")} className="flex items-center gap-2 sm:gap-3 cursor-pointer px-2 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg focus:bg-zinc-100 dark:focus:bg-zinc-700/50"><Pin size={14} className="sm:w-[15px] sm:h-[15px] text-zinc-500" /><span>Pin Chat</span></DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setShowRenameModal(true)} className="flex items-center gap-2 sm:gap-3 cursor-pointer px-2 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg focus:bg-zinc-100 dark:focus:bg-zinc-700/50"><Edit3 size={14} className="sm:w-[15px] sm:h-[15px] text-zinc-500" /><span>Rename</span></DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-zinc-200/80 dark:bg-zinc-700/60 my-1 mx-1.5" />
                  <DropdownMenuItem onSelect={() => toast.info("Export feature coming soon!")} className="flex items-center gap-2 sm:gap-3 cursor-pointer px-2 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg focus:bg-zinc-100 dark:focus:bg-zinc-700/50"><Download size={14} className="sm:w-[15px] sm:h-[15px] text-zinc-500" /><span>Export Chat</span></DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-zinc-200/80 dark:bg-zinc-700/60 my-1 mx-1.5" />
                  <DropdownMenuItem onSelect={() => toast.info("Archive feature coming soon!")} className="flex items-center gap-2 sm:gap-3 cursor-pointer px-2 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg focus:bg-zinc-100 dark:focus:bg-zinc-700/50"><Archive size={14} className="sm:w-[15px] sm:h-[15px] text-zinc-500" /><span>Archive</span></DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setShowDeleteModal(true)} className="flex items-center gap-2 sm:gap-3 cursor-pointer px-2 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg text-red-600 dark:text-red-500 focus:bg-red-500/10 focus:text-red-600 dark:focus:text-red-500"><Trash2 size={14} className="sm:w-[15px] sm:h-[15px] text-red-600 dark:text-red-500" /><span>Delete</span></DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ) : (
          <AnimatePresence>
            {isTabletOrLarger && isDesktopSidebarCollapsed && (
              <motion.span
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0, transition: { delay: 0.2 } }} exit={{ opacity: 0, x: -10 }}
                className="text-[20px] font-leading select-none mt-1 font-medium text-zinc-900 dark:text-white"
                style={{ lineHeight: "22px", fontFamily: 'Google Sans, "Helvetica Neue", sans-serif' }}
              >
                Avurna
              </motion.span>
            )}
          </AnimatePresence>
        )}
      </UserChatHeader>

      <main
        ref={containerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden pt-14"
      >
        <div className="mx-auto h-full w-full max-w-[53rem]">
          {!hasSentMessage ? (
            <div className="flex h-full w-full items-center justify-center">
              <div className="flex w-full flex-col items-center gap-8 px-4 mb-20">
                <GreetingBanner />
                {isTabletOrLarger && <div className="w-full"><ChatInputArea {...chatInputAreaProps} /></div>}
              </div>
            </div>
          ) : (
            <>
              <div className="px-2 sm:px-4 pt-4">
                <Messages messages={messages} isLoading={uiIsLoading} status={status as any} endRef={endRef} />
              </div>
              <ChatScrollAnchor containerRef={containerRef} />
              <div ref={endRef} className="h-px" />
            </>
          )}
        </div>
      </main>
      
      {((!hasSentMessage && !isTabletOrLarger) || hasSentMessage) && (
        <div className="w-full pt-2">
            <div className="mx-auto w-full max-w-[50rem] px-3 pb-3 sm:px-4 sm:pb-4">
                <div className={`relative`}>
                    {hasSentMessage && (
                        // FIX 2: Corrected invalid 'top-13' to a valid 'top-0'
                        <div className="absolute top-3 left-1/2 -translate-x-1/2">
                            <ScrollToBottomButton
                                isVisible={showScrollButton}
                                onClick={handleScrollToBottom}
                            />
                        </div>
                    )}
                    <ChatInputArea {...chatInputAreaProps} />
                </div>
                {hasSentMessage && (
                    // FIX 3: Corrected negative margin '-mt-2' to 'mt-2'
                    <p className="text-center text-xs font-base text-zinc-600 dark:text-zinc-200 -mt-1 -mb-2 px-4">
                        Avurna uses AI. Double check response.
                    </p>
                )}
            </div>
        </div>
      )}
    </div>
  )
}