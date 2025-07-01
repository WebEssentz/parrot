"use client";

import React from "react";
import { getDefaultModel } from "@/ai/providers";
import { Message, useChat } from "@ai-sdk/react";
import { useEffect, useRef, useState, useCallback } from "react";
import { Textarea as CustomTextareaWrapper } from "./textarea";
import { useUser } from "@clerk/nextjs";
import { Messages } from "./messages";
import { toast } from "sonner";
import { useLiveSuggestedPrompts } from '@/hooks/use-suggested-prompts';
import { UserChatHeader } from "./user-chat-header";
import { ChatScrollAnchor } from "./chat-scroll-anchor";
import { SuggestedPrompts } from "./suggested-prompts";
import { useSidebar } from '@/lib/sidebar-context'; // <-- 1. Import useSidebar
import { motion } from "framer-motion";
import { message } from "@/lib/db/schema";



// GreetingBanner component for personalized greeting
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



// Robust title generation: only set title if backend says message is clear
async function generateAndSetTitle(firstUserMessageContent: string) {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'generateTitle', messages: [{ role: 'user', content: firstUserMessageContent }] }),
    });
    if (!response.ok) throw new Error(`Title generation failed: ${response.statusText}`);
    const data = await response.json();
    if (data.title) {
      document.title = data.title;
    }
  } catch (error) {
    console.error("Error generating title:", error);
  }
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
  const offlineState = useReconnectToClerk();
  const containerRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null) as React.RefObject<HTMLDivElement>; // For auto-scroll on send
  const { user, isLoaded, isSignedIn } = useUser();
  const [selectedModel, setSelectedModel] = useState<string>(() => getDefaultModel(!!isSignedIn));
  const [inputAreaHeight, setInputAreaHeight] = useState(0);
  const inputAreaRef = useRef<HTMLDivElement>(null);
  const [isDesktop, setIsDesktop] = useState<undefined | boolean>(undefined);
  const [isSubmittingSearch, setIsSubmittingSearch] = useState(false);
  const [pendingMessages, setPendingMessages] = useState<any[]>([]);
  const dynamicSuggestedPrompts = useLiveSuggestedPrompts();
  const { isDesktopSidebarCollapsed } = useSidebar(); // <-- 2. Get the state from sidebar
  const [chatId, setChatId] = useState<string | null>(null);
  const [dbUser, setDbUser] = useState<any>(null); // State to hold our confirmed DB user 

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

  const {
    messages,
    input,
    handleInputChange,
    setInput,
    handleSubmit: originalHandleSubmit,
    status,
    stop,
    append
  } = useChat({
    api: '/api/chat',
    maxSteps: 5,
    body: { selectedModel, user: userInfo, userId: dbUser?.id },
    initialMessages: initialChat?.messages || [],
    id: initialChat?.id, // Pass the chat ID to the hook
    // --- THIS IS THE NEW, UPGRADED onFinish HANDLER ---
    onFinish: async (assistantMessage) => {
      if (!dbUser?.id) return; // Don't save if we don't have a confirmed user

      const finalMessages = [...messages, assistantMessage];

      const sanitizedMessages = finalMessages.map(m => ({
        id: m.id,
        role: m.role,
        content: m.content,
        parts: m.parts,
        createdAt: m.createdAt,
      }));

      try {
        let response;

        if (chatId) {
          // --- UPDATE an existing chat ---
          response = await fetch(`/api/chats/${chatId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: sanitizedMessages }),
          });
        } else {
          // --- CREATE LOGIC (THE FIX) ---
          
          // 1. Read the title that was set by `generateAndSetTitle`.
          const chatTitle = document.title || "New Chat";
          
          response = await fetch('/api/chats', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            // 2. Send the title along with the messages.
            body: JSON.stringify({ 
              messages: sanitizedMessages, 
              userId: dbUser.id,
              title: chatTitle 
            }),
          });
        }

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to save or update chat");
        }

        if (!chatId) {
          const newChatData = await response.json();
          if (newChatData?.id) {
            setChatId(newChatData.id);
            window.history.pushState(null, '', `/chat/${newChatData.id}`);
            // The document title is already set, so no need to set it again.
          }
        }

      } catch (error) {
        console.error("Save/Update Chat Error:", error);
        toast.error("Could not save the conversation.");
      }
      setSelectedModel(getDefaultModel(!!isSignedIn));
      setIsSubmittingSearch(false);
    },
    onError: (error) => {
      toast.error(error.message || "An error occurred.", { position: "top-center", richColors: true });
      setSelectedModel(getDefaultModel(!!isSignedIn));
      setIsSubmittingSearch(false);
    },
  });

   // --- NEW: useEffect to set title on initial load ---
  useEffect(() => {
    if (initialChat?.title) {
      document.title = initialChat.title;
    }
  }, [initialChat]);

  // Set the chat ID state from the initial prop
  useEffect(() => {
    if (initialChat?.id) {
      setChatId(initialChat.id);
    }
  }, [initialChat]);

   // Remove the old useCallback handleSubmit.
  // This is the new, single handleSubmit function.
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmedInput = input.trim();
    if (!trimmedInput) return;

    if (!chatId) {
      generateAndSetTitle(trimmedInput); 
    }

    append({
      id: crypto.randomUUID(),
      role: 'user',
      content: trimmedInput,
      data: { imageUrl: user?.imageUrl || null }
    }, {
      body: { selectedModel }
    });

    setInput('');
  };

  const mergedMessages = [...messages, ...pendingMessages.map(msg => ({ id: msg.id, role: 'user' as const, content: msg.content, pending: true, status: msg.status || 'pending' }))];
  const hasSentMessage = mergedMessages.length > 0;

  useEffect(() => {
    const element = inputAreaRef.current;
    if (!element) return;
    const observer = new ResizeObserver(() => {
      setInputAreaHeight(element.offsetHeight);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [hasSentMessage]);

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const uiIsLoading = status === "streaming" || status === "submitted" || isSubmittingSearch;

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-background">
      <UserChatHeader />

      <main
        ref={containerRef}
        className={`flex-1 w-full scroll-container ${hasSentMessage ? 'overflow-y-auto' : 'overflow-y-hidden'
          }`}
        style={{
          paddingTop: '80px',
          paddingBottom: hasSentMessage ? `calc(${inputAreaHeight}px)` : '0px',
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
                <form onSubmit={handleSubmit} className="w-full max-w-4xl mx-auto">
                  <CustomTextareaWrapper
                    selectedModel={selectedModel}
                    setSelectedModel={setSelectedModel}
                    handleInputChange={handleInputChange}
                    setInput={setInput}
                    input={input}
                    isLoading={uiIsLoading}
                    status={status}
                    stop={stop}
                    hasSentMessage={hasSentMessage}
                    isDesktop={!!isDesktop}
                    disabled={offlineState !== 'online'}
                    offlineState={offlineState}
                    suggestedPrompts={dynamicSuggestedPrompts}
                  />
                </form>
              )}
            </div>
          </div>
        ) : (
          <Messages
            messages={mergedMessages}
            isLoading={uiIsLoading}
            status={status as any}
            endRef={endRef}
          />
        )}
        <ChatScrollAnchor containerRef={containerRef} />
        {/* End ref for auto-scroll on send */}
        <div ref={endRef} />
      </main>

      {/* The mobile input form is only rendered here, outside the main content flow */}
      {!isDesktop && !hasSentMessage && (
        <div ref={inputAreaRef} className="fixed bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-background via-background to-transparent pointer-events-none">
          <div className="w-full max-w-[50rem] mx-auto px-2 sm:px-4 pt-12 pb-1 sm:pt-16 sm:pb-2 pointer-events-auto" style={{ marginBottom: '12px' }}>
            <form onSubmit={handleSubmit} className="w-full relative z-10">
              <CustomTextareaWrapper
                selectedModel={selectedModel}
                setSelectedModel={setSelectedModel}
                handleInputChange={handleInputChange}
                setInput={setInput}
                input={input}
                isLoading={uiIsLoading}
                status={status}
                stop={stop}
                hasSentMessage={hasSentMessage}
                isDesktop={false}
                disabled={offlineState !== 'online'}
                offlineState={offlineState}
                suggestedPrompts={dynamicSuggestedPrompts}
              />
            </form>
          </div>
        </div>
      )}

      {/* This input form is for when a message has been sent (on all screen sizes) */}
      {hasSentMessage && (
        <>
          <motion.div
            initial={false}
            ref={inputAreaRef}
            // Use Framer Motion's animate prop instead of className for the position
            animate={{ left: isDesktop ? (isDesktopSidebarCollapsed ? '4rem' : '16rem') : '0rem' }}
            transition={{ type: 'tween', ease: 'easeInOut', duration: 0.3 }}
            className="fixed bottom-0 right-0 z-10 bg-gradient-to-t from-background via-background to-transparent pointer-events-none"
          >
            <div className="w-full max-w-[50rem] mx-auto px-2 sm:px-4 pt-12 pb-1 sm:pt-16 sm:pb-2 pointer-events-auto" style={{ marginBottom: '12px' }}>
              <form onSubmit={handleSubmit} className="w-full relative z-10">
                <CustomTextareaWrapper
                  selectedModel={selectedModel}
                  setSelectedModel={setSelectedModel}
                  handleInputChange={handleInputChange}
                  setInput={setInput}
                  input={input}
                  isLoading={uiIsLoading}
                  status={status}
                  stop={stop}
                  hasSentMessage={hasSentMessage}
                  isDesktop={!!isDesktop}
                  disabled={offlineState !== 'online'}
                  offlineState={offlineState}
                  suggestedPrompts={dynamicSuggestedPrompts}
                />
              </form>
            </div>
          </motion.div>
          <motion.div
            initial={false}
            animate={{ left: isDesktop ? (isDesktopSidebarCollapsed ? '4rem' : '16rem') : '0rem' }}
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