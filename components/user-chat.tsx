"use client";

import React from "react";
import { useMobile } from "../hooks/use-mobile";
import { defaultModel } from "@/ai/providers";
import { SEARCH_MODE } from "@/components/ui/textarea";
import { useChat } from "@ai-sdk/react";
import { useRef as useReactRef } from "react";
import { useEffect, useRef, useState, useCallback } from "react";
import { Textarea as CustomTextareaWrapper } from "./textarea";
import { useUser } from "@clerk/nextjs";
import { Messages } from "./messages";
import { useScrollToBottom } from "@/lib/hooks/use-scroll-to-bottom";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { UserChatHeader } from "./user-chat-header";

// GreetingBanner component for personalized greeting
function GreetingBanner() {
  const { user, isLoaded } = useUser();
  let displayName = "dear";
  if (isLoaded && user) {
    if (user.lastName && user.lastName.trim().length > 0) {
      displayName = user.lastName;
    } else if (user.firstName && user.firstName.trim().length > 0) {
      displayName = user.firstName;
    } else if (user.username && user.username.trim().length > 0) {
      displayName = user.username;
    }
  }
  /**
   * WIP: Later we want to add some weird greetings too.
   * Also we want to integrate with Google Doodle to know the celebration of days and render it depending on that day.
   * ie. Happy Mothers' day, {displayName}, that is the {greeting}, {displayName}
   */
  // Time-based greeting
  const hour = new Date().getHours();
  let greeting = "Hello";
  if (hour < 12) greeting = "Good morning";
  else if (hour < 18) greeting = "Good afternoon";
  else greeting = "Good evening";
  return (
    <div className="w-full px-4 pb-4 sm:pb-10 flex flex-col items-center max-w-xl lg:max-w-[50rem]" style={{ marginTop: '-60px' }}>
      <div className="text-2xl sm:text-3xl font-semibold text-zinc-800 dark:text-zinc-100 text-center select-none">
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
      body: JSON.stringify({
        action: 'generateTitle',
        messages: [{ role: 'user', content: firstUserMessageContent }],
      }),
    });
    if (!response.ok) throw new Error(`Title generation failed: ${response.statusText}`);
    const data = await response.json();
    if (data.title && data.title !== null) {
      document.title = data.title;
    } else if (data.reason === 'vague') {
      // Do not set title, wait for a clearer message
    }
  } catch (error) {
    console.error("Error generating title:", error);
  }
}

// --- Network/Clerk reconnect logic ---
function useReconnectToClerk() {
  const { isLoaded, isSignedIn } = useUser();
  const [isOnline, setIsOnline] = useState(true);
  const [hasShownReconnect, setHasShownReconnect] = useState(false);
  const [offlineTimeout, setOfflineTimeout] = useState<NodeJS.Timeout | null>(null);

  // Expose online state to parent
  const [offlineState, setOfflineState] = useState<'online' | 'reconnecting' | 'offline'>('online');

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
      setOfflineState('online');
      toast.dismiss("reconnect");
      toast.dismiss("offline");
      setHasShownReconnect(false);
      if (offlineTimeout) {
        clearTimeout(offlineTimeout);
        setOfflineTimeout(null);
      }
    }
    function handleOffline() {
      setIsOnline(false);
      setOfflineState('reconnecting');
      if (!hasShownReconnect) {
        toast.loading("Reconnecting...", { id: "reconnect", duration: 15000, position: "top-center", richColors: true });
        setHasShownReconnect(true);
        // After 15s, show Offline if still offline
        const timeout = setTimeout(() => {
          if (!navigator.onLine) {
            setOfflineState('offline');
            toast.dismiss("reconnect");
            toast.error("Offline. Please check your connection.", { id: "offline", duration: 999999, position: "top-center", richColors: true });
          }
        }, 15000);
        setOfflineTimeout(timeout);
      }
    }
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    // Initial state
    if (!navigator.onLine) handleOffline();
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      toast.dismiss("reconnect");
      toast.dismiss("offline");
      if (offlineTimeout) clearTimeout(offlineTimeout);
    };
  }, [hasShownReconnect, offlineTimeout]);

  // If Clerk is not loaded but user was signed in, show reconnect
  useEffect(() => {
    if (!isLoaded && isSignedIn && !hasShownReconnect) {
      setOfflineState('reconnecting');
      toast.loading("Reconnecting...", { id: "reconnect", duration: 15000, position: "top-center", richColors: true });
      setHasShownReconnect(true);
      // After 15s, show Offline if still offline
      const timeout = setTimeout(() => {
        if (!navigator.onLine) {
          setOfflineState('offline');
          toast.dismiss("reconnect");
          toast.error("Offline. Please check your connection.", { id: "offline", duration: 999999, position: "top-center", richColors: true });
        }
      }, 15000);
      setOfflineTimeout(timeout);
    }
    if (isLoaded && hasShownReconnect) {
      setOfflineState('online');
      toast.dismiss("reconnect");
      toast.dismiss("offline");
      setHasShownReconnect(false);
      if (offlineTimeout) {
        clearTimeout(offlineTimeout);
        setOfflineTimeout(null);
      }
    }
  }, [isLoaded, isSignedIn, hasShownReconnect, offlineTimeout]);

  return offlineState;
}

export default function UserChat() {
  const offlineState = useReconnectToClerk();
  const [containerRef, endRef, scrollToBottom] = useScrollToBottom();
  const [selectedModel, setSelectedModel] = useState<string>(defaultModel);
  const titleGeneratedRef = useRef(false);
  const [inputAreaHeight, setInputAreaHeight] = useState(0);
  const inputAreaRef = useRef<HTMLDivElement>(null);

  const [isDesktop, setIsDesktop] = useState<undefined | boolean>(undefined);
  const [showMobileInfoMessage, setShowMobileInfoMessage] = useState(false);
  const [hasShownMobileInfoMessageOnce, setHasShownMobileInfoMessageOnce] = useState(false);

  const [isSubmittingSearch, setIsSubmittingSearch] = useState(false);
  const modelForCurrentSubmissionRef = useRef<string>(defaultModel);

  useEffect(() => {
    if (!showMobileInfoMessage || isDesktop) return;
    function handleTapOutside(e: MouseEvent | TouchEvent) {
      const safearea = document.getElementById("safearea");
      if (!safearea) return;
      if (!safearea.contains(e.target as Node)) {
        setShowMobileInfoMessage(false);
      }
    }
    document.addEventListener("mousedown", handleTapOutside);
    document.addEventListener("touchstart", handleTapOutside);
    return () => {
      document.removeEventListener("mousedown", handleTapOutside);
      document.removeEventListener("touchstart", handleTapOutside);
    };
  }, [showMobileInfoMessage, isDesktop]);

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // --- Recursion Prompt State ---
  const [recursionPrompt, setRecursionPrompt] = useState<null | { prompt: string; url: string; userIntent: string; params: any }>(null);
  const recursionPromptRef = useReactRef(recursionPrompt);
  recursionPromptRef.current = recursionPrompt;

  // Patch useChat to intercept NDJSON lines with type: 'recursionPrompt'
  const {
    messages,
    input,
    handleInputChange,
    setInput,
    handleSubmit: originalHandleSubmit,
    status,
    stop,
    setMessages,
    data,
  } = useChat({
    api: '/api/chat',
    maxSteps: 5,
    body: { selectedModel },
    initialMessages: [],
    onFinish: (_message, _options) => {
      setSelectedModel(defaultModel);
      setIsSubmittingSearch(false);
      modelForCurrentSubmissionRef.current = defaultModel;
    },
    onError: (error) => {
      toast.error(
        error.message && error.message.length > 0
          ? error.message
          : "An error occurred, please try again later.",
        { position: "top-center", richColors: true },
      );
      setSelectedModel(defaultModel);
      setIsSubmittingSearch(false);
      modelForCurrentSubmissionRef.current = defaultModel;
    },
  });

  useEffect(() => {
    if (data && data.length > 0) {
      for (const dataObj of data) {
        if (dataObj && typeof dataObj === 'object' && (dataObj as any).type === 'recursionPrompt') {
          setRecursionPrompt(dataObj as any);
          break;
        }
      }
    }
  }, [data]);

  useEffect(() => {
    if (messages.length === 1 && messages[0].role === 'user' && !titleGeneratedRef.current) {
      const firstUserMessageContent = messages[0].content;
      generateAndSetTitle(firstUserMessageContent).then(() => {
        titleGeneratedRef.current = true;
      });
    }
    if (messages.length === 0 && titleGeneratedRef.current) {
      titleGeneratedRef.current = false;
      document.title = "Avocado Avurna";
    }
    if (messages.length > 1 && !titleGeneratedRef.current) {
      const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
      if (lastUserMsg) {
        generateAndSetTitle(lastUserMsg.content).then(() => {
          titleGeneratedRef.current = true;
        });
      }
    }
  }, [messages]);

  const handleSubmit = useCallback((e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim()) return;

    const intendedModelForThisSubmit = selectedModel;
    modelForCurrentSubmissionRef.current = intendedModelForThisSubmit;

    if (intendedModelForThisSubmit === SEARCH_MODE) {
      if (isSubmittingSearch) return;
      setIsSubmittingSearch(true);
    } else if (isSubmittingSearch && modelForCurrentSubmissionRef.current === SEARCH_MODE) {
      return;
    }

    originalHandleSubmit(e, {
      body: { selectedModel: modelForCurrentSubmissionRef.current }
    });

    if (showMobileInfoMessage) setShowMobileInfoMessage(false);
    setTimeout(() => scrollToBottom(), 200);
  }, [selectedModel, isSubmittingSearch, input, originalHandleSubmit, showMobileInfoMessage, scrollToBottom]);

  const hasSentMessage = messages.length > 0;

  useEffect(() => {
    const elementToObserve = inputAreaRef.current;

    if (!elementToObserve) {
      return;
    }

    const measureAndUpdateHeight = () => {
      const newHeight = elementToObserve.offsetHeight;
      setInputAreaHeight(newHeight);
    };

    measureAndUpdateHeight();

    const observer = new ResizeObserver(measureAndUpdateHeight);
    observer.observe(elementToObserve);

    window.addEventListener('resize', measureAndUpdateHeight);

    return () => {
      observer.unobserve(elementToObserve);
      window.removeEventListener('resize', measureAndUpdateHeight);
    };
  }, [isDesktop, hasSentMessage, showMobileInfoMessage]);

  useEffect(() => {
    const onMobileOrTablet = typeof isDesktop !== 'undefined' && !isDesktop;
    if (onMobileOrTablet) {
      if (
        messages.length === 2 &&
        messages[1]?.role === 'assistant' &&
        (status === 'streaming' || status === 'submitted') &&
        !hasShownMobileInfoMessageOnce
      ) {
        setShowMobileInfoMessage(true);
        setHasShownMobileInfoMessageOnce(true);
      }
    } else {
      if (showMobileInfoMessage) {
        setShowMobileInfoMessage(false);
      }
    }
    if (messages.length === 0 && hasShownMobileInfoMessageOnce) {
      setHasShownMobileInfoMessageOnce(false);
      setShowMobileInfoMessage(false);
    }
  }, [messages, status, isDesktop, hasShownMobileInfoMessageOnce, showMobileInfoMessage]);

  const uiIsLoading = status === "streaming" || status === "submitted" || isSubmittingSearch;
  const isMobileOrTabletHook = useMobile();
  const bufferForInputArea = isMobileOrTabletHook ? 200 : 12;

  return (
    <div className="relative flex flex-col h-dvh overflow-y-hidden overscroll-none w-full max-w-full bg-background dark:bg-background">
      <UserChatHeader />

      <div
        ref={containerRef}
        className={
          `flex-1 w-full sm:mb-12 scrollbar-thin ` +
          (hasSentMessage ? "overflow-y-auto overscroll-auto" : "overflow-y-hidden overscroll-none")
        }
        style={{
          paddingTop:
            typeof isDesktop !== 'undefined' && !isDesktop
              ? '18px'
              : typeof isDesktop !== 'undefined' && isDesktop
                ? '18px'
                : undefined,
          paddingBottom:
            typeof isDesktop !== 'undefined' && isDesktop
              ? `${inputAreaHeight + bufferForInputArea}px`
              : `${bufferForInputArea}px`,
        }}
      >
        {typeof isDesktop === "undefined" ? null : !hasSentMessage ? (
          <div className="flex h-full items-center justify-center">
            <div className="w-full px-4 pb-4 sm:pb-10 flex flex-col items-center max-w-xl lg:max-w-[50rem]">
               <GreetingBanner />
              {isDesktop && (
                <form onSubmit={handleSubmit} className="w-full max-w-4xl mx-auto mt-6 ">
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
                    isDesktop={isDesktop}
                    disabled={offlineState !== 'online'}
                    offlineState={offlineState}
                  />
                </form>
              )}
            </div>
          </div>
        ) : (
          <Messages
            messages={messages}
            isLoading={uiIsLoading}
            status={status as any}
            endRef={endRef as React.RefObject<HTMLDivElement>}
          />
        )}
        <div ref={endRef as React.RefObject<HTMLDivElement>} style={{ height: 1 }} />
      </div>

      
      {(typeof isDesktop === "undefined") ? null : (!isDesktop || hasSentMessage) && (
        !isDesktop ? (
          <div
            className="fixed bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-background via-background to-transparent dark:from-background dark:via-background"
          >
            <div
              ref={inputAreaRef}
              className="w-full max-w-3xl mx-auto px-2 sm:px-4 pt-2 pb-3 sm:pb-4 relative"
            >
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
                />
              </form>
              {(hasSentMessage) && (
                <div className="text-center -mt-4">
                  <span className="text-xs text-zinc-600 dark:text-zinc-300 px-4 py-0.5 select-none">
                    Avurna uses AI. Double check response.
                  </span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div
            ref={inputAreaRef}
            className="fixed left-0 right-0 z-10 bg-gradient-to-t from-background via-background to-transparent dark:from-background dark:via-background"
            style={{ bottom: '-10px' }}
          >
            <div className="w-full max-w-[50rem] mx-auto px-2 sm:px-4 pt-2 pb-3 sm:pb-4 relative">
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
                  isDesktop={true}
                  disabled={offlineState !== 'online'}
                  offlineState={offlineState}
                />
              </form>
              {(hasSentMessage) && (
                <div className="text-center" style={{ marginTop: '-4px' }}>
                  <span className="text-xs text-zinc-600 dark:text-zinc-300 px-4 py-0.5 select-none">
                    Avurna uses AI. Double check response.
                  </span>
                </div>
              )}
            </div>
          </div>
        )
      )}
    </div>
  );
}
