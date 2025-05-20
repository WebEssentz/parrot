"use client";
import { Modal } from "./ui/modal";
import type { Message as TMessage } from "ai";
import { AnimatePresence, motion } from "motion/react";
import { useTheme } from "next-themes";
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

// SpinnerIcon: simple loader for tool invocation UI
function SpinnerIcon() {
  return (
    <svg className="h-4 w-4 text-zinc-500" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

// Show AI action icons on hover of any part of the AI message (desktop only).
// The `data-ai-action` elements (which include the copy icon) are only rendered for AI messages on desktop.
if (typeof window !== 'undefined') {
  const styleId = 'ai-message-hover-style';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.innerHTML = `
      .group\\/ai-message-hoverable:hover [data-ai-action] { /* Ensure opacity for elements with data-ai-action on hover of parent group */
        opacity: 1 !important;
      }
    `;
    document.head.appendChild(style);
  }
}

// Utility to detect mobile or tablet (width < 1024)
function useIsMobileOrTablet() {
  const [isMobileOrTablet, setIsMobileOrTablet] = useState(false);
  useEffect(() => {
    const check = () => setIsMobileOrTablet(window.innerWidth < 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return isMobileOrTablet;
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

// Utility: Extract sources from markdown string (between <!-- ATLAS_SOURCES_START --> and <!-- ATLAS_SOURCES_END -->)
export function extractSourcesFromText(text: string): { title: string; url: string }[] {
  const sources: { title: string; url: string }[] = [];
  const start = text.indexOf("<!-- ATLAS_SOURCES_START -->");
  const end = text.indexOf("<!-- ATLAS_SOURCES_END -->");
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

  // No flash effect needed for finished message

  const { theme } = useTheme ? useTheme() : { theme: undefined };
  // No flash effect needed for finished message

  return (
    <div className="flex flex-col">
      {isReasoning ? (
        <div className="flex flex-row items-center gap-1">
          <span className="font-medium text-sm pl-4 mt-1 relative inline-block" style={{ minWidth: 120 }}>
            <span
              key={theme}
              style={{
                background: theme === 'dark'
                  ? 'linear-gradient(90deg, #fff 0%, #fff 40%, #a3a3a3 60%, #fff 100%)'
                  : 'linear-gradient(90deg, #222 0%, #222 40%, #e0e0e0 60%, #222 100%)',
                backgroundSize: '200% 100%',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                // animation: 'atlas-shimmer-text 1.3s linear infinite',
                // animationTimingFunction: 'linear',
                willChange: 'background-position',
                display: 'inline-block',
                transition: 'background 0.2s, color 0.2s',
              }}
              className="!bg-transparent"
            >
              Reasoning
            </span>
            {/* <style>{`
              @keyframes atlas-shimmer-text {
                0% { background-position: -100% 0; }
                50% { background-position: 100% 0; }
                100% { background-position: -100% 0; }
              }
            `}</style> */}
          </span>
          <span className="animate-spin ml-1"><SpinnerIcon /></span>
        </div>
      ) : (
        <div className="flex flex-row gap-2 items-center">
          {/* Click on text expands/collapses reasoning parts */}
          <span
            className="font-medium text-sm pl-4 mt-1 relative inline-block"
            style={{ minWidth: 120, cursor: 'pointer' }}
            onClick={() => setIsExpanded((v) => !v)}
          >
            Reasoned for a few seconds
          </span>
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
  // Move useTheme to the top to ensure consistent hook order
  const { theme } = useTheme ? useTheme() : { theme: undefined };
  // Extract sources from all text parts
  const allText = message.parts?.filter((p: any) => p.type === "text").map((p: any) => p.text).join("\n\n") || "";
  const sources = extractSourcesFromText(allText);
  const [showSources, setShowSources] = useState(false);
  const isAssistant = message.role === "assistant";
  const isMobileOrTablet = useIsMobileOrTablet();
  const [copied, setCopied] = useState(false);
  const copyTimeout = useRef<NodeJS.Timeout | null>(null);

  // Get the full AI message text (all text parts, sources block stripped)
  const aiMessageText = message.parts?.filter((p: any) => p.type === "text").map((p: any) => p.text).join("\n\n") || "";

  const handleCopy = () => {
    copyToClipboard(aiMessageText); // For AI messages
    setCopied(true);
    if (copyTimeout.current) clearTimeout(copyTimeout.current);
    copyTimeout.current = setTimeout(() => setCopied(false), 1000);
  };
  
  const handleUserMessageCopy = (textToCopy: string) => {
    copyToClipboard(textToCopy);
    setCopied(true); // This state is shared, might be fine or might need separate states if interactions overlap
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
              className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 rounded bg-zinc-100 dark:bg-zinc-800 text-sm font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 shadow-sm"
              onClick={() => setShowSources(true)}
              type="button"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 1.333A6.667 6.667 0 1 0 8 14.667 6.667 6.667 0 0 0 8 1.333Zm0 12A5.333 5.333 0 1 1 8 2.667a5.333 5.333 0 0 1 0 10.666Zm.667-8H7.333v3.334l2.834 1.7.666-1.1-2.166-1.3V5.333Z" fill="currentColor" /></svg>
              {sources.length === 1 ? 'Source' : 'Sources'} ({sources.length})
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
                let icon = <img src="/globe.svg" alt="site" className="cursor-pointer w-5 h-5 mr-2 inline-block align-middle" />;
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
          {/* Desktop: Copy icon at the bottom of the AI message bubble */}
          {/* AI icon remains at the top left, copy icon moves to bottom of bubble on desktop */}
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
              className="w-full group/ai-message-hoverable" // Apply group for hover effect over the entire AI message block
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
                      return (
                        <ToolInvocationMessagePart
                          key={`message-${message.id}-part-${i}`}
                          part={part}
                          isLatestMessage={isLatestMessage}
                          status={status}
                        />
                      );
                      // ToolInvocationMessagePart: Reusable, extensible tool invocation UI
                      function getToolStatusLabel(toolName: string, state: string) {
                        // Add more tools here as needed
                        switch (toolName) {
                          case "googleSearch":
                            return state === "call" ? "Searching the Web" : "Searched the Web";
                          case "fetchUrl":
                            return state === "call" ? "Fetching Url data" : "Fetched Url data";
                          case "getWeatherdata":
                          case "weatherTool":
                            return "Getting weather data";
                          default:
                            // Fallback for unknown tools
                            if (state === "call") return `Running ${toolName}`;
                            return `Finished ${toolName}`;
                        }
                      }


                      function ToolInvocationMessagePart({ part, isLatestMessage, status }: {
                        part: any;
                        isLatestMessage: boolean;
                        status: "error" | "submitted" | "streaming" | "ready";
                      }) {
                        const { toolName, state } = part.toolInvocation;
                        const label = getToolStatusLabel(toolName, state);
                        const isRunning = state === "call" && isLatestMessage && status !== "ready";
                        const isDone = state === "result";
                        const { theme } = useTheme ? useTheme() : { theme: undefined };
                        return (
                          <div className="flex flex-col">
                            <div className="flex flex-row items-center gap-1">
                              <span className="font-medium text-sm pl-4 mt-1 relative inline-block" style={{ minWidth: 120 }}>
                                {isRunning ? (
                                  <span style={{ position: 'relative', display: 'inline-block' }}>
                                    <span style={{
                                      background: theme === 'dark'
                                        ? 'linear-gradient(90deg, #fff 0%, #fff 40%, #a3a3a3 60%, #fff 100%)'
                                        : 'linear-gradient(90deg, #222 0%, #222 40%, #e0e0e0 60%, #222 100%)',
                                      backgroundSize: '200% 100%',
                                      WebkitBackgroundClip: 'text',
                                      WebkitTextFillColor: 'transparent',
                                      backgroundClip: 'text',
                                      animation: 'atlas-shimmer-text 1.3s linear infinite',
                                      animationTimingFunction: 'linear',
                                      willChange: 'background-position',
                                      display: 'inline-block',
                                    }}
                                      // Force re-render on theme change to reset background
                                      key={theme}
                                    >
                                      {label}
                                    </span>
                                    <style>
                                      {`
                                      @keyframes atlas-shimmer-text {
                                        0% { background-position: -100% 0; }
                                          100% { background-position: 100% 0; }
                                        }
                                      `}
                                    </style>
                                  </span>
                                ) : label}
                              </span>
                              {isRunning && (
                                <span className="animate-spin ml-1"><SpinnerIcon /></span>
                              )}
                              {isDone && (
                                <span className="text-green-600 ml-1" style={{ marginLeft: 4, verticalAlign: 'middle', display: 'inline-flex', alignItems: 'center' }}><CheckCircle size={16} /></span>
                              )}
                            </div>
                            {/* Details/params could be shown here if needed in the future */}
                          </div>
                        );
                      }
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
              {/* Desktop: Action icons (copy, etc) at the left start of the AI message bubble, matching mobile layout */}
              {/* Show copy icon row on desktop: always visible for latest assistant message, hover for previous */}
              {!isMobileOrTablet && isAssistant && status === "ready" && (
                (() => {
                  const { theme } = useTheme(); // theme is already available at PurePreviewMessage scope
                  // Always visible (faded in) for latest assistant message, hover for previous
                  // Use isLatestMessage to determine persistent visibility
                  return (
                    <div className="w-full flex flex-row items-center mt-0 relative">
                      <div
                        className={
                          cn(
                            "flex items-center gap-0.5 p-0 -mt-5 select-none pointer-events-auto transition-opacity duration-200 delay-75 ml-2",
                            isLatestMessage
                              ? "opacity-100"
                              : "opacity-0 group-hover/ai-message-hoverable:opacity-100"
                          )
                        }
                        data-ai-action
                        style={{ position: 'absolute', left: 0, top: 0 }}
                      >
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              aria-label="Copy message"
                              className="rounded-lg focus:outline-none flex h-[32px] w-[32px] items-center justify-center cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800"
                              style={{
                                color: theme === 'dark' ? '#fff' : '#828282', // Keeping original AI copy icon colors for now
                                background: 'transparent',
                                marginTop: '-6px',
                              }}
                              onClick={handleCopy} // Uses generic handleCopy for AI message text
                            >
                              {copied ? (
                                <CheckIcon style={{ color: theme === 'dark' ? '#fff' : '#828282', transition: 'all 0.2s' }} />
                              ) : (
                                <CopyIcon style={{ color: theme === 'dark' ? '#fff' : '#828282', transition: 'all 0.2s' }} />
                              )}
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="select-none">{copied ? "Copied!" : "Copy"}</TooltipContent>
                        </Tooltip>
                        {/* Future action icons can be added here, will align left */}
                      </div>
                    </div>
                  );
                })()
              )}
              {/* Mobile: Copy icon always at the bottom, after the message bubble */}
              {isMobileOrTablet && isAssistant && status === "ready" && (
                <div className="relative w-full -mt-2">
                  <div className="flex absolute left-0 right-0 justify-start z-10">
                    <div
                      className="flex items-center gap-1 p-1 select-none pointer-events-auto"
                      style={{ marginTop: '-28px' }} // Increased negative margin for mobile icon row
                    >
                      <button
                        type="button"
                        aria-label="Copy message"
                        className="text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg focus:outline-none flex h-[36px] w-[36px] items-center justify-center"
                        style={{ color: '#828282', background: 'transparent' }}
                        onClick={handleCopy} // Uses generic handleCopy for AI message text
                      >
                        {copied ? <CheckIcon style={{ color: 'white', transition: 'all 0.2s' }} /> : <CopyIcon style={{ color: 'white', transition: 'all 0.2s' }} />}
                      </button>
                      {/* Future action buttons can be added here as more icons */}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            // User messages
            <div className="flex flex-col w-full space-y-4">
              {(() => {
                // theme is already defined in PurePreviewMessage scope
                return message.parts?.map((part, i) => {
                  switch (part.type) {
                    case "text":
                      const isEffectivelyLastPart = i === (message.parts?.length || 0) - 1;
                      const isLatestActivelyStreamingTextPart =
                        isAssistant && // This will always be false here, as we are in the !isAssistant branch
                        status === "streaming" &&
                        isLatestMessage &&
                        isEffectivelyLastPart;

                      const LONG_MESSAGE_CHAR_LIMIT = 400;
                      const isUserMessage = message.role === "user"; // Always true here
                      const isLongUserMessage = isUserMessage && part.text.length > LONG_MESSAGE_CHAR_LIMIT;
                      const [expanded, setExpanded] = useState(false);
                      // const [hovered, setHovered] = useState(false); // No longer needed for copy icon

                      const shouldCollapse = false; // Original logic, seems unused for actual collapse
                      const isCollapsed = false; // Original logic, seems unused for actual collapse, expand/collapse is via `expanded` state

                      return (
                        <motion.div
                          initial={isLatestActivelyStreamingTextPart ? false : { y: 5, opacity: 0 }} // isLatestActivelyStreamingTextPart is effectively false here
                          animate={isLatestActivelyStreamingTextPart ? {} : { y: 0, opacity: 1 }}
                          transition={{ duration: 0.2 }}
                          key={`message-${message.id}-part-${i}`}
                          className="flex flex-row items-start w-full pb-4"
                        >
                          <div
                            className="flex flex-col w-full" // Removed: gap-4 px-4 py-2. Will be handled by inner group.
                            // alignItems: 'flex-start' (original style) is overridden by group's items-end or not applicable.
                            style={{
                              // marginLeft: 0, // Default
                              background: 'none',
                              border: 'none',
                              boxShadow: 'none',
                              position: 'relative', // Original
                            }}
                          >
                            {isLatestActivelyStreamingTextPart ? ( // This block is effectively never reached for user messages
                              <StreamingTextRenderer
                                animationStyle="typewriter"
                                fullText={part.text}
                                wordSpeed={20}
                              />
                            ) : (
                              // Container for user message bubble and its copy icon
                              <div
                                className="group/user-message ml-auto w-fit flex flex-col items-end"
                                // ml-auto: aligns this block to the right within its parent (which is w-full)
                                // w-fit: takes the width of its content (bubble)
                                // flex-col: stacks bubble and icon vertically
                                // items-end: aligns icon to the right end of the bubble
                              >
                                {/* User Message Bubble */}
                                <motion.div
                                  className={cn(
                                    "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100",
                                    "px-5 py-3",
                                    "mt-2", // Original margin for the bubble
                                    "rounded-2xl",
                                    "w-fit", // Bubble takes width of its text
                                    isLongUserMessage ? "max-w-[90vw] md:max-w-3xl" : "max-w-[70vw] md:max-w-md",
                                    "text-left", // Text inside bubble is left-aligned
                                    "break-words",
                                    isLongUserMessage ? "relative" : "", // For expand/collapse icon positioning
                                    isCollapsed ? "cursor-pointer" : "" // isCollapsed seems part of older logic
                                  )}
                                  style={{
                                    minHeight: '40px',
                                    lineHeight: '1.5',
                                    overflow: isLongUserMessage ? 'hidden' : undefined,
                                    cursor: isCollapsed ? 'pointer' : undefined, // isCollapsed seems part of older logic
                                    WebkitMaskImage: isLongUserMessage && !expanded ? 'linear-gradient(180deg, #000 60%, transparent 100%)' : undefined,
                                    maskImage: isLongUserMessage && !expanded ? 'linear-gradient(180deg, #000 60%, transparent 100%)' : undefined,
                                    paddingTop: !isLongUserMessage ? '12px' : undefined, // <-- Add this line                                  
                                  }}
                                  initial={false}
                                  animate={{
                                    maxHeight: isLongUserMessage
                                      ? expanded
                                        ? 1000 
                                        : 120
                                      : 'none',
                                  }}
                                  transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
                                  onClick={isCollapsed ? () => setExpanded(true) : undefined} // isCollapsed seems part of older logic
                                >
                                  <div style={{ paddingRight: isLongUserMessage ? 36 : undefined, position: 'relative' }}>
                                    <Markdown>
                                      {isLongUserMessage && !expanded // Use !expanded for collapsed text
                                       ? part.text.slice(0, LONG_MESSAGE_CHAR_LIMIT) + '...' : part.text}
                                    </Markdown>
                                    {/* Expand/collapse chevron for long user messages */}
                                    {!shouldCollapse && isLongUserMessage && (
                                      <div
                                        style={{
                                          position: 'absolute',
                                          top: 32, 
                                          right: 8, 
                                          zIndex: 10,
                                          display: 'flex',
                                          alignItems: 'center',
                                        }}
                                      >
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <button
                                              type="button"
                                              aria-label={expanded ? "Collapse message" : "Expand message"}
                                              className="rounded-full p-1 flex items-center justify-center bg-transparent hover:bg-zinc-200 dark:hover:bg-zinc-700 cursor-pointer"
                                              onClick={e => {
                                                e.stopPropagation();
                                                setExpanded(v => !v);
                                              }}
                                              tabIndex={0}
                                            >
                                              {expanded ? (
                                                <ChevronUpIcon className="h-4 w-4" />
                                              ) : (
                                                <ChevronDownIcon className="h-4 w-4" />
                                              )}
                                            </button>
                                          </TooltipTrigger>
                                          <TooltipContent side="bottom" className="select-none z-[9999]" sideOffset={3} align="end">
                                            {expanded ? "Collapse message" : "Expand message"}
                                          </TooltipContent>
                                        </Tooltip>
                                      </div>
                                    )}
                                  </div>
                                </motion.div>

                                {/* New Copy Icon for User Messages (Desktop Only) */}
                                {!isMobileOrTablet && (
                                  <div
                                    className={cn(
                                      "mt-1 mr-1", // Margin top to place it below, margin right to align with bubble edge
                                      "opacity-0 group-hover/user-message:opacity-100 transition-opacity duration-200"
                                    )}
                                  >
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <button
                                          type="button"
                                          aria-label="Copy message"
                                          className="rounded-md p-1.5 flex items-center justify-center select-none bg- hover:bg-zinc-200 dark:hover:bg-zinc-700 cursor-pointer focus:outline-none"
                                          onClick={() => handleUserMessageCopy(part.text)}
                                        >
                                          {copied ? (
                                            <CheckIcon style={{ color: theme === 'dark' ? '#fff' : '#828282', transition: 'all 0.2s' }} />
                                          ) : (
                                            <CopyIcon style={{ color: theme === 'dark' ? '#fff' : '#828282', transition: 'all 0.2s' }} />
                                          )}
                                        </button>
                                      </TooltipTrigger>
                                      <TooltipContent side="bottom" align="center" className="select-none">{copied ? "Copied!" : "Copy"}</TooltipContent>
                                    </Tooltip>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      );
                    default:
                      return null;
                  }
                });
              })()}
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
  if (prevProps.isLoading !== nextProps.isLoading) return false; 
  if (prevProps.isLatestMessage !== nextProps.isLatestMessage) return false; 
  if (prevProps.message.annotations !== nextProps.message.annotations) return false;
  if (!equal(prevProps.message.parts, nextProps.message.parts)) return false;
  // if (prevProps.message.id !== nextProps.message.id) return false; // Key change handles this
  return true;
});