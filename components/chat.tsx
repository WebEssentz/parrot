"use client";

import { useMobile } from "../hooks/use-mobile"; // Assuming path
import { defaultModel } from "@/ai/providers";
import { SEARCH_MODE } from "@/components/ui/textarea"; // Ensure this is the correct path
import { useChat } from "@ai-sdk/react";
import { useEffect, useRef, useState, useCallback } from "react";
import { Textarea as CustomTextareaWrapper } from "./textarea"; // Renamed to avoid confusion with Shadcn Textarea
import { ProjectOverview } from "./project-overview";
import { Messages } from "./messages";
import { useScrollToBottom } from "@/lib/hooks/use-scroll-to-bottom";
import { Header } from "./header";
import React from "react";
import { toast } from "sonner";
import { Github, LinkedInIcon, XIcon } from "./icons"; // Assuming path


// const REASON_MODEL_ID = "qwen-qwq-32b"; // Consistent definition


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
    if (data.title) {
      document.title = data.title;
      // console.log("Chat title updated to:", data.title);
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

  const textareaFormRef = useRef<HTMLFormElement>(null);
  const [textareaComputedHeight, setTextareaComputedHeight] = useState(0);

  const [isSubmittingSearch, setIsSubmittingSearch] = useState(false);
  // This ref will store the model intended for the CURRENT submission
  const modelForCurrentSubmissionRef = useRef<string>(defaultModel);


  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit: originalHandleSubmit,
    status, // 'idle', 'submitted', 'streaming', 'error'
    stop,
    setMessages,
    reload,
    append,
  } = useChat({
    api: '/api/chat',
    maxSteps: 5,
    // The `body` here uses the `selectedModel` state.
    // We will override this with `modelForCurrentSubmissionRef` specifically when calling `originalHandleSubmit`.
    body: { selectedModel }, 
    initialMessages: [],
    onFinish: (_message, _options) => {
      // console.log("useChat: onFinish. Resetting selectedModel from:", selectedModel, "to defaultModel. Clearing isSubmittingSearch.");
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
      console.error("useChat: onError. Resetting selectedModel and isSubmittingSearch.", error);
      setSelectedModel(defaultModel);
      setIsSubmittingSearch(false);
      modelForCurrentSubmissionRef.current = defaultModel;
    },
  });

  useEffect(() => {
    if (messages.length === 1 && messages[0].role === 'user' && !titleGeneratedRef.current) {
      const firstUserMessageContent = messages[0].content;
      titleGeneratedRef.current = true;
      generateAndSetTitle(firstUserMessageContent);
    }
    if (messages.length === 0 && titleGeneratedRef.current) {
      titleGeneratedRef.current = false;
      document.title = "Atlas AI";
    }
  }, [messages]);

   const handleSubmit = useCallback((e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    // `selectedModel` (state) here reflects the user's current toggle combination from textarea.tsx
    const intendedModelForThisSubmit = selectedModel; 
    modelForCurrentSubmissionRef.current = intendedModelForThisSubmit;

    if (intendedModelForThisSubmit === SEARCH_MODE) {
      if (isSubmittingSearch) return;
      setIsSubmittingSearch(true);
    } else if (isSubmittingSearch && modelForCurrentSubmissionRef.current === SEARCH_MODE) {
        // This means a previous submission was a search and isSubmittingSearch is still true
        return; 
    }

    originalHandleSubmit(e, {
        body: { selectedModel: modelForCurrentSubmissionRef.current } 
    });

    if (showMobileInfoMessage) setShowMobileInfoMessage(false);
    setTimeout(() => scrollToBottom(), 200);
  }, [selectedModel, isSubmittingSearch, input, originalHandleSubmit, showMobileInfoMessage, scrollToBottom]);


  useEffect(() => {
    const measureAndUpdateHeight = () => {
      if (inputAreaRef.current) {
        const newHeight = inputAreaRef.current.offsetHeight;
        setInputAreaHeight(newHeight);
      }
    };
    measureAndUpdateHeight();
    const observer = new ResizeObserver(measureAndUpdateHeight);
    if (inputAreaRef.current) {
      observer.observe(inputAreaRef.current);
    }
    window.addEventListener('resize', measureAndUpdateHeight);
    return () => {
      if (inputAreaRef.current) {
        observer.unobserve(inputAreaRef.current);
      }
      observer.disconnect();
      window.removeEventListener('resize', measureAndUpdateHeight);
    };
  }, [showMobileInfoMessage]);

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

  useEffect(() => {
    const measureTextareaFormHeight = () => {
      if (textareaFormRef.current) {
        setTextareaComputedHeight(textareaFormRef.current.offsetHeight);
      }
    };
    measureTextareaFormHeight();
    const observer = new ResizeObserver(measureTextareaFormHeight);
    if (textareaFormRef.current) {
      observer.observe(textareaFormRef.current);
    }
    window.addEventListener('resize', measureTextareaFormHeight);
    return () => {
      if (textareaFormRef.current) {
        observer.unobserve(textareaFormRef.current);
      }
      observer.disconnect();
      window.removeEventListener('resize', measureTextareaFormHeight);
    };
  }, [input]);

  // isLoading state for disabling UI elements.
  // It's true if the chat is generally active OR if we've specifically flagged a search is submitting.
  const uiIsLoading = status === "streaming" || status === "submitted" || isSubmittingSearch;

  const isMobileOrTablet = useMobile();
  const bufferForInputArea = isMobileOrTablet ? 200 : 100;
  const currentYear = new Date().getFullYear();

  return (
    <div className="relative flex flex-col h-dvh overflow-y-hidden overscroll-none w-full max-w-full bg-background dark:bg-background">
      <Header />

      <div
        ref={containerRef}
        className={
          `flex-1 w-full pt-8 sm:pt-12 scrollbar-thin ` +
          ((messages.length > 0) ? "overflow-y-auto overscroll-auto" : "overflow-y-hidden overscroll-none")
        }
        style={{
          paddingBottom:
            typeof isDesktop !== 'undefined' && isDesktop
              ? (inputAreaHeight > 0 ? `${inputAreaHeight + bufferForInputArea}px` : `${100 + bufferForInputArea}px`)
              : `${bufferForInputArea}px`,
        }}
      >
        {typeof isDesktop === "undefined" ? null : messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="w-full px-4 flex flex-col items-center max-w-xl lg:max-w-3xl">
              <ProjectOverview />
              {isDesktop && (
                <form onSubmit={handleSubmit} className="w-full max-w-3xl mx-auto mt-6 ">
                  <CustomTextareaWrapper
                    selectedModel={selectedModel} // Pass current operation mode (resets to default after op)
                    setSelectedModel={setSelectedModel} // Allow textarea to set next operation mode
                    handleInputChange={handleInputChange}
                    input={input}
                    isLoading={uiIsLoading}
                    status={status}
                    stop={stop}
                  />
                </form>
              )}
              {isDesktop && (
                <>
                  <div className="fixed left-1/2 -translate-x-1/2 bottom-0 z-30 flex justify-center pointer-events-none">
                    <span className="text-sm font-normal text-zinc-600 dark:text-zinc-300 select-none bg-background/90 dark:bg-background/90 px-4 py-2 rounded-xl pointer-events-auto">
                      By messaging Atlas, you agree to our{' '}
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
                      <a href="https://x.com/YourXProfile" className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors duration-150" target="_blank" rel="noopener noreferrer" aria-label="Visit our X profile"><XIcon size={18}/></a>
                      <a href="https://linkedin.com/company/YourLinkedIn" className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors duration-150" target="_blank" rel="noopener noreferrer" aria-label="Visit our LinkedIn profile"><LinkedInIcon size={18}/></a>
                      <a href="https://github.com/YourGithub" className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors duration-150" target="_blank" rel="noopener noreferrer" aria-label="Visit our GitHub"><Github className="size-[18px]"/></a>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        ) : (
          <Messages
            messages={messages}
            isLoading={uiIsLoading} // Pass comprehensive loading state
            status={status as any} // Pass original status for detailed UI states in Messages
            endRef={endRef as React.RefObject<HTMLDivElement>}
          />
        )}
        <div ref={endRef as React.RefObject<HTMLDivElement>} style={{ height: 1 }} />
      </div>

      {(typeof isDesktop === "undefined") ? null : (!isDesktop || messages.length > 0) && (
        <div
          ref={inputAreaRef}
          className="fixed bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-background via-background to-transparent dark:from-background dark:via-background"
        >
          <div className="w-full max-w-3xl mx-auto px-2 sm:px-4 pt-2 pb-3 sm:pb-4">
            {showMobileInfoMessage && (
              <div
                className="text-left text-xs text-zinc-700 dark:text-zinc-400 mb-2 mx-0.5 p-3 bg-zinc-100 dark:bg-zinc-800/80 rounded-xl flex flex-col justify-center"
                style={{
                  minHeight: textareaComputedHeight > 0 ? `${textareaComputedHeight}px` : 'auto',
                }}
              >
                <div>
                  <p>
                    By messaging Atlas you agree with our{' '}
                    <a href="/terms" target="_blank" rel="noopener noreferrer" className="font-semibold hover:underline text-zinc-800 dark:text-zinc-300">Terms</a>
                    {' '}and have read our{' '}
                    <a href="/privacy" target="_blank" rel="noopener noreferrer" className="font-semibold hover:underline text-zinc-800 dark:text-zinc-300">Privacy Policy</a>.
                  </p>
                  <p className="mt-1">
                    We recommend checking out our{' '}
                    <a href="/community-guidelines" target="_blank" rel="noopener noreferrer" className="font-semibold hover:underline text-zinc-800 dark:text-zinc-300">community guidelines</a>.
                  </p>
                </div>
              </div>
            )}
            
            <form ref={textareaFormRef} onSubmit={handleSubmit} className="w-full">
              <CustomTextareaWrapper
                selectedModel={selectedModel}
                setSelectedModel={setSelectedModel}
                handleInputChange={handleInputChange}
                input={input}
                isLoading={uiIsLoading}
                status={status}
                stop={stop}
              />
            </form>

            {(messages.length > 0) && !showMobileInfoMessage && (
              <div className="text-center mt-1.5">
                <span className="text-xs text-zinc-600 dark:text-zinc-300 px-4 py-0.5 select-none">
                  Atlas uses AI. Double check response.
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}