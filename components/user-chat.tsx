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
import { UserChatHeader } from "./user-chat-header";

// GreetingBanner component for personalized greeting
function GreetingBanner() {
  const { user, isLoaded } = useUser();
  let displayName = "dear";
  if (isLoaded && user) {
    if (user.firstName && user.firstName.trim().length > 0) {
      displayName = user.firstName;
    } else if (user.lastName && user.lastName.trim().length > 0) {
      displayName = user.lastName;
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
  const [offlineState, setOfflineState] = useState<'online' | 'reconnecting' | 'offline'>('online');
  const [retryCount, setRetryCount] = useState(0);
  const [offlineSince, setOfflineSince] = useState<number | null>(null);
  const retryIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const offlineDurationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectToastId = "reconnect";
  const offlineToastId = "offline";

  // Helper to format duration in mm:ss
  const formatDuration = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  };

  // Helper to update the reconnect toast with countdown
  const updateReconnectToast = (secondsLeft: number) => {
    let offlineMsg = '';
    if (offlineSince) {
      const duration = Date.now() - offlineSince;
      offlineMsg = ` | Offline for ${formatDuration(duration)}`;
    }
    toast.loading(`Reconnecting... (retry in ${secondsLeft}s)${offlineMsg}`, {
      id: reconnectToastId,
      duration: 5000,
      position: "top-center",
      richColors: true,
    });
  };

  // Helper to show offline toast with duration
  const showOfflineToast = () => {
    let offlineMsg = '';
    if (offlineSince) {
      const duration = Date.now() - offlineSince;
      offlineMsg = `You’ve been offline for ${formatDuration(duration)}`;
    } else {
      offlineMsg = 'You are offline.';
    }
    toast.error(offlineMsg, { id: offlineToastId, duration: 999999, position: "top-center", richColors: true });
  };

  // Track offline duration
  useEffect(() => {
    if (offlineState === 'offline' || offlineState === 'reconnecting') {
      if (!offlineSince) setOfflineSince(Date.now());
      if (!offlineDurationIntervalRef.current) {
        offlineDurationIntervalRef.current = setInterval(() => {
          // Update toast with new duration
          if (offlineState === 'offline') showOfflineToast();
          if (offlineState === 'reconnecting') updateReconnectToast(5);
        }, 1000);
      }
    } else {
      setOfflineSince(null);
      if (offlineDurationIntervalRef.current) {
        clearInterval(offlineDurationIntervalRef.current);
        offlineDurationIntervalRef.current = null;
      }
    }
    return () => {
      if (offlineDurationIntervalRef.current) {
        clearInterval(offlineDurationIntervalRef.current);
        offlineDurationIntervalRef.current = null;
      }
    };
  }, [offlineState, offlineSince]);

  useEffect(() => {
    let countdown = 5;

    function handleOnline() {
      setIsOnline(true);
      setOfflineState('online');
      toast.dismiss(reconnectToastId);
      toast.dismiss(offlineToastId);
      setHasShownReconnect(false);
      setRetryCount(0);
      setOfflineSince(null);
      if (retryIntervalRef.current) {
        clearInterval(retryIntervalRef.current);
        retryIntervalRef.current = null;
      }
    }

    function handleOffline() {
      setIsOnline(false);
      setOfflineState('reconnecting');
      if (!offlineSince) setOfflineSince(Date.now());
      if (!hasShownReconnect) {
        updateReconnectToast(countdown);
        setHasShownReconnect(true);
      }
      // Start retry interval
      if (!retryIntervalRef.current) {
        retryIntervalRef.current = setInterval(() => {
          countdown--;
          if (countdown > 0) {
            updateReconnectToast(countdown);
          } else {
            setRetryCount((c) => c + 1);
            countdown = 5;
            updateReconnectToast(countdown);
            // Try to reconnect
            if (navigator.onLine) {
              handleOnline();
            }
          }
        }, 1000);
      }
      // After 15s, show Offline if still offline
      setTimeout(() => {
        if (!navigator.onLine) {
          setOfflineState('offline');
          toast.dismiss(reconnectToastId);
          showOfflineToast();
        }
      }, 15000);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    if (!navigator.onLine) handleOffline();

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      toast.dismiss(reconnectToastId);
      toast.dismiss(offlineToastId);
      if (retryIntervalRef.current) clearInterval(retryIntervalRef.current);
    };
  }, [hasShownReconnect, offlineSince]);

  // If Clerk is not loaded but user was signed in, show reconnect
  useEffect(() => {
    if (!isLoaded && isSignedIn && !hasShownReconnect) {
      setOfflineState('reconnecting');
      if (!offlineSince) setOfflineSince(Date.now());
      updateReconnectToast(5);
      setHasShownReconnect(true);
      // Start retry interval
      if (!retryIntervalRef.current) {
        let countdown = 5;
        retryIntervalRef.current = setInterval(() => {
          countdown--;
          if (countdown > 0) {
            updateReconnectToast(countdown);
          } else {
            setRetryCount((c) => c + 1);
            countdown = 5;
            updateReconnectToast(countdown);
            if (navigator.onLine) {
              setOfflineState('online');
              toast.dismiss(reconnectToastId);
              toast.dismiss(offlineToastId);
              setHasShownReconnect(false);
              setRetryCount(0);
              setOfflineSince(null);
              if (retryIntervalRef.current) {
                clearInterval(retryIntervalRef.current);
                retryIntervalRef.current = null;
              }
            }
          }
        }, 1000);
      }
      // After 15s, show Offline if still offline
      setTimeout(() => {
        if (!navigator.onLine) {
          setOfflineState('offline');
          toast.dismiss(reconnectToastId);
          showOfflineToast();
        }
      }, 15000);
    }
    if (isLoaded && hasShownReconnect) {
      setOfflineState('online');
      toast.dismiss(reconnectToastId);
      toast.dismiss(offlineToastId);
      setHasShownReconnect(false);
      setRetryCount(0);
      setOfflineSince(null);
      if (retryIntervalRef.current) {
        clearInterval(retryIntervalRef.current);
        retryIntervalRef.current = null;
      }
    }
  }, [isLoaded, isSignedIn, hasShownReconnect, offlineSince]);

  return offlineState;
}

// Go offline (disable network or use browser dev tools).
// Send a message: It should show as “Pending” with a clock icon.
// Send more messages: Each should queue as pending.
// Go back online: All pending messages should be sent in order, and a toast should appear:
// “N pending messages were sent after reconnecting.”
// If a message fails (e.g., server error), it should show as “Failed. Retry?” (if you implemented that).
// Try sending a message while a previous one is still waiting for an AI response: The input should be disabled until the AI responds.

export default function UserChat() {
  // --- Robust offline/online detection ---
  const offlineState = useReconnectToClerk();
  const [containerRef, endRef, scrollToBottom] = useScrollToBottom();
  const [selectedModel, setSelectedModel] = useState<string>(defaultModel);
  const titleGeneratedRef = useRef(false);
  const [inputAreaHeight, setInputAreaHeight] = useState(0);
  const inputAreaRef = useRef<HTMLDivElement>(null);

  const [isDesktop, setIsDesktop] = useState<undefined | boolean>(undefined);
  // Removed mobile fadeinfo state

  const [isSubmittingSearch, setIsSubmittingSearch] = useState(false);
  const modelForCurrentSubmissionRef = useRef<string>(defaultModel);

  // --- Offline message queue ---
  const [pendingMessages, setPendingMessages] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('avurna_pending_messages');
        if (stored) return JSON.parse(stored);
      } catch {}
    }
    return [];
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('avurna_pending_messages', JSON.stringify(pendingMessages));
    }
  }, [pendingMessages]);

  const queuePendingMessage = (msg: any) => {
    setPendingMessages((prev) => [...prev, msg]);
  };
  const updatePendingMessage = (id: string, updates: any) => {
    setPendingMessages((prev) => prev.map(m => m.id === id ? { ...m, ...updates } : m));
  };
  const removePendingMessage = (id: string) => {
    setPendingMessages((prev) => prev.filter(m => m.id !== id));
  };

  // --- NEW: Only hide chat UI if *network* is offline, not just Clerk ---
  const [networkOnline, setNetworkOnline] = useState(true);
  useEffect(() => {
    const handleOnline = () => setNetworkOnline(true);
    const handleOffline = () => setNetworkOnline(false);
    setNetworkOnline(navigator.onLine);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // On reconnect, send all pending messages and show a toast when any are sent
  useEffect(() => {
    if (offlineState === 'online' && pendingMessages.length > 0) {
      let sentCount = 0;
      (async () => {
        for (const msg of pendingMessages) {
          updatePendingMessage(msg.id, { status: 'sending' });
          try {
            const res = await fetch('/api/chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                messages: [{ role: 'user', content: msg.content }],
                selectedModel,
              }),
            });
            if (res.ok) {
              removePendingMessage(msg.id);
              sentCount++;
            } else {
              updatePendingMessage(msg.id, { status: 'failed' });
            }
          } catch {
            updatePendingMessage(msg.id, { status: 'failed' });
          }
        }
        if (sentCount > 0) {
          toast.success(`${sentCount} pending message${sentCount > 1 ? 's were' : ' was'} sent after reconnecting.`, {
            position: 'top-center',
            richColors: true,
          });
        }
      })();
    }
  }, [offlineState]);

  // Removed mobile fadeinfo effect

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

    // If offline, queue the message
    if (offlineState !== 'online') {
      const id = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
      queuePendingMessage({
        id,
        content: input,
        status: 'pending',
        createdAt: Date.now(),
      });
      setInput('');
      setTimeout(() => scrollToBottom(), 200);
      return;
    }

    if (intendedModelForThisSubmit === SEARCH_MODE) {
      if (isSubmittingSearch) return;
      setIsSubmittingSearch(true);
    } else if (isSubmittingSearch && modelForCurrentSubmissionRef.current === SEARCH_MODE) {
      return;
    }

    originalHandleSubmit(e, {
      body: { selectedModel: modelForCurrentSubmissionRef.current }
    });

    setTimeout(() => scrollToBottom(), 200);
  }, [selectedModel, isSubmittingSearch, input, originalHandleSubmit, scrollToBottom, offlineState]);

  // Merge pending messages with chat messages for display
  const mergedMessages = [
    ...messages,
    ...pendingMessages.map((msg) => ({
      id: msg.id,
      role: 'user' as const,
      content: msg.content,
      parts: [{ type: 'text', text: msg.content } as { type: 'text'; text: string }],
      status: msg.status || 'pending',
      pending: true,
    })),
  ];

  const hasSentMessage = mergedMessages.length > 0;

  useEffect(() => {
    const elementToObserve = inputAreaRef.current;
    if (!elementToObserve) return;
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
  }, [isDesktop, hasSentMessage]);

  // Removed mobile fadeinfo logic

  const uiIsLoading = status === "streaming" || status === "submitted" || isSubmittingSearch;
  const isMobileOrTabletHook = useMobile();
  const bufferForInputArea = isMobileOrTabletHook ? 200 : 12;

  // --- MAIN RENDER: Only delay/hide UI if *network* is offline, not just Clerk ---
  if (!networkOnline) {
    return (
      <div className="flex flex-col items-center justify-center h-dvh w-full">
        <div className="text-lg text-zinc-600 dark:text-zinc-300 mb-4">You are offline.</div>
        <div className="text-sm text-zinc-500 dark:text-zinc-400">Reconnect to continue using Avurna</div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-1 flex-col overflow-y-hidden overscroll-none w-full max-w-full bg-background dark:bg-background">
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
            messages={mergedMessages}
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
              <div className="text-center mt-2">
                <span className="text-xs text-zinc-600 dark:text-zinc-300 px-4 py-0.5 select-none">
                  Avurna uses AI. Double check response.
                </span>
              </div>
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
