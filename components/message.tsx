"use client";

import { Modal } from "./ui/modal";
import type { Message as TMessage } from "ai";
import { AnimatePresence, motion } from "motion/react";
import { memo, useCallback, useEffect, useState } from "react";
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
  // Responsive: mobile-first, enterprise-grade assistant message layout
  // On mobile, assistant icon above message bubble, left-aligned, max-w-[80vw]
  // On desktop, keep current layout
  const isAssistant = message.role === "assistant";
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
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 1.333A6.667 6.667 0 1 0 8 14.667 6.667 6.667 0 0 0 8 1.333Zm0 12A5.333 5.333 0 1 1 8 2.667a5.333 5.333 0 0 1 0 10.666Zm.667-8H7.333v3.334l2.834 1.7.666-1.1-2.166-1.3V5.333Z" fill="currentColor"/></svg>
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
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M6 6l8 8M6 14L14 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </button>
            </div>
            <div className="overflow-y-auto max-h-[55vh] pr-1">
              {sources.map((src, i) => {
                let icon = <img src="/globe.svg" alt="site" className="w-5 h-5 mr-2 inline-block align-middle" />;
                try {
                  const u = new URL(src.url);
                  if (u.protocol === "file:") icon = <img src="/file.svg" alt="file" className="w-5 h-5 mr-2 inline-block align-middle" />;
                  else if (u.protocol === "window:") icon = <img src="/window.svg" alt="window" className="w-5 h-5 mr-2 inline-block align-middle" />;
                } catch {}
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
                    case "text":
                      return (
                        <motion.div
                          initial={{ y: 5, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          key={`message-${message.id}-part-${i}`}
                          className="flex flex-row items-start w-full pb-4"
                        >
                          <div
                            className="flex flex-col gap-4 px-4 py-2"
                            style={{ marginLeft: 0, alignItems: 'flex-start', background: 'none', border: 'none', boxShadow: 'none' }}
                          >
                            <Markdown>{part.text}</Markdown>
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
            </div>
          ) : (
            <div className="flex flex-col w-full space-y-4">
              {message.parts?.map((part, i) => {
                switch (part.type) {
                  case "text":
                    return (
                      <motion.div
                        initial={{ y: 5, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        key={`message-${message.id}-part-${i}`}
                        className="flex flex-row items-start w-full pb-4"
                      >
                        <div
                          className="bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 px-4 py-2 rounded-xl w-full sm:max-w-2xl shadow"
                        >
                          <Markdown>{part.text}</Markdown>
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

export const Message = memo(PurePreviewMessage, (prevProps, nextProps) => {
  if (prevProps.status !== nextProps.status) return false;
  if (prevProps.message.annotations !== nextProps.message.annotations)
    return false;
  // if (prevProps.message.content !== nextProps.message.content) return false;
  if (!equal(prevProps.message.parts, nextProps.message.parts)) return false;

  return true;
});