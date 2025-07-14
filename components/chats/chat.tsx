"use client";

import React from "react";
import { getDefaultModel } from "@/ai/providers";
import { useUser } from "@clerk/nextjs";
import { useLiveSuggestedPrompts } from '@/hooks/use-suggested-prompts';
import { useChat } from "@ai-sdk/react";
import { useRef as useReactRef } from "react";
import { useEffect, useRef, useState, useCallback } from "react";
import { Textarea as CustomTextareaWrapper } from "../textarea";
import { ChatInputArea } from "../chat-input-area";
import { SuggestedPrompts } from "../ui/suggestions/suggested-prompts";
import { ProjectOverview } from "../ui/project-overview";
import { Messages } from "../messages";
import { useScrollToBottom } from "@/lib/hooks/use-scroll-to-bottom";
import { Header } from "../ui/infobar/header";
import { toast } from "sonner";
import { Github, LinkedInIcon, XIcon } from "../icons";
import { motion, AnimatePresence } from "framer-motion";
import { BlinkingCursor } from "../ui/blinking-cursor";
import { ScrollToBottomButton } from "../ui/scroll-to-bottom-button";

// Only call title generation if the message is not vague/unsupported
function isVagueOrUnsupportedMessage(msg: string) {
  if (!msg || typeof msg !== 'string') return true;
  const trimmed = msg.trim();
  if (trimmed.length < 2) return true;
  const vagueExact = [
    'hi', 'hello', 'hey', 'yo', 'sup', 'start', 'begin', 'new chat', 'test', 'ok', 'okay', 'help', 'continue', 'again', 'repeat', 'next', 'more', 'info', 'details', 'expand', 'elaborate', 'explain', 'yes', 'no', 'maybe', 'sure', 'thanks', 'thank you', 'cool', 'nice', 'good', 'great', 'awesome', 'wow', 'hmm', 'huh', 'pls', 'please'
  ];
  if (vagueExact.includes(trimmed.toLowerCase())) return true;
  if (/^\s*$/.test(trimmed) || /^([?.!\s]+)$/.test(trimmed)) return true;
  if (trimmed.split(/\s+/).length === 1 && !trimmed.endsWith('?')) return true;
  return false;
}

async function generateAndSetTitle(firstUserMessageContent: string) {
  if (isVagueOrUnsupportedMessage(firstUserMessageContent)) {
    // Do not call the backend at all for vague/unsupported messages
    // Optionally, could log or show a tooltip here
    return;
  }
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
    }
  } catch (error) {
    console.error("Error generating title:", error);
  }
}


export default function Chat() {
  const { isLoaded, isSignedIn } = useUser();
  const [containerRef, endRef, scrollToBottom] = useScrollToBottom();
  const latestUserMessageRef = useRef<HTMLDivElement>(null);
  const [selectedModel, setSelectedModel] = useState<string>(() => getDefaultModel(!!isSignedIn));
  const titleGeneratedRef = useRef(false);
  const [inputAreaHeight, setInputAreaHeight] = useState(0);
  const inputAreaRef = useRef<HTMLDivElement>(null);

  const [isDesktop, setIsDesktop] = useState<undefined | boolean>(undefined);
  const [showMobileInfoMessage, setShowMobileInfoMessage] = useState(false);
  const [hasShownMobileInfoMessageOnce, setHasShownMobileInfoMessageOnce] = useState(false);

  const modelForCurrentSubmissionRef = useRef<string>(getDefaultModel(!!isSignedIn));
  const dynamicSuggestedPrompts = useLiveSuggestedPrompts();
  const [predictivePrompts, setPredictivePrompts] = useState<string[]>([]);
  const [isPredicting, setIsPredicting] = useState(false);
  const [isPredictiveVisible, setIsPredictiveVisible] = useState(true);

  const [showScrollButton, setShowScrollButton] = useState(false);

  const MAX_COMPLETION_INPUT_LENGTH = 90;

  // Update selectedModel if sign-in state changes
  useEffect(() => {
    setSelectedModel(getDefaultModel(!!isSignedIn));
    modelForCurrentSubmissionRef.current = getDefaultModel(!!isSignedIn);
  }, [isSignedIn]);

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
    append,
    // appendMessage, (not present in useChat)
  } = useChat({
    api: '/api/chat',
    maxSteps: 5,
    body: { selectedModel },
    initialMessages: [],
    onToolCall: (toolCall) => {
      console.log('AI-SDK Debug: Tool Call Initiated:', toolCall);
    },
    onResponse: (toolResult) => {
      console.log('AI-SDK Debug: Tool Result Received:', toolResult);
      // If you see this log, it means the SDK is receiving the result.
      // The problem then shifts to why the AI model isn't acting on it.
    },
    onFinish: (_message, _options) => {
      console.log('AI-SDK Debug: Chat finished.');
      setSelectedModel(getDefaultModel(!!isSignedIn));
      modelForCurrentSubmissionRef.current = getDefaultModel(!!isSignedIn);
    },
    onError: (error) => {
      console.error("AI-SDK Debug: Error during chat:", error);
      toast.error(
        error.message && error.message.length > 0
          ? error.message
          : "An error occurred, please try again later.",
        { position: "top-center", richColors: true },
      );
      setSelectedModel(getDefaultModel(!!isSignedIn));
      modelForCurrentSubmissionRef.current = getDefaultModel(!!isSignedIn);
    },
  });

  useEffect(() => {
    console.log('Current Messages State:', messages);
  }, [messages]);

  // Watch for recursionPrompt in data
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


  // Robust title generation: only set title when backend says message is clear
  useEffect(() => {
    // Only generate title if it hasn't been generated in this session
    if (titleGeneratedRef.current) return;
    if (messages.length === 1 && messages[0].role === 'user') {
      const firstUserMessageContent = messages[0].content;
      if (!isVagueOrUnsupportedMessage(firstUserMessageContent)) {
        generateAndSetTitle(firstUserMessageContent).then(() => {
          titleGeneratedRef.current = true;
        });
      }
    } else if (messages.length > 1) {
      // Find the most recent user message that is not vague/unsupported
      const lastUserMsg = [...messages].reverse().find(m => m.role === 'user' && !isVagueOrUnsupportedMessage(m.content));
      if (lastUserMsg) {
        generateAndSetTitle(lastUserMsg.content).then(() => {
          titleGeneratedRef.current = true;
        });
      }
    } else if (messages.length === 0 && titleGeneratedRef.current) {
      titleGeneratedRef.current = false;
      document.title = "Avocado Avurna";
    }
  }, [messages]);

  // --- NEW: useEffect to fetch predictive prompts ---
  useEffect(() => {
    // Only run on desktop
    if (!isDesktop) return;

    // --- FIX: Create an AbortController for this specific effect run ---
    const controller = new AbortController();

    if (
      !input.trim() ||
      input.trim().length < 3 ||
      input.trim().length > MAX_COMPLETION_INPUT_LENGTH
    ) {
      setPredictivePrompts([]);
      return; // This now also stops the API call for long inputs
    }

    // Debounce the API call
    const handler = setTimeout(async () => {
      setIsPredicting(true);
      try {
        const response = await fetch('/api/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            input: input,
          }),
          // --- FIX: Pass the AbortController's signal to the fetch request ---
          signal: controller.signal,
        });
        if (!response.ok) throw new Error('Failed to fetch completions');
        const data = await response.json();
        setPredictivePrompts(data.completions || []);
        setIsPredictiveVisible(true);
      } catch (error) {
        // --- FIX: Check if the error was an intentional abort ---
        if ((error as Error).name === 'AbortError') {
          // This is not a real error, just our cleanup function working.
          // We can safely ignore it.
          console.log('Fetch aborted successfully.');
        } else {
          // This is a real network or server error.
          console.error("Error fetching predictive prompts:", error);
          setPredictivePrompts([]);
        }
      } finally {
        // We only want to set isPredicting to false if the request wasn't aborted
        // This check is a small refinement to prevent a quick flicker
        if (!controller.signal.aborted) {
          setIsPredicting(false);
        }
      }
    }, 150); // 300ms delay

    // Cleanup function now cancels both the timer AND the network request
    return () => {
      clearTimeout(handler);
      // --- FIX: Abort the fetch request if the component re-renders or unmounts ---
      controller.abort();
    };
  }, [input, isDesktop]);

  const handleSubmit = useCallback((e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim()) return;

    setPredictivePrompts([]);
    const intendedModelForThisSubmit = selectedModel;
    modelForCurrentSubmissionRef.current = intendedModelForThisSubmit;

    // 1. Get the current list of messages
    // 2. Call the original submit function from useChat
    originalHandleSubmit(e);

    if (showMobileInfoMessage) setShowMobileInfoMessage(false);

    // Scroll so only the new user message is visible under the header
    setTimeout(() => {
      if (latestUserMessageRef.current) {
        // Instantly jump, then smooth scroll for 'instantly smooth' effect
        latestUserMessageRef.current.scrollIntoView({ block: 'end', behavior: 'instant' });
        // Adjust for header height (assume 96px)
        const headerHeight = 96;
        const container = containerRef.current;
        if (container) {
          // If the message is at the bottom, scroll up by header height
          container.scrollTop = container.scrollTop - headerHeight;
        } else {
          // Fallback: window scroll
          window.scrollBy({ top: -headerHeight, behavior: 'smooth' });
        }
        // Optionally, a short smooth scroll to reinforce the effect
        setTimeout(() => {
          latestUserMessageRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
        }, 40);
      }
    }, 120);
  }, [selectedModel, input, originalHandleSubmit, messages, setMessages, showMobileInfoMessage, containerRef]);

  const hasSentMessage = messages.length > 0;

  useEffect(() => {
    if (status === 'streaming' || status === 'submitted') {
      setTimeout(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 80);
    }
  }, [status, endRef]);

  useEffect(() => {
    const elementToObserve = inputAreaRef.current;

    if (!elementToObserve) {
      // Optionally, consider if inputAreaHeight should be reset if the element is not present.
      // setInputAreaHeight(0); 
      return;
    }

    const measureAndUpdateHeight = () => {
      const newHeight = elementToObserve.offsetHeight;
      setInputAreaHeight(newHeight);
    };

    measureAndUpdateHeight(); // Measure immediately

    const observer = new ResizeObserver(measureAndUpdateHeight);
    observer.observe(elementToObserve);

    // Keep window resize listener if it's meant to trigger remeasurement
    // for reasons beyond the element's own ResizeObserver capabilities.
    window.addEventListener('resize', measureAndUpdateHeight);

    return () => {
      observer.unobserve(elementToObserve);
      window.removeEventListener('resize', measureAndUpdateHeight);
    };
    // --- Critical Change: Updated dependency array ---
  }, [isDesktop, hasSentMessage, showMobileInfoMessage]); // Added isDesktop and hasSentMessage

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

  // --- Add the scroll listener logic ---
  useEffect(() => {
    const mainEl = containerRef.current;
    if (!mainEl) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = mainEl;
      const isAtBottom = scrollHeight - scrollTop - clientHeight <= 1;
      setShowScrollButton(!isAtBottom);
    };

    mainEl.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial check

    return () => {
      mainEl.removeEventListener('scroll', handleScroll);
    };
  }, []); // Run only once

  // --- 4. Create the click handler ---
  const handleScrollToBottom = () => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const uiIsLoading = status === "streaming" || status === "submitted"

  // Create a props object to pass to the new component to avoid repetition
  const chatInputAreaProps = {
    handleSubmit,
    predictivePrompts,
    input,
    setInput: (newInput: string) => {
      setInput(newInput);
      setPredictivePrompts([]); // Also clear prompts when one is selected
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
    setIsPredictiveVisible
  };

  // Determine where to render the ChatInputArea
  const showFixedInput = typeof isDesktop !== 'undefined' && (!isDesktop || hasSentMessage);
  const showInflowInput = typeof isDesktop !== 'undefined' && isDesktop && !hasSentMessage;

  return (
    <div 
      className="relative flex flex-col h-dvh overflow-y-hidden overscroll-none w-full max-w-full bg-background dark:bg-background"
    >
      <Header />
      <div
        ref={containerRef}
        className={
          `w-full flex-1 scrollbar-thin ` +
          // FIX: This logic robustly centers the initial content and switches to a scroll view for the chat
          (hasSentMessage 
            ? "overflow-y-auto overscroll-auto" 
            : "overflow-y-hidden overscroll-none flex flex-col justify-center items-center"
          )
        }
        style={{
          paddingTop: hasSentMessage ? '96px' : '0', // No top padding when centering
          paddingBottom: `${showFixedInput ? inputAreaHeight : 0}px`,
        }}
      >
        {typeof isDesktop === "undefined" ? null : !hasSentMessage ? (
          // FIX: This container is now simpler. The parent handles centering.
          <div className="flex flex-col items-center w-full max-w-xl lg:max-w-[50rem] px-4 pb-16">
            <ProjectOverview />
            
            {showInflowInput && (
              <div className="w-full max-w-3xl mx-auto mt-6 mb-4">
                <ChatInputArea {...chatInputAreaProps} />
              </div>
            )}

            <AnimatePresence>
              {isDesktop && !input && (
                <motion.div
                  initial={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10, scale: 0.98 }}
                  transition={{ duration: 0.2 }}
                  className="mt-2 w-full max-w-4xl mx-auto"
                >
                  <SuggestedPrompts onPromptClick={setInput} />
                </motion.div>
              )}
            </AnimatePresence>
            
            {isDesktop && (
              <div className="fixed left-1/2 -translate-x-1/2 bottom-0 z-30 flex justify-center pointer-events-none">
                <span className="text-xs font-normal text-[#6c757d] dark:text-zinc-300 select-none bg-background/90 dark:bg-background/90 px-4 py-2 rounded-xl pointer-events-auto">
                  By messaging Avurna, you agree to our{' '}
                  <a href="/terms" target="_blank" rel="noopener noreferrer" className="font-bold text-zinc-700 dark:text-zinc-200 hover:text-zinc-900 dark:hover:text-white no-underline">Terms</a>
                  {' '}and our{' '}
                  <a href="/privacy" target="_blank" rel="noopener noreferrer" className="font-bold text-zinc-700 dark:text-zinc-200 hover:text-zinc-900 dark:hover:text-white no-underline">Privacy Policy</a>.
                </span>
              </div>
            )}
          </div>
        ) : (
          <>
            <Messages
              messages={messages}
              isLoading={uiIsLoading}
              status={status as any}
              endRef={endRef as React.RefObject<HTMLDivElement>}
            />
            {status === 'submitted' && (
              <div className="w-full mx-auto px-2 sm:px-2 group/message max-w-[97.5%] sm:max-w-[46rem]">
                <div className="flex flex-row w-full items-start space-x-2 py-4">
                  <div className="flex-shrink-0 h-7 w-7 mr-7 rounded-full flex items-center justify-center font-semibold text-zinc-200 text-sm">
                    <BlinkingCursor />
                  </div>              
                </div>
              </div>
            )}
          </>
        )}
        <div ref={endRef} />
      </div>
      
      <ScrollToBottomButton
        isVisible={showScrollButton && hasSentMessage}
        onClick={handleScrollToBottom}
      />

      {/* Renders a fixed input for mobile (always) and desktop (during chat) */}
      {showFixedInput && (
        <div
          ref={inputAreaRef}
          className="fixed bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-background via-background/90 to-transparent dark:from-background dark:via-background/90"
        >
          <div className="w-full max-w-[50rem] mx-auto px-2 sm:px-4 pt-2 pb-3 sm:pb-4">
            <ChatInputArea {...chatInputAreaProps} />
            <div className="fixed left-0 right-0 bottom-0 z-40 text-center pb-2 pointer-events-none">
              <span className="text-xs text-zinc-600 dark:text-zinc-300 px-4 py-0.5 select-none pointer-events-auto">
                Avurna uses AI. Double check response.
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}