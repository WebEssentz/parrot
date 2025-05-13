// src/app/chat.tsx (or wherever your main Chat component is)
"use client";

import { defaultModel } from "@/ai/providers";
import { SEARCH_MODE } from "@/components/ui/textarea";
import { useChat } from "@ai-sdk/react";
import { useEffect, useRef, useState } from "react";
import { Textarea } from "./textarea";
import { ProjectOverview } from "./project-overview";
import { Messages } from "./messages";
import { useScrollToBottom } from "@/lib/hooks/use-scroll-to-bottom";
import { Header } from "./header";
import React from "react";
import { toast } from "sonner";
import { DiscordIconSvg, Github, InstagramIcon, LinkedInIcon, XIcon } from "./icons";

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
  const [containerRef, endRef, scrollToBottom] = useScrollToBottom();
  const [selectedModel, setSelectedModel] = useState<string>(defaultModel);
  const titleGeneratedRef = useRef(false);
  const [inputAreaHeight, setInputAreaHeight] = useState(0);
  const inputAreaRef = useRef<HTMLDivElement>(null);
  const [isDesktop, setIsDesktop] = useState<undefined | boolean>(undefined);

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 1024); // Assuming 1024px is your desktop breakpoint
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit: originalHandleSubmit,
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
      document.title = "Atlas AI";
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    originalHandleSubmit(e);
    setTimeout(() => {
      scrollToBottom();
    }, 200);
  };

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
  }, []);

  const isLoading = status === "streaming" || status === "submitted";
  const bufferForInputArea = 100;
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
          <div className="flex h-full items-center justify-center"> {/* Main content area when no messages */}
            <div className="w-full px-4 flex flex-col items-center max-w-xl lg:max-w-3xl"> {/* Inner content wrapper */}
              <ProjectOverview />
              {isDesktop && (
                <form
                  onSubmit={handleSubmit}
                  className="w-full max-w-3xl mx-auto mt-6 "
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
              
              {/* Desktop-only footer elements are outside the above inner content wrapper, but inside the main content area for no messages */}
              {/* This grouping ensures they only appear when messages.length === 0 AND isDesktop */}
              {isDesktop && (
                <>
                  {/* Terms message (CENTERED) */}
                  <div className="fixed left-1/2 -translate-x-1/2 bottom-0 z-30 flex justify-center pointer-events-none"> {/* pointer-events-none if it's purely informational and shouldn't block clicks below */}
                    <span className="text-sm font-normal text-zinc-600 dark:text-zinc-300 select-none bg-background/90 dark:bg-background/90 px-4 py-2 rounded-xl pointer-events-auto"> {/* pointer-events-auto for the span if links inside need to be clickable */}
                      By messaging Atlas, you agree to our{' '}
                      <a
                        href="/terms"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-bold text-zinc-700 dark:text-zinc-200 hover:text-zinc-900 dark:hover:text-white no-underline"
                      >
                        Terms
                      </a>
                      {' '}and have read our{' '}
                      <a
                        href="/privacy"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-bold text-zinc-700 dark:text-zinc-200 hover:text-zinc-900 dark:hover:text-white no-underline"
                      >
                        Privacy Policy
                      </a>.
                    </span>
                  </div>

                  {/* Copyright Notice (LEFT) */}
                  <div className="fixed left-4 bottom-0 z-30 py-2">
                    <span className="text-sm font-normal text-zinc-600 dark:text-zinc-300 select-none">
                      © Avocado {currentYear}
                    </span>
                  </div>

                  {/* Social Icons (RIGHT) */}
                  <div className="fixed right-4 bottom-0 z-30 py-2">
                    <div className="inline-flex items-center gap-x-2.5"> {/* Or gap-x-2 / gap-x-3 if 2.5 is custom */}
                      <a
                        data-icon="i-bolt:logos-x?mask text-4" // Keep your icon system classes
                        href="https://x.com/YourXProfile" // Replace with your actual X link
                        className="i-bolt:logos-x?mask text-4 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200" // Generic colors
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Visit our X profile"
                      ><XIcon/></a>
                      <a
                        data-icon="i-bolt:logos-linkedin?mask text-3.5" // Keep your icon system classes
                        href="https://linkedin.com/company/YourLinkedIn" // Replace with your actual LinkedIn link
                        className="i-bolt:logos-linkedin?mask text-3.5 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200" // Generic colors
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Visit our LinkedIn profile"
                      ><LinkedInIcon/></a>
                      {/* <a
                        data-icon="i-bolt:logos-discord?mask text-5" // Keep your icon system classes
                        href="https://discord.gg/YourDiscord" // Replace with your actual Discord link
                        className="i-bolt:logos-discord?mask text-5 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200" // Generic colors
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Join our Discord server"
                      ><InstagramIcon/></a> */}
                      <a
                        data-icon="i-bolt:logos-github?mask text-5" // Keep your icon system classes
                        href="https://github.com/YourGithub" // Replace with your actual GitHub link
                        className="i-bolt:logos-github?mask text-5 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200" // Generic colors
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Join our GitHub"
                      ><Github/></a>
                    </div>
                  </div>
                </>
              )}
            </div> {/* End of inner content wrapper */}
          </div> /* End of main content area when no messages */
        ) : (
          <Messages messages={messages} isLoading={isLoading} status={status as any} endRef={endRef as React.RefObject<HTMLDivElement>} />
        )}
        <div ref={endRef as React.RefObject<HTMLDivElement>} style={{ height: 1 }} />
      </div>

      {(typeof isDesktop === "undefined") ? null : (!isDesktop || messages.length > 0) && (
        // ... your fixed input area for mobile or when messages exist ...
        <div
          ref={inputAreaRef}
          className="fixed bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-background via-background to-transparent dark:from-background dark:via-background"
        >
          <div className="w-full px-2 sm:px-4 pt-2 pb-3 sm:pb-4">
            <form
              onSubmit={handleSubmit}
              className="w-full max-w-3xl mx-auto mb-3"
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
            {(messages.length > 0) && (
              <div className="w-full max-w-4xl mx-auto fixed left-1/2 -translate-x-1/2 bottom-0 z-30 flex justify-center pointer-events-none">
                <span className="text-xs text-zinc-600 dark:text-zinc-300 px-4 py-2 select-none">
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