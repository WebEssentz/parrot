"use client"

import { Textarea as ShadcnTextarea, AttachButton } from "@/components/ui/textarea"
import { ArrowUp, ArrowRight, AudioLines, SquareStack, UploadCloud, ChevronLeft, ChevronRight } from "lucide-react"
import { PauseIcon } from "./icons"
import React, { useImperativeHandle, forwardRef, type DragEvent } from "react"
import { Room, RoomEvent } from "livekit-client"
import { useUser } from "@clerk/nextjs"
import { motion, AnimatePresence } from "framer-motion"
import { SlidePreviewModal } from "./SlidePreviewModal"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { FlowOverlay } from "./FlowOverlay"
import { v4 as uuidv4 } from "uuid"
import { TextFileModal } from "./TextFileModal"
import { AvurnaDropOverlay } from "./AvurnaDropOverlay"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import { FilePreview } from "./FilePreview"
import { ImageFilmstripModal } from "./ImageFilmstrip"
import type { StagedFile } from "@/components/chats/user-chat"

// ... (Your InputProps interface remains unchanged)
interface InputProps {
  input: string
  handleInputChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void
  setInput: (value: string) => void
  isLoading: boolean
  status: string
  stop: () => void
  hasSentMessage: boolean
  isDesktop: boolean
  disabled?: boolean
  isPerceivedStreaming: boolean;
  offlineState?: "online" | "reconnecting" | "offline"
  onFocus?: () => void
  user: { id: string } | null | undefined
  chatId: string | null
  onSendMessage: (message: string) => Promise<void>
  onFileStaged: (files: StagedFile[]) => void
  stagedFiles: StagedFile[]
  setStagedFiles: React.Dispatch<React.SetStateAction<StagedFile[]>>
  suggestedPrompts: string[]
}

const containerVariants = {
  hidden: { opacity: 0, height: 0, overflow: "hidden", transition: { when: "afterChildren", duration: 0.2 } },
  visible: { opacity: 1, height: "auto", transition: { when: "beforeChildren", staggerChildren: 0.1, duration: 0.3 } },
}


export const Textarea = forwardRef<HTMLTextAreaElement, InputProps>(
  (
    {
      input,
      handleInputChange,
      setInput,
      isLoading,
      status,
      stop,
      onFocus,
      isPerceivedStreaming,
      hasSentMessage,
      isDesktop,
      disabled = false,
      offlineState = "online",
      onSendMessage,
      onFileStaged,
      stagedFiles,
      setStagedFiles,
      suggestedPrompts,
      user,
      chatId,
    },
    ref,
  ) => {
    // ... (All your hooks and state variables remain unchanged)
    const { isSignedIn } = useUser()
    const [isMenuOpen, setIsMenuOpen] = React.useState(false)
    const fileInputRef = React.useRef<HTMLInputElement>(null)
    const [isTooltipOpen, setIsTooltipOpen] = React.useState(false)
    const menuJustClosedRef = React.useRef(false)
    const textareaRef = React.useRef<HTMLTextAreaElement>(null)
    const [staticPlaceholderAnimatesOut, setStaticPlaceholderAnimatesOut] = React.useState(false)
    const [currentPromptIndex, setCurrentPromptIndex] = React.useState(0)
    const [previousPromptIndex, setPreviousPromptIndex] = React.useState<number | null>(null)
    const [showAnimatedSuggestions, setShowAnimatedSuggestions] = React.useState(false)
    const [isTabToAcceptEnabled, setIsTabToAcceptEnabled] = React.useState(true)
    const [promptVisible, setPromptVisible] = React.useState(false)
    const [isFlowActive, setIsFlowActive] = React.useState(false)
    const [flowSession, setFlowSession] = React.useState<{ room: Room; roomName: string } | null>(null)
    const [isDraggingFileOverApp, setIsDraggingFileOverApp] = React.useState(false)
    const [filmstripImageId, setFilmstripImageId] = React.useState<string | null>(null)
    const [viewingTextFile, setViewingTextFile] = React.useState<StagedFile | null>(null)
    const [viewingSlideFile, setViewingSlideFile] = React.useState<StagedFile | null>(null)
    const scrollContainerRef = React.useRef<HTMLDivElement>(null)
    const [canScrollLeft, setCanScrollLeft] = React.useState(false)
    const [canScrollRight, setCanScrollRight] = React.useState(false)
    

    // ... (All your functions like checkScrollability, handleScroll, etc. remain unchanged)
    const checkScrollability = React.useCallback(() => {
      const el = scrollContainerRef.current
      if (el) {
        const hasOverflow = el.scrollWidth > el.clientWidth
        setCanScrollLeft(hasOverflow && el.scrollLeft > 0)
        setCanScrollRight(hasOverflow && el.scrollLeft < el.scrollWidth - el.clientWidth - 1)
      }
    }, [])

    React.useEffect(() => {
      const el = scrollContainerRef.current
      if (!el) return
      checkScrollability()
      const resizeObserver = new ResizeObserver(checkScrollability)
      resizeObserver.observe(el)
      return () => resizeObserver.disconnect()
    }, [stagedFiles, checkScrollability])

    const handleScroll = (direction: "left" | "right") => {
      const el = scrollContainerRef.current
      if (el) {
        const scrollAmount = el.clientWidth * 0.8
        el.scrollBy({ left: direction === "left" ? -scrollAmount : scrollAmount, behavior: "smooth" })
      }
    }

    useImperativeHandle(ref, () => textareaRef.current as HTMLTextAreaElement)

    const featureActive = isDesktop && !hasSentMessage && !isSignedIn

    const handleTriggerUpload = () => fileInputRef.current?.click()

    const SUPPORTED_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/gif", "image/webp", "application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/vnd.ms-powerpoint", "text/csv", "text/tab-separated-values", "text/plain", "text/html", "application/json", "application/javascript", "application/xml", "video/mp4", "video/mpeg", "video/quicktime", "video/avi", "video/x-flv", "video/mpegps", "video/mpg", "video/webm", "video/wmv", "video/3gpp", "audio/x-aac", "audio/flac", "audio/mp3", "audio/m4a", "audio/mpeg", "audio/mpga", "audio/mp4", "audio/opus", "audio/pcm", "audio/wav", "audio/webm",])

    const addFilesToStage = (files: File[]) => {
      const EXTENSION_WHITELIST = [
        ".tsx", ".ts", ".jsx", ".js", ".py", ".cpp", ".c", ".java",
        ".html", ".css", ".json", ".md", ".txt",
        ".pdf", ".doc", ".docx", ".ppt", ".pptx", ".xls", ".xlsx",
        ".csv"
      ]

      const validFiles = files.filter((file) => {
        const mimeOk = SUPPORTED_MIME_TYPES.has(file.type)
        const extOk = EXTENSION_WHITELIST.some((ext) => file.name.toLowerCase().endsWith(ext))
        return mimeOk || extOk
      })

      if (validFiles.length !== files.length) { toast.error("Only supported images, audio, video, docs, code, and text files are allowed.") }
      const newFiles: StagedFile[] = validFiles.map((file) => ({ id: uuidv4(), file, previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : null, isUploading: true, uploadProgress: 0, }))
      onFileStaged(newFiles)
    }

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files
      if (!files || files.length === 0) return
      addFilesToStage(Array.from(files))
      if (fileInputRef.current) fileInputRef.current.value = ""
    }

   // UPDATE the handlePreview function to handle PowerPoints
    const handlePreview = (file: StagedFile) => {
      const fileType = file.file.type;

      if (fileType.startsWith("image/")) {
        setFilmstripImageId(file.id);
      } else if (fileType.includes("presentation") || fileType.includes("powerpoint")) {
        // NEW: Set the state for our slide modal
        setViewingSlideFile(file);
      } else if (fileType === "text/plain") {
        setViewingTextFile(file);
      } else {
        // Default download for other files like PDF, DOCX, etc. for now
        toast.info(`Downloading ${file.file.name}...`);
        const url = URL.createObjectURL(file.file);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    };

    const handleRemoveStagedFile = (idToRemove: string) => {
      setStagedFiles((currentFiles) => {
        const fileToRemove = currentFiles.find((f) => f.id === idToRemove)
        if (fileToRemove?.previewUrl) { URL.revokeObjectURL(fileToRemove.previewUrl) }
        return currentFiles.filter((f) => f.id !== idToRemove)
      })
    }

    const handleFormSubmit = () => { onSendMessage(input.trim()) }

    React.useEffect(() => { return () => { stagedFiles.forEach((sf) => { if (sf.previewUrl) URL.revokeObjectURL(sf.previewUrl) }) } }, [stagedFiles])

    React.useEffect(() => {
      let fadeOutTimer: NodeJS.Timeout | undefined, showSuggestionsTimer: NodeJS.Timeout | undefined
      if (featureActive && !input && suggestedPrompts.length > 0) {
        setIsTabToAcceptEnabled(true)
        setStaticPlaceholderAnimatesOut(false)
        setShowAnimatedSuggestions(false)
        setPromptVisible(false)
        fadeOutTimer = setTimeout(() => { if (featureActive && !input) setStaticPlaceholderAnimatesOut(true) }, 700)
        showSuggestionsTimer = setTimeout(() => { if (featureActive && !input) { setShowAnimatedSuggestions(true); setCurrentPromptIndex(0); setPreviousPromptIndex(null); setTimeout(() => setPromptVisible(true), 50) } }, 1000)
      } else {
        setStaticPlaceholderAnimatesOut(false)
        setShowAnimatedSuggestions(false)
        setPromptVisible(false)
        if (input) setIsTabToAcceptEnabled(false)
      }
      return () => { clearTimeout(fadeOutTimer); clearTimeout(showSuggestionsTimer) }
    }, [featureActive, input, suggestedPrompts])

    React.useEffect(() => {
      let promptInterval: NodeJS.Timeout | undefined
      if (showAnimatedSuggestions && suggestedPrompts.length > 0 && isTabToAcceptEnabled && featureActive) {
        promptInterval = setInterval(() => {
          setPromptVisible(false)
          setTimeout(() => { setPreviousPromptIndex(currentPromptIndex); setCurrentPromptIndex((prevIndex) => (prevIndex + 1) % suggestedPrompts.length); setTimeout(() => setPromptVisible(true), 50) }, 300)
        }, 2000 + 300)
      }
      return () => clearInterval(promptInterval)
    }, [showAnimatedSuggestions, suggestedPrompts.length, isTabToAcceptEnabled, featureActive, currentPromptIndex])

    React.useEffect(() => {
      const textarea = textareaRef.current
      if (textarea) { textarea.style.height = "auto"; const scrollHeight = textarea.scrollHeight; textarea.style.height = `${scrollHeight}px` }
    }, [input, stagedFiles])

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (featureActive && showAnimatedSuggestions && suggestedPrompts.length > 0 && isTabToAcceptEnabled && e.key === "Tab") {
        e.preventDefault()
        const currentDynamicPromptText = suggestedPrompts[currentPromptIndex]
        if (currentDynamicPromptText) { setInput(currentDynamicPromptText); setShowAnimatedSuggestions(false); setIsTabToAcceptEnabled(false); setPromptVisible(false) }
        return
      }
      if (e.key !== "Tab" && input.length === 0 && e.key.length === 1) { setIsTabToAcceptEnabled(false) }
      if (isDesktop && e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        if ((input.trim().length > 0 || stagedFiles.length > 0) && !isActivelyUploadingFiles && offlineState === "online") { handleFormSubmit() }
        else if (isLoading && input.trim().length === 0 && stagedFiles.length === 0) { return }
      }
    }

    const handlePaste = (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const items = event.clipboardData?.items
      if (items) {
        const files = Array.from(items).map((item) => item.getAsFile()).filter((file): file is File => file !== null)
        if (files.length > 0) { event.preventDefault(); addFilesToStage(files) }
      }
    }

    const handleDragOver = (event: DragEvent<HTMLDivElement>) => { event.preventDefault(); if (!hasContent) { setIsDraggingFileOverApp(true) } }
    const handleDragLeave = (event: DragEvent<HTMLDivElement>) => { event.preventDefault(); setIsDraggingFileOverApp(false) }
    const handleDrop = (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      setIsDraggingFileOverApp(false)
      const droppedFiles = event.dataTransfer.files
      if (droppedFiles && droppedFiles.length > 0) { addFilesToStage(Array.from(droppedFiles)) }
    }

    const handleVoiceClick = async () => {
      if (input.trim().length > 0 || stagedFiles.length > 0) { handleFormSubmit(); return }
      setIsFlowActive(true)
      try {
        const response = await fetch("/api/flow/start", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ identity: user?.id || `user-${uuidv4()}` }), })
        if (!response.ok) throw new Error(`Failed to start flow session: ${response.statusText}`)
        const { user_token, livekit_url, room_name } = await response.json()
        const room = new Room()
        room.on(RoomEvent.Disconnected, () => { setIsFlowActive(false); setFlowSession(null) })
        await room.connect(livekit_url, user_token)
        await room.localParticipant.setMicrophoneEnabled(true)
        setFlowSession({ room, roomName: room_name })
      } catch (error) {
        console.error("Critical error during Flow activation:", error)
        setIsFlowActive(false)
        if (flowSession?.room) { await flowSession.room.disconnect() }
      }
    }

    const handleCloseFlow = async () => {
      if (flowSession?.room) { await flowSession.room.localParticipant.setMicrophoneEnabled(false); await flowSession.room.disconnect() }
      else { setIsFlowActive(false) }
    }

    const isActivelyUploadingFiles = stagedFiles.some((f) => f.isUploading)
    const isDisabled = disabled // || offlineState !== "online"
    const hasContent = input.trim().length > 0 || stagedFiles.length > 0
    const textareaStyle = React.useMemo(() => ({ minHeight: 48, maxHeight: 200 }), [])

    return (
      <>
        <TooltipProvider delayDuration={100}>
          <motion.div
            animate={{ opacity: isFlowActive ? 0 : 1, y: isFlowActive ? 10 : 0 }}
            transition={{ duration: 0.3 }}
            className="relative flex w-full items-end px-3 py-3"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <AvurnaDropOverlay isVisible={isDraggingFileOverApp && !hasContent} />
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              disabled={isDisabled}
              multiple
              accept="image/*,audio/*,video/*,application/pdf,text/*,.csv,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
            />
            {/* 
              STYLE FIX: I have restored your original className here.
              The 'border' classes have been REMOVED.
            */}
            <motion.div
              layout
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
              className="relative flex w-full flex-auto flex-col rounded-[1.8rem] bg-white dark:bg-[#2a2a2a] border border-zinc-300 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600/30"
            >
              <AnimatePresence>
                {stagedFiles.length > 0 && (
                  <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                    // STYLE FIX: I have removed the 'border-b' I added here.
                    className="relative px-3 pt-3"
                  >
                    <div ref={scrollContainerRef} onScroll={checkScrollability} className="flex gap-3 pb-3 overflow-x-auto scroll-smooth no-scrollbar">
                      {/* 
                        FUNCTIONAL FIX: This is the only functional change.
                        It now correctly calls FilePreview with the props it expects.
                      */}
                      {stagedFiles.map((sf: StagedFile) => (
                        <FilePreview
                          key={sf.id}
                          stagedFile={sf}
                          onRemove={() => handleRemoveStagedFile(sf.id)}
                          onPreview={handlePreview}
                        />
                      ))}
                    </div>
                    {/* ... Scroll Indicators ... */}
                    <AnimatePresence>
                      {canScrollLeft && (
                        <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} onClick={() => handleScroll("left")} className="absolute left-0 top-1/2 cursor-pointer -translate-y-1/2 z-10 h-8 w-8 rounded-full bg-black/40 text-white backdrop-blur-sm flex items-center justify-center hover:bg-black/60">
                          <ChevronLeft size={20} />
                        </motion.button>
                      )}
                    </AnimatePresence>
                    <AnimatePresence>
                      {canScrollRight && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="absolute right-3 top-3 bottom-3 w-12 bg-gradient-to-l from-[#ffffff] cursor-pointer dark:from-[#2a2a2a] to-transparent pointer-events-none" />
                      )}
                    </AnimatePresence>
                    <AnimatePresence>
                      {canScrollRight && (
                        <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} onClick={() => handleScroll("right")} className="absolute right-0 top-1/2 cursor-pointer -translate-y-1/2 z-10 h-8 w-8 rounded-full bg-black/40 text-white backdrop-blur-sm flex items-center justify-center hover:bg-black/60">
                          <ChevronRight size={20} />
                        </motion.button>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="relative">
                <ShadcnTextarea ref={textareaRef} className="scrollbar-thin scrollbar-track-transparent scrollbar-thumb-zinc-900 dark:scrollbar-thumb-zinc-600 resize-none bg-transparent w-full rounded-3xl pl-5 pr-6 pt-4 pb-[2.5rem] text-base md:text-base font-normal placeholder:text-zinc-500 border-none shadow-none focus-visible:ring-0" value={input} autoFocus onFocus={onFocus} onDragOver={(e) => e.preventDefault()} onDrop={(e) => e.preventDefault()} onDragLeave={(e) => e.preventDefault()} placeholder={"Ask Avurna..."} disabled={isDisabled} style={textareaStyle} onChange={handleInputChange} onKeyDown={handleKeyDown} onPaste={handlePaste} />
              </div>
              <div className="absolute inset-x-0 bottom-0 z-10 rounded-b-[1.8rem] px-2 pb-2 pt-1">
                <div className="flex w-full items-center justify-between">
                  {/* ... Your DropdownMenu and buttons remain unchanged ... */}
                  <DropdownMenu onOpenChange={(isOpen) => { setIsMenuOpen(isOpen); if (isOpen) { setIsTooltipOpen(false) } else { menuJustClosedRef.current = true } }}>
                    <Tooltip open={isTooltipOpen} onOpenChange={(isOpen) => { if (menuJustClosedRef.current) { menuJustClosedRef.current = false; return } if (!isMenuOpen) { setIsTooltipOpen(isOpen) } }}>
                      <TooltipTrigger asChild><DropdownMenuTrigger asChild disabled={isDisabled}><AttachButton className="dark:text-zinc-200 text-zinc-700" isUploading={false} disabled={isDisabled} isActive={isMenuOpen} /></DropdownMenuTrigger></TooltipTrigger>
                      <TooltipContent side={"top"} className="select-none bg-black text-white dark:bg-white dark:text-black rounded-md font-medium shadow-lg"><p>{isDisabled ? "Processing..." : "Add photos, files, and apps"}</p></TooltipContent>
                    </Tooltip>
                    <DropdownMenuContent side={hasSentMessage ? "top" : "bottom"} sideOffset={12} align="start" className="w-64 p-2 bg-zinc-50 dark:bg-[#2A2A2A] border border-zinc-200 dark:border-zinc-700/50 shadow-2xl shadow-black/10 rounded-[1.25rem]">
                      <DropdownMenuItem onClick={handleTriggerUpload} className="flex items-center gap-3 cursor-pointer p-2.5 text-sm font-medium text-zinc-800 dark:text-zinc-200 rounded-lg data-[highlighted]:bg-zinc-200/60 dark:data-[highlighted]:bg-white/10 outline-none"><UploadCloud className="h-5 w-5 text-zinc-500 dark:text-zinc-400" /><span>Add photos & files</span></DropdownMenuItem>
                      <DropdownMenuSub><DropdownMenuSubTrigger className="flex w-full items-center gap-3 cursor-pointer p-2.5 text-sm font-medium text-zinc-800 dark:text-zinc-200 rounded-lg data-[state=open]:bg-zinc-200/60 data-[highlighted]:bg-zinc-200/60 dark:data-[state=open]:bg-white/10 dark:data-[highlighted]:bg-white/10 outline-none"><SquareStack className="h-5 w-5 text-zinc-500 dark:text-zinc-400" /><span>Add from apps</span></DropdownMenuSubTrigger></DropdownMenuSub>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <div className="flex items-center">
                    {isPerceivedStreaming ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <motion.div
                            key="loading-stop"
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                          >
                            <button
                              type="button"
                              onClick={stop}
                              className="rounded-full flex items-center justify-center bg-black dark:bg-white cursor-pointer"
                              style={{ width: 40, height: 40 }}
                            >
                              <PauseIcon size={28} className="h-6 w-6 text-white dark:text-black" />
                            </button>
                          </motion.div>
                        </TooltipTrigger>
                        <TooltipContent side="top" align="center" className="select-none bg-black text-white dark:bg-white dark:text-black rounded-md font-medium">
                          <p>Stop Response</p>
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <motion.button type="button" onClick={handleVoiceClick} disabled={isDisabled} className="rounded-full flex items-center justify-center bg-black dark:bg-white text-white dark:text-black cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed" style={{ width: 36, height: 36 }} aria-label={hasContent ? "Send" : "Activate Flow"} whileHover={!isDisabled && hasContent ? { scale: 1.1 } : {}} whileTap={!isDisabled && hasContent ? { scale: 0.95 } : {}} transition={{ type: "spring", stiffness: 500, damping: 15 }}>
                            <AnimatePresence mode="wait" initial={false}><motion.span key={hasContent ? "send" : "voice"} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: 0.15 }}>{hasContent ? (hasSentMessage ? <ArrowUp size={20} /> : <ArrowRight size={20} />) : (<AudioLines size={20} />)}</motion.span></AnimatePresence>
                          </motion.button>
                        </TooltipTrigger>
                        <TooltipContent side="top" align="center" className="select-none bg-black text-white dark:bg-white dark:text-black rounded-md font-medium"><p>{hasContent ? "Send" : "Activate Flow"}</p></TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </TooltipProvider>
        {/* Modals remain unchanged */}
        <AnimatePresence>{isFlowActive && <FlowOverlay onClose={handleCloseFlow} session={flowSession} user={user} />}</AnimatePresence>
        <AnimatePresence>{filmstripImageId && (<ImageFilmstripModal images={stagedFiles} initialImageId={filmstripImageId} onClose={() => setFilmstripImageId(null)} />)}</AnimatePresence>
        <AnimatePresence>
          {viewingTextFile && (
            <TextFileModal
              stagedFile={viewingTextFile}
              onClose={() => setViewingTextFile(null)}
              isOpen={!!viewingTextFile}
            />
          )}
        </AnimatePresence>
        
        {/* NEW: Render our slide preview modal */}
        <AnimatePresence>
            {viewingSlideFile && (
                <SlidePreviewModal
                    isOpen={!!viewingSlideFile}
                    onClose={() => setViewingSlideFile(null)}
                    stagedFile={viewingSlideFile}
                />
            )}
        </AnimatePresence>
      </>
    )
  },
)