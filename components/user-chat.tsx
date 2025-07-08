"use client";

import React from "react";
import { getDefaultModel } from "@/ai/providers";
import { Message as TMessage, useChat } from "@ai-sdk/react";
import { useEffect, useRef, useState } from "react";
import {
  Share,
  MoreHorizontal,
  Pin,
  Edit3,
  Archive,
  Download,
  Trash2
} from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { Messages } from "./messages";
import { toast } from "sonner";
import { useLiveSuggestedPrompts } from '@/hooks/use-suggested-prompts';
import { UserChatHeader } from "./user-chat-header";
import { ChatScrollAnchor } from "./chat-scroll-anchor";
import { useSidebar } from '@/lib/sidebar-context';
import { motion, AnimatePresence } from "framer-motion";
import { ScrollToBottomButton } from './scroll-to-bottom-button';
import { ChatInputArea } from "./chat-input-area";
import { DeleteChatModal } from "./delete-chat-modal";
import { RenameChatModal } from "./rename-chat-modal";
import { useChats } from '@/hooks/use-chats';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { useRouter } from "next/navigation";
import { ShareChatModal } from "./share-chat-modal";

function GreetingBanner() {
  const { user, isLoaded } = useUser();
  let displayName = "King";
  if (isLoaded && user) {
    displayName = user.firstName || user.lastName || user.username || "dear";
  }
  const hour = new Date().getHours();
  let greeting = "Hello";
  if (hour < 12) greeting = "Good morning";
  else if (hour < 18) greeting = "Good afternoon";
  else greeting = "Good evening";

  // Responsive: Move up more on mobile (center vertically)
  const [isMobile, setIsMobile] = React.useState(false);
  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // On mobile, use a much larger negative margin to center vertically
  // On desktop, keep previous spacing
  return (
    <div
      className="w-full px-4 flex flex-col items-center max-w-xl lg:max-w-[50rem]"
      style={{ marginTop: isMobile ? '-15vh' : '-20px' }}
    >
      <div className="text-3xl sm:text-4xl font-semibold text-zinc-800 dark:text-zinc-200 text-center select-none">
        {greeting}, {displayName}
      </div>
    </div>
  );
}

// --- Network/Clerk reconnect logic ---
function useReconnectToClerk() {
  const [offlineState, setOfflineState] = useState<'online' | 'reconnecting' | 'offline'>('online');
  const [hasShownReconnect, setHasShownReconnect] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setOfflineState('online');
      toast.dismiss('reconnect');
      setHasShownReconnect(false);
    };
    const handleOffline = () => {
      setOfflineState('reconnecting');
      if (!hasShownReconnect) {
        toast.loading('Connection lost. Attempting to reconnect...', { id: 'reconnect', duration: 999999 });
        setHasShownReconnect(true);
      }
    };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    if (!navigator.onLine) handleOffline();

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      toast.dismiss('reconnect');
    };
  }, [hasShownReconnect]);

  return offlineState;
}

export default function UserChat({ initialChat }: { initialChat?: any }) {
  const router = useRouter();
  const offlineState = useReconnectToClerk();
  const containerRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null) as React.RefObject<HTMLDivElement>;
  const { user, isLoaded, isSignedIn } = useUser();
  const [selectedModel, setSelectedModel] = useState<string>(() => getDefaultModel(!!isSignedIn));
  const [inputAreaHeight, setInputAreaHeight] = useState(0);
  const inputAreaRef = useRef<HTMLDivElement>(null);
  const [isDesktop, setIsDesktop] = useState<undefined | boolean>(undefined);
  const [isSubmittingSearch, setIsSubmittingSearch] = useState(false);
  const dynamicSuggestedPrompts = useLiveSuggestedPrompts();
  const { isDesktopSidebarCollapsed } = useSidebar();
  const [chatId, setChatId] = useState<string | null>(initialChat?.id ?? null);
  const [dbUser, setDbUser] = useState<any>(null);
  const [chatTitle, setChatTitle] = useState(initialChat?.title || "New Chat");
  const { mutateChats, updateChatTitle, deleteChat } = useChats();
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);
  // --- REF TO TRACK PREVIOUS STATUS ---
  // This helps us detect the transition from 'streaming' to 'ready'
  const prevStatusRef = useRef<string | null>(null);
  const [predictivePrompts, setPredictivePrompts] = useState<string[]>([]);
  const [isPredicting, setIsPredicting] = useState(false);
  const [isPredictiveVisible, setIsPredictiveVisible] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);

  // --- FIX: ADD STATE FOR THE DELETE MODAL ---
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // --- FIX: ADD STATE FOR RENAME MODAL AND LOGIC ---
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);


  const MAX_COMPLETION_INPUT_LENGTH = 90;

  // --- Compose user info for backend ---
  const userInfo = isLoaded && user ? {
    firstName: user.firstName || user.username || '',
    email: user.emailAddresses?.[0]?.emailAddress || user.primaryEmailAddress?.emailAddress || '',
  } : undefined;

  // --- NEW useEffect TO SYNC USER ---
  useEffect(() => {
    // This function ensures the user exists in our DB when the component mounts
    const syncUser = async () => {
      if (isSignedIn) {
        try {
          const response = await fetch('/api/user', { method: 'POST' });
          if (!response.ok) throw new Error("Failed to sync user");
          const userData = await response.json();
          setDbUser(userData); // Save the confirmed user from our DB
        } catch (error) {
          console.error("User sync error:", error);
          toast.error("There was an issue loading your profile.");
        }
      }
    };
    syncUser();
  }, [isSignedIn]); // Run this effect whenever the sign-in state changes


  // Update selectedModel if sign-in state changes
  useEffect(() => {
    setSelectedModel(getDefaultModel(!!isSignedIn));
  }, [isSignedIn]);

  const generateAndSyncTitle = async (currentChatId: string, firstMessageContent: string) => {
    setIsGeneratingTitle(true);
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generateTitle', messages: [{ role: 'user', content: firstMessageContent }] }),
      });
      if (!response.ok) throw new Error('Title generation failed');
      const data = await response.json();

      if (data.title) {
        document.title = data.title;
        setChatTitle(data.title);
        updateChatTitle(currentChatId, data.title);

        await fetch(`/api/chats/${currentChatId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: data.title }),
        });
      }
    } catch (error) {
      console.error("Error generating and syncing title:", error);
    } finally {
      setIsGeneratingTitle(false);
    }
  };

  const {
    messages,
    input,
    handleInputChange,
    setInput,
    status,
    setMessages,
    stop,
    append,
  } = useChat({
    api: '/api/chat',
    maxSteps: 5,
    body: { selectedModel, user: dbUser ? { ...dbUser } : undefined },
    initialMessages: initialChat?.messages || [],
    id: chatId ?? undefined,
    // --- REMOVED onFinish ---
    // The new useEffect below is a more reliable way to handle saving the chat.
    onError: (error) => {
      toast.error(error.message || "An error occurred.", { position: "top-center", richColors: true });
      setSelectedModel(getDefaultModel(!!isSignedIn));
      setIsSubmittingSearch(false);
    },
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!dbUser?.id) {
      toast.error("User not loaded yet, please wait!");
      return;
    }
    const trimmedInput = input.trim();
    if (!trimmedInput) return;

    if (!chatId) {
      // For a new chat, we need to create the chat in the DB first
      // to get a persistent ID before appending to the AI SDK.
      const userMessage: TMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: trimmedInput,
      };

      const tempTitle = trimmedInput.substring(0, 50);

      try {
        // 1. Create the chat in the database immediately.
        const response = await fetch('/api/chats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [userMessage], // Save the first user message
            userId: dbUser.id,
            title: tempTitle,
          }),
        });
        if (!response.ok) throw new Error("Failed to create chat in database.");

        const newChat = await response.json();
        const newPersistentId = newChat.id;

        // 2. Update UI state with the real ID and title.
        setChatId(newPersistentId);
        setChatTitle(tempTitle);
        document.title = tempTitle;
        window.history.replaceState({}, '', `/chat/${newPersistentId}`);

        // 3. Optimistically update the sidebar with the placeholder title.
        mutateChats((currentPagesData = []) => {
          const newChatSummary = {
            id: newPersistentId,
            title: 'New Chat', // Use the placeholder title for the typewriter effect
            isOptimistic: true,
          };
          const firstPage = currentPagesData[0] || { chats: [] };
          const newFirstPage = {
            ...firstPage,
            chats: [newChatSummary, ...firstPage.chats],
          };
          return [newFirstPage, ...currentPagesData.slice(1)];
        }, false);

        // 4. Append the message to the AI SDK to trigger the stream.
        // The `useChat` hook's `id` prop is now `newPersistentId`.
        append(userMessage);
        setInput('');

        // 5. Generate the real title in the background.
        await generateAndSyncTitle(newPersistentId, trimmedInput);

      } catch (error) {
        toast.error("Could not create new chat. Please try again.");
        return; // Stop execution if chat creation fails.
      }

    } else {
      // For existing chats, just append the message.
      append({ id: crypto.randomUUID(), role: 'user', content: trimmedInput });
      setInput('');
    }
  };


  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const uiIsLoading = status === "streaming" || status === "submitted" || isSubmittingSearch || isGeneratingTitle;

  // Create a ref to "snapshot" whether this is an existing chat on the initial render.
  // The `!!initialChat` converts the prop into a boolean.
  const isExistingChat = useRef(!!initialChat);

  useEffect(() => {
    // Add a guard clause at the very top of the effect.
    // If our ref says this is an existing chat, stop immediately.
    if (isExistingChat.current) {
      return;
    }

    if (!isDesktop) return;

    const controller = new AbortController();

    if (
      !input.trim() ||
      input.trim().length < 3 ||
      input.trim().length > MAX_COMPLETION_INPUT_LENGTH
    ) {
      setPredictivePrompts([]);
      return; // This now also stops the API call for long inputs
    }

    const handler = setTimeout(async () => {
      setIsPredicting(true);
      try {
        const response = await fetch('/api/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ input }),
          signal: controller.signal,
        });
        if (!response.ok) throw new Error('Failed to fetch completions');
        const data = await response.json();
        setPredictivePrompts(data.completions || []);
        setIsPredictiveVisible(true);
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error("Error fetching predictive prompts:", error);
          setPredictivePrompts([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsPredicting(false);
        }
      }
    }, 150);

    return () => {
      clearTimeout(handler);
      controller.abort();
    };
  }, [input, isDesktop]);

  const hasSentMessage = messages.length > 0;

  // Construct the user object for the preview
  const authorInfo = {
    username: user?.username || user?.firstName || 'Anonymous',
    profilePic: user?.imageUrl || null,
    firstname: user?.firstName
  };

  useEffect(() => {
    const element = inputAreaRef.current;
    if (!element) return;
    const observer = new ResizeObserver(() => {
      setInputAreaHeight(element.offsetHeight);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [hasSentMessage]);

  const chatInputAreaProps = {
    handleSubmit,
    predictivePrompts,
    input,
    setInput: (newInput: string) => {
      setInput(newInput);
      setPredictivePrompts([]);
      setIsPredictiveVisible(true);
    },
    handleInputChange,
    isPredicting,
    uiIsLoading,
    status,
    stop,
    hasSentMessage,
    isDesktop: !!isDesktop,
    selectedModel,
    setSelectedModel,
    dynamicSuggestedPrompts,
    isPredictiveVisible,
    setIsPredictiveVisible,
    disabled: offlineState !== 'online',
    offlineState: offlineState
  };


  // --- THIS IS THE FIX: Save the complete chat when the stream is finished ---
  useEffect(() => {
    // We only want to save when the stream has just finished.
    // The condition `prevStatusRef.current === 'streaming'` ensures this.
    // The `useChat` hook status transitions from 'streaming' to 'ready' when complete.
    if (prevStatusRef.current === 'streaming' && status === 'ready') {
      // Guard against running on empty chats or before chatId is set.
      // `messages.length < 2` ensures we have both user and AI message.
      if (!chatId || messages.length < 2) {
        return;
      }

      const saveChat = async () => {
        try {
          await fetch(`/api/chats/${chatId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            // At this point, `messages` is guaranteed to contain the full assistant response.
            body: JSON.stringify({ messages: messages, title: chatTitle }),
          });
          // Refresh the chat list in the sidebar to reflect the latest state.
          mutateChats();
        } catch {
          toast.error("Could not save the conversation.");
        }
      };

      saveChat();
    }
    // Update the ref to the current status for the next render cycle.
    prevStatusRef.current = status;
  }, [status, messages, chatId, chatTitle, mutateChats]); // Dependencies ensure reactivity

  // --- FIX #2: The Scroll Listener ---
  useEffect(() => {
    const mainEl = containerRef.current;
    if (!mainEl) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = mainEl;
      const isAtBottom = scrollHeight - scrollTop - clientHeight <= 1;
      // This is a much simpler and more robust way to set the state.
      // It doesn't depend on the previous state, avoiding closure issues.
      setShowScrollButton(!isAtBottom);
    };

    mainEl.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      mainEl.removeEventListener('scroll', handleScroll);
    };
    // The dependency array is now empty, so the listener is only attached once.
  }, []);

  const handleScrollToBottom = () => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // This function is called when the user clicks "Delete" in the modal.
  const handleDelete = async () => {
    if (!chatId) return;

    // Set the button state to "Deleting..."
    setIsDeleting(true);

    // --- IMMEDIATE ACTIONS (OPTIMISTIC UI) ---
    // 1. Instantly navigate the user to the root page. This is the top priority.
    router.push('/chat');

    // 2. Optimistically remove the chat from the sidebar list.
    deleteChat(chatId);

    // 3. Close the modal (though the component is unmounting anyway).
    setShowDeleteModal(false);

    // --- BACKGROUND ACTION (SERVER) ---
    // The user has already been redirected. This happens silently.
    try {
      const response = await fetch(`/api/chats/${chatId}`, { method: 'DELETE' });
      if (!response.ok) {
        // We can still show an error toast if the server fails.
        // Your `useChats` hook should handle reverting the optimistic state if needed.
        toast.error('Server failed to delete chat. It may reappear on refresh.');
      } else {
        toast.success("Chat deleted successfully.");
      }
    } catch (error) {
      toast.error("An error occurred while deleting the chat on the server.");
    }
    // No 'finally' block needed to reset isDeleting, as the component is gone.
  };

  const handleRename = async (newTitle: string) => {
    if (!chatId) return;

    setIsRenaming(true);
    const originalTitle = chatTitle; // Store original title for rollback

    try {
      // 1. IMMEDIATE OPTIMISTIC UPDATE (both header and sidebar)
      setChatTitle(newTitle); // Update header state
      updateChatTitle(chatId, newTitle, true); // Update sidebar state
      setShowRenameModal(false);

      // 2. BACKGROUND DATABASE UPDATE
      const response = await fetch(`/api/chats/${chatId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle }),
      });

      if (!response.ok) throw new Error("Failed to rename chat");

      // 3. SUCCESS - Finalize the update (remove optimistic flag)
      updateChatTitle(chatId, newTitle, false);
      mutateChats(); // Revalidate the list to be sure

    } catch (error) {
      toast.error("Failed to rename chat");
      // Rollback on failure
      setChatTitle(originalTitle);
      updateChatTitle(chatId, originalTitle, false);
    } finally {
      setIsRenaming(false);
    }
  };

  return (
    <div
      className="relative flex h-screen w-full flex-col overflow-hidden bg-background"
      style={{ '--input-area-height': `${inputAreaHeight}px` } as React.CSSProperties}
    >
      <UserChatHeader>
        {hasSentMessage ? (
          // --- THIS IS THE FINAL, POLISHED VERSION ---
          <div className="flex items-center justify-between">
            <span className="text-base font-medium text-zinc-900 dark:text-white truncate">
              {chatTitle}
            </span>
            {/* FIX: Increased gap for better spacing */}
            <div className="flex items-center gap-2">
              <button disabled={!chatId} onClick={() => setShowShareModal(true)} className="flex rounded-3xl cursor-pointer items-center gap-1.5 px-3 py-2 text-sm font-medium text-zinc-900 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                <Share size={15} />
                <span className="hidden sm:inline">Share</span>
              </button>
              {/* --- THIS IS THE FIX: The "Manage" Dropdown Menu --- */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="p-2 cursor-pointer rounded-lg text-zinc-600 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                    <MoreHorizontal size={16} />
                  </button>
                </DropdownMenuTrigger>
                {/* Reusing the perfectly styled dropdown from the sidebar */}
                <DropdownMenuContent
                  align="end"
                  sideOffset={8}
                  className="w-48 bg-white dark:bg-[#282828] p-2 shadow-xl border border-zinc-200/80 dark:border-zinc-700/80 rounded-2xl"
                >
                  <DropdownMenuItem onSelect={() => toast.info("Pin feature coming soon!")} className="flex items-center gap-3 cursor-pointer px-2 py-2 text-sm rounded-lg focus:bg-zinc-100 dark:focus:bg-zinc-700/50">
                    <Pin size={15} className="text-zinc-500" />
                    <span>Pin Chat</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setShowRenameModal(true)} className="flex items-center gap-3 cursor-pointer px-2 py-2 text-sm rounded-lg focus:bg-zinc-100 dark:focus:bg-zinc-700/50">
                    <Edit3 size={15} className="text-zinc-500" />
                    <span>Rename</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-zinc-200/80 dark:bg-zinc-700/60 my-1 mx-1.5" />
                  <DropdownMenuItem onSelect={() => toast.info("Export feature coming soon!")} className="flex items-center gap-3 cursor-pointer px-2 py-2 text-sm rounded-lg focus:bg-zinc-100 dark:focus:bg-zinc-700/50">
                    <Download size={15} className="text-zinc-500" />
                    <span>Export Chat</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-zinc-200/80 dark:bg-zinc-700/60 my-1 mx-1.5" />
                  <DropdownMenuItem onSelect={() => toast.info("Archive feature coming soon!")} className="flex items-center gap-3 cursor-pointer px-2 py-2 text-sm rounded-lg focus:bg-zinc-100 dark:focus:bg-zinc-700/50">
                    <Archive size={15} className="text-zinc-500" />
                    <span>Archive</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setShowDeleteModal(true)} className="flex items-center gap-3 cursor-pointer px-2 py-2 text-sm rounded-lg text-red-600 dark:text-red-500 focus:bg-red-500/10 focus:text-red-600 dark:focus:text-red-500">
                    <Trash2 size={15} className="text-red-600 dark:text-red-500" />
                    <span>Delete</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ) : (
          // This part remains unchanged
          <AnimatePresence>
            {isDesktop && isDesktopSidebarCollapsed && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0, transition: { delay: 0.2 } }}
                exit={{ opacity: 0, x: -10, transition: { duration: 0.2 } }}
                className="text-[20px] font-leading select-none mt-1 font-medium text-zinc-900 dark:text-white"
                style={{
                  lineHeight: '22px',
                  fontFamily: 'Google Sans, "Helvetica Neue", sans-serif',
                  letterSpacing: 'normal',
                }}
              >
                Avurna
              </motion.span>
            )}
          </AnimatePresence>
        )}
      </UserChatHeader>
      
      {/* --- FIX: RENDER THE DELETE MODAL --- */}
      <DeleteChatModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        chatTitle={chatTitle}
        isDeleting={isDeleting}
      />

      <RenameChatModal
        isOpen={showRenameModal}
        onClose={() => setShowRenameModal(false)}
        onConfirm={handleRename}
        currentTitle={chatTitle}
        isRenaming={isRenaming}
      />

      {/* --- FIX: Pass the full chat data to the ShareChatModal --- */}
      {/* We use `initialChat` here which contains the persisted state from the DB */}
      {chatId && (
        <ShareChatModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          chatId={chatId}
          chatTitle={chatTitle}
          chat={{
            messages: messages,
            user: authorInfo,
            // Pass the persisted state, not the modal's internal state
            visibility: initialChat?.visibility || 'private',
            isLiveSynced: initialChat?.isLiveSynced || false,
            updatedAt: initialChat?.updatedAt || new Date().toISOString(),
          }}
        />
      )}

      <main
        ref={containerRef}
        className={"absolute inset-0 overflow-y-auto"}
        style={{
          paddingTop: '5rem',
          paddingBottom: hasSentMessage ? `${inputAreaHeight + 16}px` : '0px',
        }}
      >
        {!hasSentMessage ? (
          // THIS IS THE FIX:
          // Mobile (default): `items-center` vertically centers the content.
          // Desktop (`sm:`): `sm:items-start` overrides this, and `sm:pt-[20vh]` pushes it down for the "above-center" look.
          <div className="flex h-full items-center justify-center sm:items-start sm:pt-[20vh]">
            <div className="w-full px-4 flex flex-col items-center gap-8 max-w-xl lg:max-w-[50rem]">
              <GreetingBanner />
              {isDesktop && (
                <div className="w-full max-w-4xl mx-auto">
                  <ChatInputArea {...chatInputAreaProps} />
                </div>
              )}
            </div>
          </div>
        ) : (
          <Messages
            messages={messages}
            isLoading={uiIsLoading}
            status={status as any}
            endRef={endRef}
          />
        )}
        <ChatScrollAnchor containerRef={containerRef} />
        <div ref={endRef} />
      </main>

      {/* The mobile input form is only rendered here, outside the main content flow */}
      {!isDesktop && !hasSentMessage && (
        <div ref={inputAreaRef} className="fixed bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-background via-background to-transparent pointer-events-none">
          <div className="w-full max-w-[50rem] mx-auto px-2 sm:px-4 pt-12 pb-1 sm:pt-16 sm:pb-2 pointer-events-auto" style={{ marginBottom: '12px' }}>
            {/* The outer form is removed. ChatInputArea handles its own submission. */}
            {/* The div is kept for positioning if needed, but the form tag must go. */}
            <div className="w-full relative z-10">
              <ChatInputArea {...chatInputAreaProps} />
            </div>
          </div>
        </div>
      )}
      {/* This input form is for when a message has been sent (on all screen sizes) */}
      {hasSentMessage && (
        <>
          <motion.div
            initial={false}
            ref={inputAreaRef}
            animate={{ left: isDesktop ? (isDesktopSidebarCollapsed ? '3.5rem' : '16rem') : '0rem' }}
            transition={{ type: 'tween', ease: 'easeInOut', duration: 0.3 }}
            className="fixed bottom-0 right-0 z-10 bg-gradient-to-t from-background via-background to-transparent pointer-events-none"
          >
            <div className="w-full max-w-[50rem] mx-auto px-2 sm:px-4 pt-12 pb-1 sm:pt-16 sm:pb-2 pointer-events-auto" style={{ marginBottom: '12px' }}>
              <ChatInputArea {...chatInputAreaProps} />

              {/* --- FIX #1: Render the button here, so it's fixed relative to the viewport --- */}
              <ScrollToBottomButton
                isVisible={showScrollButton && hasSentMessage}
                onClick={handleScrollToBottom}
              />
            </div>
          </motion.div>
          <motion.div
            initial={false}
            animate={{ left: isDesktop ? (isDesktopSidebarCollapsed ? '3.5rem' : '16rem') : '0rem' }}
            transition={{ type: 'tween', ease: 'easeInOut', duration: 0.3 }}
            className="fixed right-0 bottom-0 z-40 text-center pb-2 pointer-events-none"
          >
            <span className="text-xs text-zinc-600 dark:text-zinc-300 px-4 py-0.5 select-none rounded-xl pointer-events-auto">
              Avurna uses AI. Double check response.
            </span>
          </motion.div>
        </>
      )}
    </div>
  );
}