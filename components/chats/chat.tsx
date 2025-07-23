"use client";

import React, { useEffect, useRef, useState, useLayoutEffect } from "react";
import { getDefaultModel } from "@/ai/providers";
import { useUser } from "@clerk/nextjs";
import { useLiveSuggestedPrompts } from '@/hooks/use-suggested-prompts';
import { useChat } from "@ai-sdk/react";
import { ChatInputArea } from "../chat-input-area";
import { SuggestedPrompts } from "../ui/suggestions/suggested-prompts";
import { ProjectOverview } from "../ui/project-overview";
import { Messages } from "../messages";
import { useScrollToBottom } from "@/lib/hooks/use-scroll-to-bottom";
import { Header } from "../ui/infobar/header";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { BlinkingCursor } from "../ui/blinking-cursor";
import { ScrollToBottomButton } from "../ui/scroll-to-bottom-button";
import { StagedFile } from "./user-chat";

// Helper functions (isVagueOrUnsupportedMessage, generateAndSetTitle) are included.
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
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([]);
  const { isSignedIn } = useUser();
  const [containerRef, endRef] = useScrollToBottom();
  const titleGeneratedRef = useRef(false);
  const [isDesktop, setIsDesktop] = useState(true);
  const dynamicSuggestedPrompts = useLiveSuggestedPrompts();
  const [predictivePrompts, setPredictivePrompts] = useState<string[]>([]);
  const [isPredicting, setIsPredicting] = useState(false);
  const [isPredictiveVisible, setIsPredictiveVisible] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>(() => getDefaultModel(!!isSignedIn));

  const inputAreaRef = useRef<HTMLDivElement>(null);
  const [inputAreaHeight, setInputAreaHeight] = useState(0);

  const MAX_COMPLETION_INPUT_LENGTH = 90;

  useEffect(() => {
    const checkDevice = () => setIsDesktop(window.innerWidth >= 1024);
    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  useLayoutEffect(() => {
    if (isDesktop) return;
    const observer = new ResizeObserver(entries => {
      const entry = entries[0];
      if (entry) setInputAreaHeight(entry.contentRect.height);
    });
    const inputEl = inputAreaRef.current;
    if (inputEl) observer.observe(inputEl);
    return () => { if (inputEl) observer.unobserve(inputEl); };
  }, [isDesktop]);

  useEffect(() => {
    setSelectedModel(getDefaultModel(!!isSignedIn));
  }, [isSignedIn]);

  const { messages, input, handleInputChange, setInput, append, status, stop } = useChat({
    api: '/api/chat',
    body: { selectedModel },
    initialMessages: [],
    onError: (error) => {
      console.error("AI-SDK Debug: Error during chat:", error);
      const position = isDesktop ? "top-center" : "bottom-center";
      toast.error(error.message || "An error occurred.", { position, richColors: true });
      setSelectedModel(getDefaultModel(!!isSignedIn));
    },
  });

  const hasSentMessage = messages.length > 0;
  const uiIsLoading = status === "streaming" || status === "submitted";

  useEffect(() => {
    if (titleGeneratedRef.current) return;
    if (messages.length > 0) {
      const lastUserMsg = [...messages].reverse().find(m => m.role === 'user' && !isVagueOrUnsupportedMessage(m.content));
      if (lastUserMsg) {
        generateAndSetTitle(lastUserMsg.content).then(() => { titleGeneratedRef.current = true; });
      }
    } else if (messages.length === 0 && titleGeneratedRef.current) {
      titleGeneratedRef.current = false;
      document.title = "Avocado Avurna";
    }
  }, [messages]);

  useEffect(() => {
    if (!isDesktop || !input.trim() || input.trim().length < 3 || input.trim().length > MAX_COMPLETION_INPUT_LENGTH) {
      setPredictivePrompts([]);
      return;
    }
    const controller = new AbortController();
    const handler = setTimeout(async () => {
      setIsPredicting(true);
      try {
        const response = await fetch('/api/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ input: input }),
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
        if (!controller.signal.aborted) setIsPredicting(false);
      }
    }, 150);
    return () => {
      clearTimeout(handler);
      controller.abort();
    };
  }, [input, isDesktop]);

  useEffect(() => {
    if (status === 'streaming' || status === 'submitted') {
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [status, endRef]);
  
  const handleScrollToBottom = () => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const chatInputAreaProps = {
    onSendMessage: (message: string) => append({ role: 'user', content: message }),
    onFileStaged: () => toast.error("Please log in to upload files."),
    stagedFiles,
    setStagedFiles,
    user: null,
    chatId: null,
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
    isDesktop,
    selectedModel,
    setSelectedModel,
    dynamicSuggestedPrompts: dynamicSuggestedPrompts || [],
    isPredictiveVisible,
    setIsPredictiveVisible,
    disabled: uiIsLoading,
  };

  return (
    <div className="relative flex flex-col h-dvh overflow-hidden overscroll-none w-full bg-background">
      <Header />
      
      <div
        ref={containerRef}
        className="flex-1 w-full flex flex-col min-h-0 overflow-y-auto scrollbar-thin"
        style={{ paddingBottom: isDesktop ? '0px' : `${inputAreaHeight}px` }}
      >
        {!hasSentMessage ? (
          <div className="flex-1 flex flex-col justify-center items-center px-4 pb-16">
            <div className="flex flex-col items-center w-full max-w-xl lg:max-w-[50rem]">
              <ProjectOverview />
              {isDesktop && (
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
                    <SuggestedPrompts onPromptClick={setInput} isDesktop={isDesktop} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-[50rem] mx-auto px-4 pt-24">
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
            <div ref={endRef} />
          </div>
        )}
      </div>
      
      <ScrollToBottomButton
        isVisible={showScrollButton && hasSentMessage}
        onClick={handleScrollToBottom}
      />

      {(!isDesktop || hasSentMessage) && (
        <div
          ref={inputAreaRef}
          className={
            isDesktop
              ? "shrink-0"
              : "fixed bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-background via-background/90 to-transparent"
          }
        >
          <div className="w-full max-w-[50rem] mx-auto px-2 sm:px-4 pt-2 pb-3 sm:pb-4">
            {!isDesktop && !hasSentMessage && !input && (
              <SuggestedPrompts onPromptClick={setInput} isDesktop={isDesktop} />
            )}
            <ChatInputArea {...chatInputAreaProps} />
          </div>
        </div>
      )}
    </div>
  );
}