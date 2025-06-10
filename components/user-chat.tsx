"use client";

import React from "react";
import { useMobile } from "../hooks/use-mobile";
import { defaultModel } from "@/ai/providers";
import { SEARCH_MODE } from "@/components/ui/textarea";
import { useChat } from "@ai-sdk/react";
import { useEffect, useRef, useState, useCallback } from "react";
import { Textarea as CustomTextareaWrapper } from "./textarea";
import { useUser } from "@clerk/nextjs";
import { Messages } from "./messages";
import { toast } from "sonner";
import { UserChatHeader } from "./user-chat-header";
import { ChatScrollAnchor } from "./chat-scroll-anchor";

// --- Helper Components & Hooks (No changes needed) ---
function GreetingBanner() {
  const { user, isLoaded } = useUser();
  let displayName = "King";
  if (isLoaded && user) {
    displayName = user.firstName || user.username || "dear";
  }
  const hour = new Date().getHours();
  let greeting = "Hello";
  if (hour < 12) greeting = "Good morning";
  else if (hour < 18) greeting = "Good afternoon";
  else greeting = "Good evening";
  return (
    <div className="w-full px-4 pb-4 sm:pb-10 flex flex-col items-center max-w-xl lg:max-w-[50rem]" style={{ marginTop: '-60px' }}>
      <div className="text-3xl sm:text-4xl font-semibold text-zinc-800 dark:text-zinc-200 text-center select-none">
        {greeting}, {displayName}
      </div>
    </div>
  );
}

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

export default function UserChat() {
  const offlineState = useReconnectToClerk();
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedModel, setSelectedModel] = useState<string>(defaultModel);
  const [inputAreaHeight, setInputAreaHeight] = useState(0);
  const inputAreaRef = useRef<HTMLDivElement>(null);
  const [isDesktop, setIsDesktop] = useState<undefined | boolean>(undefined);
  const [isSubmittingSearch, setIsSubmittingSearch] = useState(false);
  const [pendingMessages, setPendingMessages] = useState<any[]>([]);

  const {
    messages,
    input,
    handleInputChange,
    setInput,
    handleSubmit: originalHandleSubmit,
    status,
    stop,
  } = useChat({
    api: '/api/chat',
    maxSteps: 5,
    body: { selectedModel },
    initialMessages: [],
    onFinish: () => {
      setSelectedModel(defaultModel);
      setIsSubmittingSearch(false);
    },
    onError: (error) => {
      toast.error(error.message || "An error occurred.", { position: "top-center", richColors: true });
      setSelectedModel(defaultModel);
      setIsSubmittingSearch(false);
    },
  });

  const handleSubmit = useCallback((e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim()) return;
    originalHandleSubmit(e, { body: { selectedModel } });
  }, [input, originalHandleSubmit, selectedModel]);

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
    <div className="relative flex h-dvh w-full flex-col overflow-hidden bg-background">
      <UserChatHeader />

      <main
        ref={containerRef}
        className={`flex-1 w-full scroll-container ${
          hasSentMessage ? 'overflow-y-auto' : 'overflow-y-hidden'
        }`}
        style={{
          paddingTop: '80px',
          paddingBottom: hasSentMessage ? `calc(${inputAreaHeight}px + 8rem)` : '0px',
        }}
      >
        {!hasSentMessage ? (
          <div className="flex h-full items-center justify-center">
            <div className="w-full px-4 flex flex-col items-center max-w-xl lg:max-w-[50rem]">
              <GreetingBanner />
              {isDesktop && (
                <form onSubmit={handleSubmit} className="w-full max-w-4xl mx-auto mt-6">
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
          />
        )}
        <ChatScrollAnchor containerRef={containerRef} />
      </main>

      {(!isDesktop || hasSentMessage) && (
        <div ref={inputAreaRef} className="fixed bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-background via-background to-transparent pointer-events-none">
          <div className="w-full max-w-[50rem] mx-auto px-2 sm:px-4 pt-2 pb-3 sm:pb-4 pointer-events-auto">
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
              />
            </form>
            {hasSentMessage && (
              <div className="text-center mt-1">
                <span className="text-xs text-zinc-600 dark:text-zinc-300 px-4 py-0.5 select-none">
                  Avurna uses AI. Double check response.
                </span>
              </div>
            )}
          </div>
        </div>
      )}
      
      {hasSentMessage && (
         <button
            onClick={() => window.location.reload()}
            className="fixed bottom-5 right-5 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800 text-zinc-200 shadow-lg transition-opacity hover:bg-zinc-700"
            title="New Issue"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
        </button>
      )}
    </div>
  );
}