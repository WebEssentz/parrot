"use client";

import React from "react";
import { useMobile } from "../hooks/use-mobile";
import { defaultModel } from "@/ai/providers";
import { SEARCH_MODE } from "@/components/ui/textarea";
import { useChat } from "@ai-sdk/react";
import { useRef as useReactRef } from "react";
import { useEffect, useRef, useState, useCallback } from "react";
import { Textarea as CustomTextareaWrapper } from "./textarea";
import { ProjectOverview } from "./project-overview";
import { Messages } from "./messages";
import { useScrollToBottom } from "@/lib/hooks/use-scroll-to-bottom";
import { Header } from "./header";
import { toast } from "sonner";
import { Github, LinkedInIcon, XIcon } from "./icons";
import { motion, AnimatePresence } from "framer-motion";

// Move FadeMobileInfo OUTSIDE of Chat to prevent remounting on every render
// Updated FadeMobileInfo: minHeight prop is now optional and defaults to 'auto' if not a positive number.
function FadeMobileInfo({ show, minHeight }: { show: boolean; minHeight?: number }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.35, ease: "easeInOut" }}
          className="text-left text-base sm:text-lg text-zinc-700 dark:text-zinc-400 mb-2 mx-0.5 p-4 bg-zinc-100 dark:bg-zinc-800/80 rounded-xl flex flex-col justify-center shadow-lg"
          style={{ minHeight: (minHeight && minHeight > 0) ? `${minHeight}px` : 'auto' }}
        >
          <div>
            <p>
              By messaging Avurna you agree with our{' '}
              <a href="/terms" target="_blank" rel="noopener noreferrer" className="font-semibold hover:underline text-zinc-800 dark:text-zinc-300">Terms</a>
              {' '}and have read our{' '}
              <a href="/privacy" target="_blank" rel="noopener noreferrer" className="font-semibold hover:underline text-zinc-800 dark:text-zinc-300">Privacy Policy</a>.
            </p>
            <p className="mt-1">
              We recommend checking out our{' '}
              <a href="/community-guidelines" target="_blank" rel="noopener noreferrer" className="font-semibold hover:underline text-zinc-800 dark:text-zinc-300">community guidelines</a>.
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}



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
7

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
    // appendMessage, (not present in useChat)
  } = useChat({
    api: '/api/chat',
    maxSteps: 5,
    body: { selectedModel },
    initialMessages: [],
    // onStream: (data) => {
    //   if (data && typeof data === 'object' && data.type === 'recursionPrompt') {
    //     setRecursionPrompt(data);
    //     return false;
    //   }
    //   return true;
    // },
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
    if (messages.length === 1 && messages[0].role === 'user' && !titleGeneratedRef.current) {
      const firstUserMessageContent = messages[0].content;
      if (!isVagueOrUnsupportedMessage(firstUserMessageContent)) {
        generateAndSetTitle(firstUserMessageContent).then(() => {
          titleGeneratedRef.current = true;
        });
      }
    }
    if (messages.length === 0 && titleGeneratedRef.current) {
      titleGeneratedRef.current = false;
      document.title = "Avocado Avurna";
    }
    // If user sends a second message and title hasn't been set, try again
    if (messages.length > 1 && !titleGeneratedRef.current) {
      // Find the most recent user message that is not vague/unsupported
      const lastUserMsg = [...messages].reverse().find(m => m.role === 'user' && !isVagueOrUnsupportedMessage(m.content));
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

  const uiIsLoading = status === "streaming" || status === "submitted" || isSubmittingSearch;
  const isMobileOrTabletHook = useMobile();
  // Further increase buffer for desktop to push down the "Avurna uses AI..." message and textarea
  // Push chat view down on all devices (more)
  // Instead of buffer, use a real padding-bottom on the message container
  const inputAreaPadding = inputAreaHeight + 120;
  const currentYear = new Date().getFullYear();

  return (
    <div className="relative flex flex-col h-dvh overflow-y-hidden overscroll-none w-full max-w-full bg-background dark:bg-background">
      <Header />

      <div
        ref={containerRef}
        className={
          `flex-1 w-full sm:mb-12 scrollbar-thin ` +
          (hasSentMessage ? "overflow-y-auto overscroll-auto" : "overflow-y-hidden overscroll-none")
        }
        style={{
          paddingTop:
            typeof isDesktop !== 'undefined' && !isDesktop
              ? '96px'
              : typeof isDesktop !== 'undefined' && isDesktop
                ? '96px' // Add extra top padding for desktop
                : '96px',
          paddingBottom: `${inputAreaPadding}px`,
        }}
      >
        {typeof isDesktop === "undefined" ? null : !hasSentMessage ? (
          <div className="flex h-full items-center justify-center">
            <div className="w-full px-4 pb-4 sm:pb-10 flex flex-col items-center max-w-xl lg:max-w-[50rem]">
              <ProjectOverview />
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
                  />
                </form>
              )}
              {isDesktop && (
                <>
                  <div className="fixed left-1/2 -translate-x-1/2 bottom-1 z-30 flex justify-center pointer-events-none">
                    <span className="text-sm font-normal text-zinc-600 dark:text-zinc-300 select-none bg-background/90 dark:bg-background/90 px-4 py-2 rounded-xl pointer-events-auto">
                      By messaging Avurna, you agree to our{' '}
                      <a href="/terms" target="_blank" rel="noopener noreferrer" className="font-bold text-zinc-700 dark:text-zinc-200 hover:text-zinc-900 dark:hover:text-white no-underline">Terms</a>
                      {' '}and our{' '}
                      <a href="/privacy" target="_blank" rel="noopener noreferrer" className="font-bold text-zinc-700 dark:text-zinc-200 hover:text-zinc-900 dark:hover:text-white no-underline">Privacy Policy</a>.
                    </span>
                  </div>
                  <div className="fixed left-4 bottom-0 z-30 py-2">
                    <span className="text-sm font-normal text-zinc-600 dark:text-zinc-300 select-none">
                      © {currentYear} Avocado
                    </span>
                  </div>
                  <div className="fixed right-4 bottom-0 z-30 py-2">
                    <div className="inline-flex items-center gap-x-3">
                      <a href="https://x.com/YourXProfile" className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors duration-150" target="_blank" rel="noopener noreferrer" aria-label="Visit our X profile"><XIcon size={18} /></a>
                      <a href="https://linkedin.com/company/YourLinkedIn" className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors duration-150" target="_blank" rel="noopener noreferrer" aria-label="Visit our LinkedIn profile"><LinkedInIcon size={18} /></a>
                      <a href="https://github.com/YourGithub" className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors duration-150" target="_blank" rel="noopener noreferrer" aria-label="Visit our GitHub"><Github className="size-[18px]" /></a>
                    </div>
                  </div>
                </>
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
            style={{ pointerEvents: showMobileInfoMessage ? 'auto' : undefined }}
          >
            <div
              id="safearea"
              ref={inputAreaRef}
              className="w-full max-w-3xl mx-auto px-2 sm:px-4 pt-2 pb-3 sm:pb-4 relative"
              style={{ pointerEvents: 'auto' }}
            >
              <FadeMobileInfo show={showMobileInfoMessage} />
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