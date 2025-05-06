"use client";

import { Modal } from "./ui/modal";
import type { Message as TMessage } from "ai";
import { AnimatePresence, motion } from "motion/react";
import { memo, useCallback, useEffect, useState, useRef } from "react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import equal from "fast-deep-equal";

import { Markdown } from "./markdown";
import { cn } from "@/lib/utils";
import {
  CheckCircle,
  ChevronDownIcon,
  ChevronUpIcon,
  Loader2,
  PocketKnife,
  SparklesIcon,
  StopCircle,
} from "lucide-react";
import { SpinnerIcon } from "./icons";
import { StreamingTextRenderer } from "./streaming-text-renderer";

// Copy icon SVG as a React component
const CopyIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="stroke-[2] size-4" {...props}>
    <rect x="3" y="8" width="13" height="13" rx="4" stroke="currentColor"></rect>
    <path fillRule="evenodd" clipRule="evenodd" d="M13 2.00004L12.8842 2.00002C12.0666 1.99982 11.5094 1.99968 11.0246 2.09611C9.92585 2.31466 8.95982 2.88816 8.25008 3.69274C7.90896 4.07944 7.62676 4.51983 7.41722 5.00004H9.76392C10.189 4.52493 10.7628 4.18736 11.4147 4.05768C11.6802 4.00488 12.0228 4.00004 13 4.00004H14.6C15.7366 4.00004 16.5289 4.00081 17.1458 4.05121C17.7509 4.10066 18.0986 4.19283 18.362 4.32702C18.9265 4.61464 19.3854 5.07358 19.673 5.63807C19.8072 5.90142 19.8994 6.24911 19.9488 6.85428C19.9992 7.47112 20 8.26343 20 9.40004V11C20 11.9773 19.9952 12.3199 19.9424 12.5853C19.8127 13.2373 19.4748 13.8114 19 14.2361V16.5829C20.4795 15.9374 21.5804 14.602 21.9039 12.9755C22.0004 12.4907 22.0002 11.9334 22 11.1158L22 11V9.40004V9.35725C22 8.27346 22 7.3993 21.9422 6.69141C21.8826 5.96256 21.7568 5.32238 21.455 4.73008C20.9757 3.78927 20.2108 3.02437 19.27 2.545C18.6777 2.24322 18.0375 2.1174 17.3086 2.05785C16.6007 2.00002 15.7266 2.00003 14.6428 2.00004L14.6 2.00004H13Z" fill="currentColor"></path>
  </svg>
);

const CheckIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="stroke-[2] size-4" {...props}>
    <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Utility to detect mobile
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return isMobile;
}

// Utility to copy text to clipboard
function copyToClipboard(text: string) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text);
  } else {
    // fallback
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }
}

interface ReasoningPart {
  type: "reasoning";
  reasoning: string;
  details: Array<{ type: "text"; text: string }>;
}

interface ReasoningMessagePartProps {
  part: ReasoningPart;
  isReasoning: boolean;
}

// Utility: Extract sources from markdown string (between <!-- PARROT_SOURCES_START --> and <!-- PARROT_SOURCES_END -->)
export function extractSourcesFromText(text: string): { title: string; url: string }[] {
  const sources: { title: string; url: string }[] = [];
  const start = text.indexOf("<!-- PARROT_SOURCES_START -->");
  const end = text.indexOf("<!-- PARROT_SOURCES_END -->");
  if (start === -1 || end === -1 || end < start) return sources;
  const block = text.slice(start, end);
  // Match - [Title](URL)
  const regex = /- \[(.*?)\]\((.*?)\)/g;
  let match;
  while ((match = regex.exec(block))) {
    sources.push({ title: match[1] || "Source", url: match[2] });
  }
  return sources;
}

export function ReasoningMessagePart({
  part,
  isReasoning,
}: ReasoningMessagePartProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const variants = {
    collapsed: {
      height: 0,
      opacity: 0,
      marginTop: 0,
      marginBottom: 0,
    },
    expanded: {
      height: "auto",
      opacity: 1,
      marginTop: "1rem",
      marginBottom: 0,
    },
  };

  const memoizedSetIsExpanded = useCallback((value: boolean) => {
    setIsExpanded(value);
  }, []);

  useEffect(() => {
    memoizedSetIsExpanded(isReasoning);
  }, [isReasoning, memoizedSetIsExpanded]);

  return (
    <div className="flex flex-col">
      {isReasoning ? (
        <div className="flex flex-row gap-2 items-center">
          <div className="font-medium text-sm pl-4 mt-1">Reasoning</div>
          <div className="animate-spin">
            <SpinnerIcon />
          </div>
        </div>
      ) : (
        <div className="flex flex-row gap-2 items-center">
          <div className="font-medium text-sm pl-4 mt-1">Reasoned for a few seconds</div>
          <button
            className={cn(
              "cursor-pointer rounded-full dark:hover:bg-zinc-800 hover:bg-zinc-200",
              {
                "dark:bg-zinc-800 bg-zinc-200": isExpanded,
              },
            )}
            onClick={() => {
              setIsExpanded(!isExpanded);
            }}
          >
            {isExpanded ? (
              <ChevronDownIcon className="h-4 w-4" />
            ) : (
              <ChevronUpIcon className="h-4 w-4" />
            )}
          </button>
        </div>
      )}

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            key="reasoning"
            className="text-sm dark:text-zinc-400 text-zinc-600 flex flex-col gap-4 border-l pl-3 dark:border-zinc-800"
            initial="collapsed"
            animate="expanded"
            exit="collapsed"
            variants={variants}
            transition={{ duration: 0.2, ease: "easeInOut" }}
          >
            {part.details.map((detail, detailIndex) =>
              detail.type === "text" ? (
                <Markdown key={detailIndex}>{detail.text}</Markdown>
              ) : (
                "<redacted>"
              ),
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const PurePreviewMessage = ({
  message,
  isLatestMessage,
  status,
}: {
  message: TMessage;
  isLoading: boolean;
  status: "error" | "submitted" | "streaming" | "ready";
  isLatestMessage: boolean;
}) => {
  // Extract sources from all text parts
  const allText = message.parts?.filter((p: any) => p.type === "text").map((p: any) => p.text).join("\n\n") || "";
  const sources = extractSourcesFromText(allText);
  const [showSources, setShowSources] = useState(false);
  const isAssistant = message.role === "assistant";
  const isMobile = useIsMobile();
  const [copied, setCopied] = useState(false);
  const copyTimeout = useRef<NodeJS.Timeout | null>(null);

  // Get the full AI message text (all text parts, sources block stripped)
  const aiMessageText = message.parts?.filter((p: any) => p.type === "text").map((p: any) => p.text).join("\n\n") || "";

  const handleCopy = () => {
    copyToClipboard(aiMessageText);
    setCopied(true);
    if (copyTimeout.current) clearTimeout(copyTimeout.current);
    copyTimeout.current = setTimeout(() => setCopied(false), 1000);
  };

  useEffect(() => () => { if (copyTimeout.current) clearTimeout(copyTimeout.current); }, []);
  return (
    <AnimatePresence key={message.id}>
      <motion.div
        className="w-full mx-auto px-2 sm:px-4 group/message sm:max-w-4xl"
        initial={{ y: 5, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        key={`message-${message.id}`}
        data-role={message.role}
      >
        {/* Sources Button */}
        {isAssistant && sources.length > 0 && (
          <div className="flex justify-end mb-1">
            <button
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-zinc-100 dark:bg-zinc-800 text-sm font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 shadow-sm"
              onClick={() => setShowSources(true)}
              type="button"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 1.333A6.667 6.667 0 1 0 8 14.667 6.667 6.667 0 0 0 8 1.333Zm0 12A5.333 5.333 0 1 1 8 2.667a5.333 5.333 0 0 1 0 10.666Zm.667-8H7.333v3.334l2.834 1.7.666-1.1-2.166-1.3V5.333Z" fill="currentColor" /></svg>
              Sources ({sources.length})
            </button>
          </div>
        )}

        {/* Sources Modal */}
        <Modal open={showSources} onClose={() => setShowSources(false)}>
          <div className="p-4 max-h-[70vh] w-full min-w-[260px] flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <div className="font-semibold text-lg">Sources</div>
              <button onClick={() => setShowSources(false)} className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white p-1 rounded transition-colors" aria-label="Close sources modal">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M6 6l8 8M6 14L14 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
              </button>
            </div>
            <div className="overflow-y-auto max-h-[55vh] pr-1">
              {sources.map((src, i) => {
                let icon = <img src="/globe.svg" alt="site" className="w-5 h-5 mr-2 inline-block align-middle" />;
                try {
                  const u = new URL(src.url);
                  if (u.protocol === "file:") icon = <img src="/file.svg" alt="file" className="w-5 h-5 mr-2 inline-block align-middle" />;
                  else if (u.protocol === "window:") icon = <img src="/window.svg" alt="window" className="w-5 h-5 mr-2 inline-block align-middle" />;
                } catch { }
                return (
                  <a
                    key={src.url + i}
                    href={src.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-2 py-2 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors mb-1"
                  >
                    {icon}
                    <span className="font-medium text-zinc-800 dark:text-zinc-100 truncate max-w-[180px]">{src.title}</span>
                    <span className="text-xs text-zinc-500 truncate max-w-[120px]">{src.url}</span>
                  </a>
                );
              })}
              {sources.length === 0 && <div className="text-zinc-500 text-sm">No sources found.</div>}
            </div>
          </div>
        </Modal>
        {/* Mobile: assistant icon above message bubble, left-aligned */}
        <div
          className={cn(
            isAssistant
              ? "flex w-full flex-col sm:flex-row items-start"
              : "flex flex-row gap-4 w-full group-data-[role=user]/message:ml-auto group-data-[role=user]/message:max-w-2xl group-data-[role=user]/message:w-fit",
          )}
        >
          {/* Desktop: Copy icon left of AI icon, animates in on hover (fade in on hover, hidden otherwise) */}
          {isAssistant && !isMobile && status === "ready" && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.2 }}
              className="mr-2 flex items-center"
              style={{ pointerEvents: 'none' }}
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label="Copy message"
                    className="rounded-full p-1 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800 opacity-0 group-hover/message:opacity-100 focus:opacity-100 cursor-pointer"
                    style={{ color: '#828282', pointerEvents: 'auto', transition: 'opacity 0.2s' }}
                    onClick={handleCopy}
                  >
                    {copied ? <CheckIcon style={{ color: '#828282', transition: 'all 0.2s' }} /> : <CopyIcon style={{ color: '#828282', transition: 'all 0.2s' }} />}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="select-none">{copied ? "Copied!" : "Copy"}</TooltipContent>
              </Tooltip>
            </motion.div>
          )}
          {/* AI icon */}
          {isAssistant && (
            <div className="mb-1 sm:mb-0 size-8 flex items-center rounded-full justify-center ring-1 shrink-0 ring-border bg-background" style={{ alignSelf: 'flex-start' }}>
              <div>
                <SparklesIcon size={14} />
              </div>
            </div>
          )}

          {isAssistant ? (
            <div
              className="w-full"
              style={{ marginLeft: 0, paddingLeft: 0 }}
            >
              <div className="flex flex-col space-y-4" style={{ alignItems: 'flex-start' }}>
                {message.parts?.map((part, i) => {
                  switch (part.type) {
                    // Inside PurePreviewMessage, when rendering a 'text' part:
                    case "text":
                      const isEffectivelyLastPart = i === (message.parts?.length || 0) - 1;
                      // status here is the per-message status passed correctly
                      const isActivelyStreamingText = isAssistant && status === "streaming" && isLatestMessage && isEffectivelyLastPart;

                      return (
                        <motion.div
                          initial={isActivelyStreamingText ? false : { y: 5, opacity: 0 }}
                          animate={isActivelyStreamingText ? {} : { y: 0, opacity: 1 }}
                          // exit={{ opacity: 0 }} // Keep if needed
                          transition={{ duration: 0.2 }}
                          key={`message-${message.id}-part-${i}`}
                          className="flex flex-row items-start w-full pb-4"
                        >
                          <div
                            className="flex flex-col gap-4 px-4 py-2"
                            style={{ marginLeft: 0, alignItems: 'flex-start', background: 'none', border: 'none', boxShadow: 'none' }}
                          >
                            <Markdown>{part.text}</Markdown> {/* Investigate this component's performance */}
                          </div>
                        </motion.div>
                      );
                    case "tool-invocation":
                      const { toolName, state } = part.toolInvocation;

                      return (
                        <motion.div
                          initial={{ y: 5, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          key={`message-${message.id}-part-${i}`}
                          className="flex flex-col gap-2 p-2 mb-3 text-sm bg-zinc-50 dark:bg-zinc-900 rounded-md border border-zinc-200 dark:border-zinc-800"
                        >
                          <div className="flex-1 flex items-center justify-center">
                            <div className="flex items-center justify-center w-8 h-8 bg-zinc-50 dark:bg-zinc-800 rounded-full">
                              <PocketKnife className="h-4 w-4" />
                            </div>
                            <div className="flex-1">
                              <div className="font-medium flex items-baseline gap-2">
                                {state === "call" ? "Calling" : "Called"}{" "}
                                <span className="font-mono bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-md">
                                  {toolName}
                                </span>
                              </div>
                            </div>
                            <div className="w-5 h-5 flex items-center justify-center">
                              {state === "call" ? (
                                isLatestMessage && status !== "ready" ? (
                                  <Loader2 className="animate-spin h-4 w-4 text-zinc-500" />
                                ) : (
                                  <StopCircle className="h-4 w-4 text-red-500" />
                                )
                              ) : state === "result" ? (
                                <CheckCircle size={14} className="text-green-600" />
                              ) : null}
                            </div>
                          </div>
                        </motion.div>
                      );
                    case "reasoning":
                      return (
                        <ReasoningMessagePart
                          key={`message-${message.id}-${i}`}
                          // @ts-expect-error part
                          part={part}
                          isReasoning={
                            (message.parts &&
                              status === "streaming" &&
                              i === message.parts.length - 1) ??
                            false
                          }
                        />
                      );
                    default:
                      return null;
                  }
                })}
              </div>
              {/* Mobile: Copy icon always at the bottom, after the message bubble */}
              {isMobile && isAssistant && status === "ready" && (
                <div className="relative w-full -mt-2">
                  <div className="flex absolute left-0 right-0 justify-start z-10">
                    <div className="flex items-center gap-1 p-1 select-none -mt-3 pointer-events-auto">
                      <button
                        type="button"
                        aria-label="Copy message"
                        className="text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg focus:outline-none flex h-[36px] w-[36px] items-center justify-center"
                        style={{ color: '#828282', background: 'transparent' }}
                        onClick={handleCopy}
                      >
                        {copied ? <CheckIcon style={{ color: '#828282', transition: 'all 0.2s' }} /> : <CopyIcon style={{ color: '#828282', transition: 'all 0.2s' }} />}
                      </button>
                      {/* Future action buttons can be added here as more icons */}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col w-full space-y-4">
              {message.parts?.map((part, i) => {
                switch (part.type) {
                  case "text":
                    const isEffectivelyLastPart = i === (message.parts?.length || 0) - 1;
                    // This is the flag that determines if we should use the StreamingTextRenderer
                    const isLatestActivelyStreamingTextPart =
                      isAssistant &&
                      status === "streaming" && // The overall stream is active (or this message's specific stream status)
                      isLatestMessage &&        // This is the last message in the chat
                      isEffectivelyLastPart;    // This is the current text part being streamed

                    return (
                      <motion.div
                        initial={isLatestActivelyStreamingTextPart ? false : { y: 5, opacity: 0 }}
                        animate={isLatestActivelyStreamingTextPart ? {} : { y: 0, opacity: 1 }}
                        transition={{ duration: 0.2 }}
                        key={`message-${message.id}-part-${i}`}
                        className="flex flex-row items-start w-full pb-4"
                      >
                        <div
                          className="flex flex-col gap-4 px-4 py-2 w-full" // Added w-full for consistency
                          style={{
                            marginLeft: 0,
                            alignItems: 'flex-start',
                            background: 'none',
                            border: 'none',
                            boxShadow: 'none',
                          }}
                        >
                          {isLatestActivelyStreamingTextPart ? (
                            <StreamingTextRenderer
                              fullText={part.text}
                              wordSpeed={50} // Adjust speed: 30-75ms is a good range. Lower is faster.
                              asMarkdown={false} // CRITICAL: Keep false for performance during active streaming
                              className="w-full"
                            // onComplete={() => console.log("Typewriter completed for this chunk/message")}
                            />
                          ) : (
                            // Render full Markdown for:
                            // - User messages
                            // - Assistant messages that are not the latest actively streaming part
                            // - The final "ready" state of any assistant message part
                            <div
                              className="bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 px-4 py-2 rounded-xl w-full sm:max-w-2xl shadow"
                            >
                              <Markdown>{part.text}</Markdown>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  default:
                    return null;
                }
              })}
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

// Message.tsx (memo comparison)
export const Message = memo(PurePreviewMessage, (prevProps, nextProps) => {
  if (prevProps.status !== nextProps.status) return false;
  if (prevProps.isLoading !== nextProps.isLoading) return false; // Add this
  if (prevProps.isLatestMessage !== nextProps.isLatestMessage) return false; // Add this
  if (prevProps.message.annotations !== nextProps.message.annotations) return false;
  if (!equal(prevProps.message.parts, nextProps.message.parts)) return false;
  // if (prevProps.message.id !== nextProps.message.id) return false; // Key change handles this
  return true;
});