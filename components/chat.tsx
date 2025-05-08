// src/app/chat.tsx (or wherever your main Chat component is)
"use client";

import { defaultModel } from "@/ai/providers";
import { SEARCH_MODE } from "@/components/ui/textarea"; // Make sure this matches the export from components/ui/textarea
import { useChat } from "@ai-sdk/react";
import { useEffect, useRef, useState } from "react";
import { Textarea } from "./textarea"; // This should be your main Textarea wrapper
import { ProjectOverview } from "./project-overview";
import { Messages } from "./messages";
import { useScrollToBottom } from "@/lib/hooks/use-scroll-to-bottom";
import { Header } from "./header";
import React from "react";
import { toast } from "sonner";


// ... (generateAndSetTitle function remains the same)
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
      console.log("Chat title updated to:", data.title);
    }
  } catch (error) {
    console.error("Error generating title:", error);
  }
}

export default function Chat() {
  // --- SCROLL LOGIC ---
  const [containerRef, endRef, scrollToBottom] = useScrollToBottom();
  const [selectedModel, setSelectedModel] = useState<string>(defaultModel);
  const titleGeneratedRef = useRef(false);
  const [inputAreaHeight, setInputAreaHeight] = useState(0);
  const inputAreaRef = useRef<HTMLDivElement>(null); // Ref for the fixed input area container
  // Desktop-only terms message
  const [isDesktop, setIsDesktop] = useState(false);
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
    handleSubmit: originalHandleSubmit, // Renamed to avoid conflict in this scope
    status,
    stop,
    setMessages,
    reload,
    append,
  } = useChat({
    api: '/api/chat',
    maxSteps: 5,
    body: { selectedModel },
    initialMessages: [],
    onFinish: () => {
      if (selectedModel === SEARCH_MODE) {
        setSelectedModel(defaultModel);
      }
    },
    onError: (error) => {
      toast.error(
        error.message.length > 0
          ? error.message
          : "An error occurred, please try again later.",
        { position: "top-center", richColors: true },
      );
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
      document.title = "Parrot AI";
    }
  }, [messages]);

  
  // Custom handleSubmit for the form
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    originalHandleSubmit(e);
    // After sending a user message, scroll to the very bottom (buffer included)
    setTimeout(() => {
      scrollToBottom();
    }, 200); // Delay to allow DOM update, adjust as needed
  };

  

   // Effect for measuring and updating input area height
 useEffect(() => {
  const measureAndUpdateHeight = () => {
    if (inputAreaRef.current) {
      const newHeight = inputAreaRef.current.offsetHeight;
      console.log("Chat.tsx ResizeObserver: Measured inputArea newHeight:", newHeight);
      setInputAreaHeight(newHeight);
    }
  };

    measureAndUpdateHeight(); // Initial measurement

    const observer = new ResizeObserver(measureAndUpdateHeight);
    if (inputAreaRef.current) {
      observer.observe(inputAreaRef.current);
    }

    // Also listen to window resize for broader layout changes
    window.addEventListener('resize', measureAndUpdateHeight);

    return () => {
      if (inputAreaRef.current) {
        observer.unobserve(inputAreaRef.current);
      }
      observer.disconnect();
      window.removeEventListener('resize', measureAndUpdateHeight);
    };
  }, []); // Re-run if things that might affect its structure change, but observer handles content resize

  const isLoading = status === "streaming" || status === "submitted";
  const bufferForInputArea = 100;

  return (
    <div className="relative flex flex-col h-dvh w-full max-w-full bg-background dark:bg-background">
      <Header />

      {/* SCROLLABLE MESSAGE CONTAINER */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto w-full pt-8 sm:pt-12 scrollbar-thin"
        style={{
          paddingBottom: inputAreaHeight > 0 ? `${inputAreaHeight + bufferForInputArea}px` : `${100 + bufferForInputArea}px`,
        }}
      >
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="w-full px-4 flex flex-col items-center max-w-xl lg:max-w-3xl">
              <ProjectOverview />
              {/* On desktop, show textarea immediately below ProjectOverview */}
              {isDesktop && (
                <form
                  onSubmit={handleSubmit}
                  className="w-full max-w-3xl mx-auto mt-6"
                >
                  <Textarea
                    selectedModel={selectedModel}
                    setSelectedModel={setSelectedModel}
                    handleInputChange={handleInputChange}
                    input={input}
                    isLoading={isLoading}
                    status={status}
                    stop={stop}
                  />
                </form>
              )}
              {/* Desktop-only terms message */}
              {isDesktop && (
                <div className="w-full max-w-3xl mx-auto mb-2 flex justify-center mt-2">
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 select-none">
                    By messaging Parrot, you agree to our{' '}
                    <a
                      href="/terms"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline underline-offset-2 hover:text-zinc-700 dark:hover:text-zinc-200"
                    >
                      Terms
                    </a>
                    {' '}and{' '}
                    <a
                      href="/privacy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline underline-offset-2 hover:text-zinc-700 dark:hover:text-zinc-200"
                    >
                      Privacy Policy
                    </a>.
                  </span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <Messages messages={messages} isLoading={isLoading} status={status as any} endRef={endRef as React.RefObject<HTMLDivElement>} />
        )}
        {/* The endRef is now at the very end of the scrollable area, after the buffer */}
        <div ref={endRef as React.RefObject<HTMLDivElement>} style={{ height: 1 }} />
      </div>

      {/* FIXED INPUT AREA CONTAINER - Only show on mobile or when there are messages */}
      {(!isDesktop || messages.length > 0) && (
        <div
          ref={inputAreaRef}
          className="fixed bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-background via-background to-transparent dark:from-background dark:via-background"
        >
          <div className="w-full px-2 sm:px-4 pt-2 pb-3 sm:pb-4">
            <form
              onSubmit={handleSubmit}
              className="w-full max-w-3xl mx-auto"
            >
              <Textarea
                selectedModel={selectedModel}
                setSelectedModel={setSelectedModel}
                handleInputChange={handleInputChange}
                input={input}
                isLoading={isLoading}
                status={status}
                stop={stop}
              />
            </form>
          </div>
        </div>
      )}
    </div>
  );
}