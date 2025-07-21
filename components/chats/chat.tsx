"use client";

import React, { FormEvent, ChangeEvent, Dispatch } from "react";
import { getDefaultModel } from "@/ai/providers";
import { useUser } from "@clerk/nextjs";
import { useLiveSuggestedPrompts } from '@/hooks/use-suggested-prompts';
import { useChat } from "@ai-sdk/react";
import { useRef as useReactRef } from "react";
import { useEffect, useRef, useState, useCallback } from "react";
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
  // CORE FIX #1: Moved useState call from the top level to inside the component.
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([]);

  // All your original logic is preserved below.
  const { isLoaded, isSignedIn } = useUser();
  const [containerRef, endRef, scrollToBottom] = useScrollToBottom();
  const latestUserMessageRef = useRef<HTMLDivElement>(null);
  const [selectedModel, setSelectedModel] = useState<string>(() => getDefaultModel(!!isSignedIn));
  const titleGeneratedRef = useRef(false);
  const [inputAreaHeight, setInputAreaHeight] = useState(0);
  const inputAreaRef = useRef<HTMLDivElement>(null);
  const [isDesktop, setIsDesktop] = useState<undefined | boolean>(undefined);
  const modelForCurrentSubmissionRef = useRef<string>(getDefaultModel(!!isSignedIn));
  const dynamicSuggestedPrompts = useLiveSuggestedPrompts();
  const [predictivePrompts, setPredictivePrompts] = useState<string[]>([]);
  const [isPredicting, setIsPredicting] = useState(false);
  const [isPredictiveVisible, setIsPredictiveVisible] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const MAX_COMPLETION_INPUT_LENGTH = 90;

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
  } = useChat({
    api: '/api/chat',
    maxSteps: 5,
    body: { selectedModel },
    initialMessages: [],
    onError: (error) => {
      console.error("AI-SDK Debug: Error during chat:", error);
      toast.error(error.message || "An error occurred.", { position: "top-center", richColors: true });
      setSelectedModel(getDefaultModel(!!isSignedIn));
      modelForCurrentSubmissionRef.current = getDefaultModel(!!isSignedIn);
    },
  });

  useEffect(() => {
    if (titleGeneratedRef.current) return;
    if (messages.length > 0) {
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

  useEffect(() => {
    if (!isDesktop) return;
    const controller = new AbortController();
    if (!input.trim() || input.trim().length < 3 || input.trim().length > MAX_COMPLETION_INPUT_LENGTH) {
      setPredictivePrompts([]);
      return;
    }
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

  useEffect(() => {
    if (status === 'streaming' || status === 'submitted') {
      setTimeout(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 80);
    }
  }, [status, endRef]);

  const handleScrollToBottom = () => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const uiIsLoading = status === "streaming" || status === "submitted";

  // CORE FIX #2: Added all the missing props to satisfy the interface.
  const chatInputAreaProps = {
    onSendMessage: async (message: string) => {
      // Use the existing handleSubmit logic from this old component
      setInput(message);
      // We need to wait a tick for the state to update before submitting
      setTimeout(() => {
        // Since we don't have a form event, we call append directly.
        // This is a more direct way to trigger the submission.
        append({ role: 'user', content: message });
      }, 0);
    },
    onFileStaged: (files: StagedFile[]) => {
      toast.error("Please log in to upload files.");
    },
    stagedFiles: stagedFiles,
    setStagedFiles: setStagedFiles,
    user: null, // User is not logged in in this component's context
    chatId: null, // No chat ID for a new guest chat

    // --- All your original props are preserved below ---
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
    dynamicSuggestedPrompts: dynamicSuggestedPrompts || [],
    isPredictiveVisible,
    setIsPredictiveVisible,
    disabled: uiIsLoading,
  };

  const showFixedInput = typeof isDesktop !== 'undefined' && (!isDesktop || hasSentMessage);
  const showInflowInput = typeof isDesktop !== 'undefined' && isDesktop && !hasSentMessage;

  return (
    <div className="relative flex flex-col h-dvh overflow-y-hidden overscroll-none w-full max-w-full bg-background dark:bg-background">
      <Header />
      <div
        ref={containerRef}
        className={`w-full flex-1 scrollbar-thin ${hasSentMessage ? "overflow-y-auto overscroll-auto" : "overflow-y-hidden overscroll-none flex flex-col justify-center items-center"}`}
        style={{
          paddingTop: hasSentMessage ? '96px' : '0',
          paddingBottom: `${showFixedInput ? inputAreaHeight : 0}px`,
        }}
      >
        {!hasSentMessage ? (
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

      {showFixedInput && (
        <div
          ref={inputAreaRef}
          className="fixed bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-background via-background/90 to-transparent dark:from-background dark:via-background/90"
        >
          <div className="w-full max-w-[50rem] mx-auto px-2 sm:px-4 pt-2 pb-3 sm:pb-4">
            <ChatInputArea {...chatInputAreaProps} />
          </div>
        </div>
      )}
    </div>
  );
}