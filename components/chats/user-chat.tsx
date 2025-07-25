"use client"

import React from "react"
import { getDefaultModel } from "@/ai/providers"
import { useChat } from "@ai-sdk/react"
import { useEffect, useRef, useState } from "react"
import { Share, MoreHorizontal, Pin, Edit3, Archive, Download, Trash2, MoreVertical } from "lucide-react"
import { ThemeToggle } from "../ui/theme-toggle";
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

// Type for data returned from our /api/upload endpoint
export interface AttachmentRecord {
  id: string;
  fileName: string;
  fileType: string;
  downloadUrl: string;
  chatId: string | null;
  userId: string;
  fileSize: number;
  storagePath: string;
  createdAt: string;
}

// Type for files staged in the browser's memory
export interface StagedFile {
  id: string;
  file: File;
  previewUrl: string | null;
  uploadProgress?: number; // Add uploadProgress to track individual file upload progress
  uploadedAttachment?: AttachmentRecord; // Store the uploaded attachment record here
  isUploading: boolean; // Flag to indicate if this specific file is uploading
  error?: string; // To store upload errors for a specific file
}

// Type definition for what the Vercel AI SDK's `experimental_attachments` field expects
export interface Attachment {
  name?: string;
  contentType?: string;
  url: string;
}

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

  // State to manage staged files and their upload progress
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([]);


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

  const hasSentMessage = messages.length > 0

  // New function to handle file staging and immediate upload
  const handleFileStaged = async (newFiles: StagedFile[]) => {
    if (!dbUser?.id) {
      toast.error("User profile not loaded. Please wait a moment.");
      return;
    }

    // Add new files to stagedFiles state with initial uploading status
    setStagedFiles(prev => [...prev, ...newFiles.map(f => ({ ...f, isUploading: true, uploadProgress: 0 }))]);

    let currentChatId = chatId;
    let isNewChat = !currentChatId;

    if (isNewChat) {
      // If it's a new chat, create it first to get a chatId for uploads
      const tempTitle = "New Chat (Draft)"; // Placeholder title
      const initialMessageForDb = { role: 'user', content: "Draft chat with attachments." }; // Placeholder content
      try {
        const response = await fetch("/api/chats", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [initialMessageForDb],
            userId: dbUser.id,
            title: tempTitle
          }),
        });

        if (!response.ok) throw new Error("Failed to create chat in the database for file upload.");

        const newChat = await response.json();
        currentChatId = newChat.id;
        setChatId(currentChatId);
        setChatTitle(tempTitle);
        window.history.replaceState({}, "", `/chat/${currentChatId}`);
        mutateChats();
      } catch (error: any) {
        toast.error(error.message || "Failed to initialize chat for file upload.");
        // Mark all new files as errored if chat creation fails
        setStagedFiles(prev => prev.map(f => newFiles.some(nf => nf.id === f.id) ? { ...f, isUploading: false, error: 'Chat init failed' } : f));
        return;
      }
    }

    // Now, upload each new file
    newFiles.forEach(async (stagedFile) => {
      const formData = new FormData();
      formData.append('file', stagedFile.file);
      if (currentChatId) formData.append('chatId', currentChatId);

      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/upload', true);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentCompleted = Math.round((event.loaded * 100) / event.total);
          setStagedFiles(prev => prev.map(f => f.id === stagedFile.id ? { ...f, uploadProgress: percentCompleted } : f));
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          const result = JSON.parse(xhr.responseText);
          setStagedFiles(prev => prev.map(f => f.id === stagedFile.id ? { ...f, isUploading: false, uploadProgress: 100, uploadedAttachment: result.attachmentRecord } : f));
          toast.success(`'${stagedFile.file.name}' uploaded.`);
        } else {
          const errorResult = JSON.parse(xhr.responseText);
          setStagedFiles(prev => prev.map(f => f.id === stagedFile.id ? { ...f, isUploading: false, error: errorResult.error || 'Upload failed' } : f));
          toast.error(`Failed to upload '${stagedFile.file.name}': ${errorResult.error || 'Unknown error'}`);
        }
      };

      xhr.onerror = () => {
        setStagedFiles(prev => prev.map(f => f.id === stagedFile.id ? { ...f, isUploading: false, error: 'Network error' } : f));
        toast.error(`Network error uploading '${stagedFile.file.name}'.`);
      };

      xhr.send(formData);
    });
  };

  const handleSendMessage = async (messageText: string) => {
    if (!dbUser?.id) {
      toast.error("User profile not loaded. Please wait a moment.");
      return;
    }

    let currentChatId = chatId;
    let isNewChat = !currentChatId;

    const uploadedAttachments = stagedFiles.filter(f => f.uploadedAttachment && !f.isUploading && !f.error).map(f => f.uploadedAttachment!);

    if (!messageText.trim() && uploadedAttachments.length === 0) {
      toast.error("Please enter a message or wait for files to upload.");
      return;
    }

    if (stagedFiles.some(f => f.isUploading)) {
      toast.info("Please wait for all files to finish uploading.");
      return;
    }

    try {
      if (isNewChat) {
        const tempTitle = messageText.substring(0, 50) || "New Chat";
        const initialMessageForDb = { role: 'user', content: messageText };
        const response = await fetch("/api/chats", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [initialMessageForDb],
            userId: dbUser.id,
            title: tempTitle
          }),
        });

        if (!response.ok) throw new Error("Failed to create chat in the database.");

        const newChat = await response.json();
        currentChatId = newChat.id;
        setChatId(currentChatId);
        setChatTitle(tempTitle);
        window.history.replaceState({}, "", `/chat/${currentChatId}`);
        mutateChats();
      }

      const sdkAttachments: Attachment[] = uploadedAttachments.map(att => ({
        url: att.downloadUrl,
        name: att.fileName,
        contentType: att.fileType,
      }));

      // Clear input and staged files BEFORE appending the message to the chat
      stagedFiles.forEach(sf => {
        if (sf.previewUrl) URL.revokeObjectURL(sf.previewUrl);
      });
      setStagedFiles([]);
      setInput('');

      await append({
        role: 'user',
        content: messageText,
        experimental_attachments: sdkAttachments,
      }, {
        data: {
          attachmentIds: uploadedAttachments.map(a => a.id),
          chatId: currentChatId
        }
      });

      if (isNewChat && currentChatId) {
        await generateAndSyncTitle(currentChatId, messageText);
      }

    } catch (error: any) {
      toast.error(error.message || "An unexpected error occurred.");
    }
  };

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 768px)")
    const check = (e: MediaQueryListEvent | MediaQueryList) => setIsTabletOrLarger(e.matches)
    check(mediaQuery)
    mediaQuery.addEventListener('change', check)
    return () => mediaQuery.removeEventListener('change', check)
  }, [])

  // uiIsLoading now includes checks for any file being uploaded
  const uiIsLoading = status === "streaming" ||
    status === "submitted" ||
    isSubmittingSearch ||
    isGeneratingTitle ||
    (stagedFiles || []).some(f => f.isUploading); // <-- ADDED || []

  useEffect(() => {
    if (hasSentMessage || !isTabletOrLarger || !input.trim() || input.trim().length < 3 || input.trim().length > MAX_COMPLETION_INPUT_LENGTH) {
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
  }, [input, isTabletOrLarger, hasSentMessage])

  const authorInfo = {
    username: user?.username || user?.firstName || "Anonymous",
    profilePic: user?.imageUrl || null,
    firstName: user?.firstName ?? null,
  }

  const chatInputAreaProps = {
    onSendMessage: handleSendMessage, // Updated signature
    onFileStaged: handleFileStaged, // New prop for staging files
    stagedFiles: stagedFiles, // Pass staged files to ChatInputArea
    setStagedFiles: setStagedFiles, // Pass setter for staged files
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
    dynamicSuggestedPrompts: dynamicSuggestedPrompts || [], // FIX: Add a fallback empty array
    isPredictiveVisible,
    setIsPredictiveVisible,
    // Modified: Only disable if offline or actively uploading files, NOT during AI streaming
    disabled: offlineState !== "online" || (stagedFiles || []).some(f => f.isUploading),
    offlineState: offlineState,
    user: dbUser,
    chatId: chatId,
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
    <div className="flex h-dvh flex-col bg-background w-screen overflow-x-hidden md:w-full overflow-hidden">
      <Modals />
      <UserChatHeader
        desktopActions={
          hasSentMessage && (
            <div className="flex items-center gap-1 sm:gap-2">
              <button disabled={!chatId || isFetchingForShare} onClick={handleShare} className="flex rounded-2xl sm:rounded-3xl cursor-pointer items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-zinc-900 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                <Share size={14} className="sm:w-[15px] sm:h-[15px]" />
                <span className="hidden sm:inline">{isFetchingForShare ? "Loading..." : "Share"}</span>
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="p-1.5 sm:p-2 cursor-pointer rounded-lg text-zinc-600 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                    <MoreHorizontal size={14} className="sm:w-4 sm:h-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" sideOffset={8} className="w-48 bg-white dark:bg-[#282828] p-2 shadow-xl border border-zinc-200/80 dark:border-zinc-700/80 rounded-2xl">
                  <DropdownMenuItem onSelect={() => toast.info("Pin feature coming soon!")} className="flex items-center gap-2 sm:gap-3 cursor-pointer px-2 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg focus:bg-zinc-100 dark:focus:bg-zinc-700/50"><Pin size={14} className="sm:w-[15px] sm:h-[15px] text-zinc-500" /><span>Pin Chat</span></DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setShowRenameModal(true)} className="flex items-center gap-2 sm:gap-3 cursor-pointer px-2 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg focus:bg-zinc-100 dark:focus:bg-zinc-700/50"><Edit3 size={14} className="sm:w-[15px] sm:h-[15px] text-zinc-500" /><span>Rename</span></DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-zinc-200/80 dark:bg-zinc-700/60 my-1 mx-1.5" />
                  <DropdownMenuItem onSelect={() => toast.info("Export feature coming soon!")} className="flex items-center gap-2 sm:gap-3 cursor-pointer px-2 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg focus:bg-zinc-100 dark:focus:bg-zinc-700/50"><Download size={14} className="sm:w-[15px] sm:h-[15px] text-zinc-500" /><span>Export Chat</span></DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-zinc-200/80 dark:bg-zinc-700/60 my-1 mx-1.1" />
                  <DropdownMenuItem onSelect={() => toast.info("Archive feature coming soon!")} className="flex items-center gap-2 sm:gap-3 cursor-pointer px-2 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg focus:bg-zinc-100 dark:focus:bg-zinc-700/50"><Archive size={14} className="sm:w-[15px] sm:h-[15px] text-zinc-500" /><span>Archive</span></DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setShowDeleteModal(true)} className="flex items-center gap-2 sm:gap-3 cursor-pointer px-2 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg text-red-600 dark:text-red-500 focus:bg-red-500/10 focus:text-red-600 dark:focus:text-red-500"><Trash2 size={14} className="sm:w-[15px] sm:h-[15px] text-red-600 dark:text-red-500" /><span>Delete</span></DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <ThemeToggle />
            </div>
          )
        }
        mobileActions={
          hasSentMessage && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-2">
                  <MoreVertical size={18} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={8} className="w-48 bg-white dark:bg-[#282828] p-2 shadow-xl border border-zinc-200/80 dark:border-zinc-700/80 rounded-2xl">
                <DropdownMenuItem onSelect={() => toast.info("Pin feature coming soon!")} className="flex items-center gap-2 sm:gap-3 cursor-pointer px-2 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg focus:bg-zinc-100 dark:focus:bg-zinc-700/50"><Pin size={14} className="sm:w-[15px] sm:h-[15px] text-zinc-500" /><span>Pin Chat</span></DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setShowRenameModal(true)} className="flex items-center gap-2 sm:gap-3 cursor-pointer px-2 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg focus:bg-zinc-100 dark:focus:bg-zinc-700/50"><Edit3 size={14} className="sm:w-[15px] sm:h-[15px] text-zinc-500" /><span>Rename</span></DropdownMenuItem>
                <DropdownMenuSeparator className="bg-zinc-200/80 dark:bg-zinc-700/60 my-1 mx-1.5" />
                <DropdownMenuItem onSelect={() => toast.info("Export feature coming soon!")} className="flex items-center gap-2 sm:gap-3 cursor-pointer px-2 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg focus:bg-zinc-100 dark:focus:bg-zinc-700/50"><Download size={14} className="sm:w-[15px] sm:h-[15px] text-zinc-500" /><span>Export Chat</span></DropdownMenuItem>
                <DropdownMenuSeparator className="bg-zinc-200/80 dark:bg-zinc-700/60 my-1 mx-1.5" />
                <DropdownMenuItem onSelect={() => toast.info("Archive feature coming soon!")} className="flex items-center gap-2 sm:gap-3 cursor-pointer px-2 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg focus:bg-zinc-100 dark:focus:bg-zinc-700/50"><Archive size={14} className="sm:w-[15px] sm:h-[15px] text-zinc-500" /><span>Archive</span></DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setShowDeleteModal(true)} className="flex items-center gap-2 sm:gap-3 cursor-pointer px-2 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg text-red-600 dark:text-red-500 focus:bg-red-500/10 focus:text-red-600 dark:focus:text-red-500"><Trash2 size={14} className="sm:w-[15px] sm:h-[15px] text-red-600 dark:text-red-500" /><span>Delete</span></DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )
        }
      >
        {/* --- MODIFIED BLOCK --- */}
        {hasSentMessage && (
          <span className="truncate -ml-2 text-sm font-medium text-zinc-900 dark:text-white sm:text-base">
            {chatTitle}
          </span>
        )}
        {/* The conditional "Avurna" span has been removed. */}
        {/* --- END MODIFIED BLOCK --- */}
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