"use client";

import { Textarea as ShadcnTextarea, AttachButton } from "@/components/ui/textarea";
import { ArrowUp, ArrowRight, AudioLines, Database, Github, AppWindow, UploadCloud } from "lucide-react"; 
import { SpinnerIcon, PauseIcon } from "./icons";
import React, { useImperativeHandle, forwardRef, DragEvent } from "react";
import { Room, RoomEvent } from 'livekit-client';
import { useUser } from "@clerk/nextjs";
import { motion, AnimatePresence } from "framer-motion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { FlowOverlay } from './FlowOverlay';
import { v4 as uuidv4 } from 'uuid';
import { AvurnaDropOverlay } from './AvurnaDropOverlay'; // <--- NEW IMPORT

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { FilePreview } from './FilePreview';
import { StagedFile, AttachmentRecord } from "@/components/chats/user-chat"; // Import types from user-chat

interface InputProps {
  input: string;
  handleInputChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  setInput: (value: string) => void;
  isLoading: boolean; // This prop indicates overall loading, including AI streaming
  status: string;
  stop: () => void;
  hasSentMessage: boolean;
  isDesktop: boolean;
  disabled?: boolean; // This prop indicates external disabling (e.g., offline)
  offlineState?: 'online' | 'reconnecting' | 'offline';
  onFocus?: () => void;
  user: { id: string } | null | undefined;
  chatId: string | null;
  onSendMessage: (message: string) => Promise<void>; // Updated signature
  onFileStaged: (files: StagedFile[]) => void; // New prop for staging files
  stagedFiles: StagedFile[]; // Pass staged files from parent
  setStagedFiles: React.Dispatch<React.SetStateAction<StagedFile[]>>; // Pass setter for staged files
  suggestedPrompts: string[];
}

const containerVariants = {
  hidden: { 
    opacity: 0, 
    height: 0, // Animate height to 0
    overflow: 'hidden', // Hide content during collapse
    transition: { 
      when: "afterChildren", // Animate after children exit
      duration: 0.2 
    } 
  },
  visible: {
    opacity: 1,
    height: 'auto', // Animate height to auto
    transition: {
      when: "beforeChildren", // Animate before children enter
      staggerChildren: 0.1,
      duration: 0.3
    },
  },
};

export const Textarea = forwardRef<HTMLTextAreaElement, InputProps>(({
  input,
  handleInputChange,
  setInput,
  isLoading, // Overall loading state
  status,
  stop,
  onFocus,
  hasSentMessage,
  isDesktop,
  disabled = false, // External disabled prop
  offlineState = 'online',
  onSendMessage,
  onFileStaged, // Destructure new prop
  stagedFiles, // Destructure new prop
  setStagedFiles, // Destructure new prop
  suggestedPrompts,
  user,
  chatId
}, ref) => {
  const { isSignedIn } = useUser();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const [staticPlaceholderAnimatesOut, setStaticPlaceholderAnimatesOut] = React.useState(false);
  const [currentPromptIndex, setCurrentPromptIndex] = React.useState(0);
  const [previousPromptIndex, setPreviousPromptIndex] = React.useState<number | null>(null);
  const [showAnimatedSuggestions, setShowAnimatedSuggestions] = React.useState(false);
  const [isTabToAcceptEnabled, setIsTabToAcceptEnabled] = React.useState(true);
  const [promptVisible, setPromptVisible] = React.useState(false);
  const [isFlowActive, setIsFlowActive] = React.useState(false);
  const [flowSession, setFlowSession] = React.useState<{ room: Room; roomName: string; } | null>(null);
  const [isDraggingFileOverApp, setIsDraggingFileOverApp] = React.useState(false); // Renamed for clarity

  useImperativeHandle(ref, () => textareaRef.current as HTMLTextAreaElement);

  const featureActive = isDesktop && !hasSentMessage && !isSignedIn;

  const handleTriggerUpload = () => fileInputRef.current?.click();

  const SUPPORTED_MIME_TYPES = new Set([
  // Images
  "image/png", "image/jpeg", "image/gif", "image/webp",
  
  // Documents
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "text/csv", "text/tab-separated-values",
  
  // Text/Code
  "text/plain", "text/html",
  "application/json", "application/javascript", "application/xml",
  
  // Video
  "video/mp4", "video/mpeg", "video/quicktime",
  "video/avi", "video/x-flv", "video/mpegps", "video/mpg",
  "video/webm", "video/wmv", "video/3gpp",
  
  // Audio

  "audio/x-aac", "audio/flac", "audio/mp3", "audio/m4a",
  "audio/mpeg", "audio/mpga", "audio/mp4", "audio/opus",
  "audio/pcm", "audio/wav", "audio/webm",
]);

const addFilesToStage = (files: File[]) => {
  const validFiles = files.filter(file =>
    SUPPORTED_MIME_TYPES.has(file.type)
  );
  if (validFiles.length !== files.length) {
    toast.error("Only supported images, audio, video, docs, code, and text files are allowed.");
  }

  const newFiles: StagedFile[] = validFiles.map(file => ({
    id: uuidv4(),
    file,
    previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
    isUploading: true, // Mark as uploading immediately
    uploadProgress: 0, // Set initial progress
  }));

  onFileStaged(newFiles); // Pass new files to parent for immediate upload handling
};


  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    addFilesToStage(Array.from(files));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemoveStagedFile = (idToRemove: string) => {
    setStagedFiles(currentFiles => {
      const fileToRemove = currentFiles.find(f => f.id === idToRemove);
      if (fileToRemove?.previewUrl) {
        URL.revokeObjectURL(fileToRemove.previewUrl);
      }
      return currentFiles.filter(f => f.id !== idToRemove);
    });
  };

  const handleFormSubmit = () => {
    const trimmedInput = input.trim();
    // onSendMessage now only takes messageText
    onSendMessage(trimmedInput); 
  };

  React.useEffect(() => {
    return () => {
      stagedFiles.forEach(sf => {
        if (sf.previewUrl) URL.revokeObjectURL(sf.previewUrl);
      });
    };
  }, [stagedFiles]);

  React.useEffect(() => {
    let fadeOutTimer: NodeJS.Timeout | undefined, showSuggestionsTimer: NodeJS.Timeout | undefined;
    if (featureActive && !input && suggestedPrompts.length > 0) {
      setIsTabToAcceptEnabled(true);
      setStaticPlaceholderAnimatesOut(false);
      setShowAnimatedSuggestions(false);
      setPromptVisible(false);
      fadeOutTimer = setTimeout(() => { if (featureActive && !input) setStaticPlaceholderAnimatesOut(true); }, 700);
      showSuggestionsTimer = setTimeout(() => {
        if (featureActive && !input) {
          setShowAnimatedSuggestions(true);
          setCurrentPromptIndex(0);
          setPreviousPromptIndex(null);
          setTimeout(() => setPromptVisible(true), 50);
        }
      }, 1000);
    } else {
      setStaticPlaceholderAnimatesOut(false);
      setShowAnimatedSuggestions(false);
      setPromptVisible(false);
      if (input) setIsTabToAcceptEnabled(false);
    }
    return () => { clearTimeout(fadeOutTimer); clearTimeout(showSuggestionsTimer); };
  }, [featureActive, input, suggestedPrompts]);

  React.useEffect(() => {
    let promptInterval: NodeJS.Timeout | undefined;
    if (showAnimatedSuggestions && suggestedPrompts.length > 0 && isTabToAcceptEnabled && featureActive) {
      promptInterval = setInterval(() => {
        setPromptVisible(false);
        setTimeout(() => {
          setPreviousPromptIndex(currentPromptIndex);
          setCurrentPromptIndex(prevIndex => (prevIndex + 1) % suggestedPrompts.length);
          setTimeout(() => setPromptVisible(true), 50);
        }, 300);
      }, 2000 + 300);
    }
    return () => clearInterval(promptInterval);
  }, [showAnimatedSuggestions, suggestedPrompts.length, isTabToAcceptEnabled, featureActive, currentPromptIndex]);
  
  // 👇 START: ADDED THIS HOOK TO FIX RESIZING
  React.useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto'; // Reset height to recalculate
      const scrollHeight = textarea.scrollHeight;
      textarea.style.height = `${scrollHeight}px`; // Set height to content height
    }
  }, [input, stagedFiles]); // Rerun this effect whenever the input or stagedFiles change
  // 👆 END: ADDED THIS HOOK

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (featureActive && showAnimatedSuggestions && suggestedPrompts.length > 0 && isTabToAcceptEnabled && e.key === "Tab") {
      e.preventDefault();
      const currentDynamicPromptText = suggestedPrompts[currentPromptIndex];
      if (currentDynamicPromptText) {
        setInput(currentDynamicPromptText);
        setShowAnimatedSuggestions(false);
        setIsTabToAcceptEnabled(false);
        setPromptVisible(false);
      }
      return;
    }
    if (e.key !== "Tab" && input.length === 0 && e.key.length === 1) {
      setIsTabToAcceptEnabled(false);
    }
    if (isDesktop && e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      // Only prevent sending if there's no content and it's loading (e.g., AI streaming)
      // Otherwise, allow sending even if AI is streaming to enable follow-up questions.
      if ((input.trim().length > 0 || stagedFiles.length > 0) && !isActivelyUploadingFiles && offlineState === "online") {
        handleFormSubmit();
      } else if (isLoading && (input.trim().length === 0 && stagedFiles.length === 0)) {
        // If it's loading (AI streaming) and input is empty, do nothing (don't send empty message)
        return;
      }
    }
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = event.clipboardData?.items;
    if (items) {
      const files = Array.from(items)
        .map(item => item.getAsFile())
        .filter((file): file is File => file !== null);
      if (files.length > 0) {
        event.preventDefault();
        addFilesToStage(files);
      }
    }
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    // Only show overlay if there's no content yet
    if (!hasContent) { 
      setIsDraggingFileOverApp(true);
    }
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDraggingFileOverApp(false);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDraggingFileOverApp(false);
    const droppedFiles = event.dataTransfer.files;
    if (droppedFiles && droppedFiles.length > 0) {
      addFilesToStage(Array.from(droppedFiles));
    }
  };

  const handleVoiceClick = async () => {
    // If there's content or files, send the message
    if (input.trim().length > 0 || stagedFiles.length > 0) {
        handleFormSubmit();
        return;
    }
    // Otherwise, activate Flow
    setIsFlowActive(true); 
    try {
      const response = await fetch('/api/flow/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identity: user?.id || `user-${uuidv4()}` }), });
      if (!response.ok) throw new Error(`Failed to start flow session: ${response.statusText}`);
      const { user_token, livekit_url, room_name } = await response.json(); 
      const room = new Room();
      room.on(RoomEvent.Disconnected, () => { setIsFlowActive(false); setFlowSession(null); });
      await room.connect(livekit_url, user_token);
      await room.localParticipant.setMicrophoneEnabled(true);
      setFlowSession({ room, roomName: room_name });
    } catch (error) {
      console.error("Critical error during Flow activation:", error);
      setIsFlowActive(false);
      if (flowSession?.room) { await flowSession.room.disconnect(); }
    }
  };

  const handleCloseFlow = async () => {
    if (flowSession?.room) {
      await flowSession.room.localParticipant.setMicrophoneEnabled(false);
      await flowSession.room.disconnect();
    } else {
      setIsFlowActive(false);
    }
  };

  // Modified isDisabled: Only disable if offline or actively uploading files, not during AI streaming
  const isActivelyUploadingFiles = stagedFiles.some(f => f.isUploading);
  const isDisabled = disabled || offlineState !== "online" || isActivelyUploadingFiles; 

  const hasContent = (input.trim().length > 0 || stagedFiles.length > 0);
  
  const textareaStyle = React.useMemo(() => ({ minHeight: 48, maxHeight: 200 }), []);

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
          {/* Avurna Drop Overlay */}
          <AvurnaDropOverlay isVisible={isDraggingFileOverApp && !hasContent} />

          <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" disabled={isDisabled} multiple accept="image/*,audio/*,video/*,application/pdf,text/*,.csv,.doc,.docx,.xls,.xlsx,.ppt,.pptx"/>
          <motion.div 
            layout // Added layout prop here
            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
            className="relative flex w-full flex-auto flex-col rounded-[1.8rem] border-[1px] border-zinc-500/40 dark:border-transparent dark:shadow-black/20 bg-[#ffffff] dark:bg-[#2a2a2a] focus-within:ring-1 focus-within:ring-primary/10 transition-shadow"
          >
            <AnimatePresence>
              {stagedFiles.length > 0 && (
                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                  className="flex flex-wrap gap-3 p-3"
                >
                  {stagedFiles.map(sf => (
                    <FilePreview
                      key={sf.id}
                      previewUrl={sf.previewUrl}
                      fileName={sf.file.name}
                      fileType={sf.file.type}
                      onRemove={() => handleRemoveStagedFile(sf.id)}
                      uploadProgress={sf.uploadProgress} // Pass progress
                      isUploading={sf.isUploading} // Pass uploading status
                      error={sf.error} // Pass error status
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
            <div className="relative">
              <ShadcnTextarea 
                ref={textareaRef}
                className="scrollbar-thin scrollbar-track-transparent scrollbar-thumb-zinc-900 dark:scrollbar-thumb-zinc-600 resize-none bg-transparent w-full rounded-3xl pl-5 pr-6 pt-4 pb-[2.5rem] text-base md:text-base font-normal placeholder:text-zinc-500 border-none shadow-none focus-visible:ring-0" 
                value={input} 
                autoFocus 
                onFocus={onFocus} 
                onDragOver={(e) => e.preventDefault()} // Prevents default behavior for textarea itself, letting parent handle it
                onDrop={(e) => e.preventDefault()} // Prevents default behavior for textarea itself, letting parent handle it
                onDragLeave={(e) => e.preventDefault()} // Prevents default behavior for textarea itself, letting parent handle it
                placeholder={"Ask Avurna..."} 
                // ONLY disable if offline or actively uploading files
                disabled={isDisabled} 
                style={textareaStyle} 
                onChange={handleInputChange} 
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
              />
            </div>
            
            <div className="absolute inset-x-0 bottom-0 z-10 rounded-b-[1.8rem] bg-[#ffffff] px-3 pb-2 pt-2 dark:bg-[#2a2a2a]">
              <div className="flex w-full items-center justify-between">
                <DropdownMenu onOpenChange={setIsMenuOpen}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DropdownMenuTrigger asChild disabled={isDisabled}>
                        <AttachButton isUploading={false} disabled={isDisabled} isActive={isMenuOpen} />
                      </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent side={"top"} className="select-none bg-black text-white dark:bg-white dark:text-black rounded-md font-medium shadow-lg">
                        <p>{isDisabled ? "Processing..." : "Add photos, files, and apps"}</p>
                    </TooltipContent>
                  </Tooltip>
                  <DropdownMenuContent
                    side={hasSentMessage ? "top" : "bottom"}
                    sideOffset={8}
                    align="start"
                    className="mb-1 w-56 rounded-3xl bg-white dark:bg-[#2A2A2A] dark:border dark:border-white/10 shadow-xl p-1.5"
                  >
                    <DropdownMenuItem onClick={handleTriggerUpload} className="cursor-pointer text-sm p-2 rounded-lg focus:bg-black/10 dark:focus:bg-white/10">
                      <UploadCloud className="mr-2 h-4 w-4" />
                      <span>Add photos & files</span>
                    </DropdownMenuItem>
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger className="cursor-pointer text-sm p-2 rounded-lg focus:bg-black/10 dark:focus:bg-white/10">
                        <AppWindow className="mr-2 h-4 w-4" />
                        <span>Add from apps</span>
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent
                        sideOffset={10}
                        className="w-52 rounded-xl border dark:border-zinc-700 bg-white dark:bg-[#303030] shadow-xl"
                      >
                        <DropdownMenuItem className="cursor-pointer p-2.5 focus:bg-black/10 dark:focus:bg-white/10">
                          <Database className="mr-3 h-4 w-4" />
                          <span>Google Drive</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer p-2.5 focus:bg-black/10 dark:focus:bg-white/10">
                          <Github className="mr-3 h-4 w-4" />
                          <span>GitHub</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-zinc-200 dark:bg-zinc-600" />
                        <DropdownMenuItem className="cursor-pointer p-2.5 text-sm focus:bg-black/10 dark:focus:bg-white/10">
                          ⚙️ Manage connections...
                        </DropdownMenuItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                  </DropdownMenuContent>
                </DropdownMenu>

                <div className="flex items-center">
                  {(status === "streaming" || status === "submitted") ? (
                    <motion.div key="loading-stop" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }}>
                      <button type="button" onClick={stop} className="rounded-full flex items-center justify-center bg-black dark:bg-white" style={{ width: 40, height: 40 }}><PauseIcon size={28} className="h-6 w-6 text-white dark:text-black" /></button>
                    </motion.div>
                  ) : (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <motion.button
                          type="button"
                          onClick={handleVoiceClick}
                          disabled={isDisabled}
                          className="rounded-full flex items-center justify-center bg-black dark:bg-white text-white dark:text-black cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          style={{ width: 36, height: 36 }}
                          aria-label={hasContent ? "Send" : "Activate Flow"}
                          whileHover={!isDisabled && hasContent ? { scale: 1.1 } : {}}
                          whileTap={!isDisabled && hasContent ? { scale: 0.95 } : {}}
                          transition={{ type: "spring", stiffness: 500, damping: 15 }}
                        >
                          <AnimatePresence mode="wait" initial={false}>
                            <motion.span key={hasContent ? "send" : "voice"} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: 0.15 }}>
                              {hasContent ? (hasSentMessage ? <ArrowUp size={20} /> : <ArrowRight size={20} />) : <AudioLines size={20} />}
                            </motion.span>
                          </AnimatePresence>
                        </motion.button>
                      </TooltipTrigger>
                      <TooltipContent side="top" align="center" className="select-none bg-black text-white dark:bg-white dark:text-black rounded-md font-medium">
                        <p>{hasContent ? "Send" : "Activate Flow"}</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </div>
            </div>

          </motion.div>
        </motion.div>
      </TooltipProvider>
      <AnimatePresence>
        {isFlowActive && <FlowOverlay onClose={handleCloseFlow} session={flowSession} user={user} />}
      </AnimatePresence>
    </>
  );
});
