"use client";

import React from "react";
import { getDefaultModel } from "@/ai/providers";
import { Message as TMessage, useChat } from "@ai-sdk/react"; // Import Message type
import { useEffect, useRef, useState } from "react";
import { Textarea as CustomTextareaWrapper } from "./textarea";
import { useUser } from "@clerk/nextjs";
import { Messages } from "./messages";
import { toast } from "sonner";
import { useLiveSuggestedPrompts } from '@/hooks/use-suggested-prompts';
import { UserChatHeader } from "./user-chat-header";
import { ChatScrollAnchor } from "./chat-scroll-anchor";
import { useSidebar } from '@/lib/sidebar-context';
import { motion } from "framer-motion";
import { useChats, ChatSummary } from '@/hooks/use-chats';
import { useRouter } from 'next/navigation';



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
  const router = useRouter();

  const { mutateChats } = useChats();
  // --- THIS REF IS THE KEY TO THE FIX ---
  // We'll use a ref to hold the generated title so onFinish can access it.
  const generatedTitleRef = useRef<string | null>(null);
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);
  // This ref will hold the user's message that initiated the current stream
  const lastUserMessageRef = useRef<TMessage | null>(null);

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
    status,
    setMessages,
    stop,
    append,
    reload
  } = useChat({
    api: '/api/chat',
    maxSteps: 5,
    body: { selectedModel, user: userInfo, userId: dbUser?.id },
    initialMessages: initialChat?.messages || [],
    id: chatId ?? undefined, // Pass the chat ID to the hook (undefined if null)
    // --- THIS IS THE NEW, UPGRADED onFinish HANDLER ---
    onFinish: async (assistantMessage) => {
      if (!dbUser?.id) return; // Don't save if we don't have a confirmed user
      
      // 1. Get the user message that started this interaction from our ref.
      const userMessage = lastUserMessageRef.current;

      if (!userMessage) {
        // This case should not happen in normal flow, but it's a good safeguard.
        console.error("Could not find the user message that triggered this onFinish event.");
        return;
      }


      const finalMessages = [...messages, userMessage, assistantMessage];
   
      const finalTitle = generatedTitleRef.current || initialChat?.title || document.title || 'New Chat';

      const sanitizedMessages = finalMessages.map(m => ({
        id: m.id,
        role: m.role,
        content: m.content,
        parts: m.parts,
        createdAt: m.createdAt,
      }));

      try {
        let response;
        let currentChatId = chatId || initialChat?.id;

        if (currentChatId) {
          // --- UPDATE an existing chat ---
          response = await fetch(`/api/chats/${currentChatId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: finalMessages, title: finalTitle }),
          });
        } else {
          // --- CREATE LOGIC (THE FIX) ---
          response = await fetch('/api/chats', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            // 2. Send the title along with the messages.
            body: JSON.stringify({ 
              messages: finalMessages, 
              userId: dbUser.id,
              title: finalTitle 
            }),
          });
        }

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to save or update chat");
        }

        // After the first successful save, we have a real ID.
        if (!currentChatId) {
            const newChatData: ChatSummary = await response.json();
            currentChatId = newChatData.id;
            // No more window.history! Use the router.
            // The router.replace will update the URL without a hard navigation,
            // but it's enough to trigger the [id]/page.tsx to take over.
            router.replace(`/chat/${currentChatId}`, { scroll: false });
        }

        // Always refresh the sidebar to get the final, correct state from the server.
        // --- THIS IS THE FIX ---
        // Re-fetch the chat list but prevent the current component from re-rendering.
        // This updates the sidebar without "kicking out" the user.
        mutateChats();
        generatedTitleRef.current = null; // Reset the ref for the next new chat
        lastUserMessageRef.current = null; // Clear the ref

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

  

  // This effect handles the initial load AND a key change correctly.
  useEffect(() => {
    if (initialChat) {
      setMessages(initialChat.messages || []);
      setChatId(initialChat.id);
      document.title = initialChat.title || 'Chat';
    }
  }, [initialChat, setMessages]); // Add setMessages to dependency array

  // Set the chat ID state from the initial prop
  useEffect(() => {
    if (initialChat?.id) {
      setChatId(initialChat.id);
    }
  }, [initialChat]);

   // --- SIMPLIFIED handleSubmit ---
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmedInput = input.trim();
    if (!trimmedInput) return;

    

    // --- Fire-and-forget title generation ---
    const prepareNewChat = async () => {
      // This is the first message of a new chat.
      if (!chatId && messages.length === 0) {
        setIsGeneratingTitle(true); // Start the loading spinner

        // Optimistically add to sidebar immediately.
        mutateChats(
          (currentData = []) => [{ id: `temp-${Date.now()}`, title: 'New Chat', isOptimistic: true }, ...currentData],
          false
        );
        
        // Generate the title but DO NOT wait for it.
        await generateAndSetTitle(trimmedInput);
        generatedTitleRef.current = document.title;
        
        setIsGeneratingTitle(false); // Stop the loading spinner
      }
    };
    
    // Run the preparation in the background.
    prepareNewChat();

    // Create the user message object
      const userMessage: TMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: trimmedInput,
        data: { imageUrl: user?.imageUrl || null }
      };

    // Store it in our ref immediately before calling append
    lastUserMessageRef.current = userMessage;

    // 3. Append the message to the UI and let useChat handle the rest.
    append(userMessage);
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
} // code