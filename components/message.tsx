"use client";

import React from "react";
import { Modal } from "./ui/modal";
import type { Message as TMessage } from "ai";
import { AnimatePresence, motion } from "framer-motion";
import { useTheme } from "next-themes";
import { memo, useCallback, useEffect, useState, useRef } from "react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { toast } from "sonner";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import equal from "fast-deep-equal";
import { Markdown } from "./markdown";
import { cn } from "@/lib/utils";
import {
  ChevronDownIcon,
  ChevronUpIcon,
} from "lucide-react";
import { StreamingTextRenderer } from "./streaming-text-renderer";

import { ImageSlider } from "@/components/ui/image-slider";
import { VideoCarousel } from "@/components/ui/video-carousel";
import styles from "@/components/ui/image-slider.module.css";

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

// Utility: Get favicon URL for a given site
export function getFaviconUrl(siteUrl: string): string {
  try {
    const url = new URL(siteUrl);
    return `${url.origin}/favicon.ico`;
  } catch {
    return "/globe.svg"; // Fallback to a generic globe icon
  }
}

// Show AI action icons on hover of any part of the AI message (desktop only).
if (typeof window !== 'undefined') {
  const styleId = 'ai-message-hover-style';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.innerHTML = `.group\\/ai-message-hoverable:hover [data-ai-action] { opacity: 1 !important; };`;
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
  details: Array<
    | { type: "text"; text: string; signature?: string }
    | { type: "redacted"; data: string }
  >;
}

interface ReasoningMessagePartProps {
  part: ReasoningPart;
  isReasoning: boolean;
}

// Utility: Extract sources from markdown string
export function extractSourcesFromText(text: string): { title: string; url: string }[] {
  const sources: { title: string; url: string }[] = [];
  const start = text.indexOf("<!-- AVURNA_SOURCES_START -->");
  const end = text.indexOf("<!-- AVURNA_SOURCES_END -->");
  if (start === -1 || end === -1 || end < start) return sources;
  const block = text.slice(start, end);
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
    collapsed: { height: 0, opacity: 0, marginTop: 0, marginBottom: 0 },
    expanded: { height: "auto", opacity: 1, marginTop: "1rem", marginBottom: 0 },
  };

  const memoizedSetIsExpanded = useCallback((value: boolean) => {
    setIsExpanded(value);
  }, []);

  useEffect(() => {
    memoizedSetIsExpanded(isReasoning);
  }, [isReasoning, memoizedSetIsExpanded]);

  const { theme } = useTheme ? useTheme() : { theme: undefined };

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
                willChange: 'background-position',
                display: 'inline-block',
                transition: 'background 0.2s, color 0.2s',
              }}
              className="!bg-transparent"
            >
              Reasoning
            </span>
          </span>
        </div>
      ) : (
        <div className="flex flex-row gap-2 items-center">
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
              { "dark:bg-zinc-800 bg-zinc-200": isExpanded },
            )}
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? <ChevronDownIcon className="h-4 w-4" /> : <ChevronUpIcon className="h-4 w-4" />}
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
  const { theme } = useTheme ? useTheme() : { theme: undefined };
  const allText = message.parts?.filter((p: any) => p.type === "text").map((p: any) => p.text).join("\n\n") || "";
  const sources = extractSourcesFromText(allText);
  const [showSources, setShowSources] = useState(false);
  const isAssistant = message.role === "assistant";
  
  // These will hold all extracted media from the entire message
  const [images, setImages] = useState<{ src: string; alt?: string }[]>([]);
  const [videos, setVideos] = useState<{ src: string; poster?: string; title?: string }[]>([]);

  useEffect(() => {
    const extractedImages: { src: string; alt?: string }[] = [];
    const extractedVideos: { src: string; poster?: string; title?: string }[] = [];
    
    if (isAssistant) {
      for (const part of message.parts || []) {
        if (part.type === "tool-invocation" && (part.toolInvocation as any)?.result) {
          const result = (part.toolInvocation as any).result;
          if (result) {
            if (Array.isArray(result.images)) {
              extractedImages.push(...result.images);
            }
            if (Array.isArray(result.videos)) {
              extractedVideos.push(...result.videos);
            }
          }
        }
      }
    }
    setImages(extractedImages);
    setVideos(extractedVideos);
  }, [message.parts, isAssistant]);

  const isMobileOrTablet = useIsMobileOrTablet();
  const [copied, setCopied] = useState(false);
  const copyTimeout = useRef<NodeJS.Timeout | null>(null);

  const [searchedSitesByPart, setSearchedSitesByPart] = useState<Record<number, string[]>>({});

  useEffect(() => {
    if (!message.parts) return;
    const currentUpdates: Record<number, string[]> = {};
    message.parts.forEach((part, i) => {
      if (part.type !== "tool-invocation") return;
      const { toolName, state, args } = part.toolInvocation;
      const result = (part.toolInvocation as any)?.result;
      let sitesForThisPart = searchedSitesByPart[i] || [];
      if (state === "call" && isLatestMessage && status !== "ready") {
        if (toolName === "fetchUrl" && args && typeof args === "object" && args.url) {
          const url = args.url;
          if (url && !sitesForThisPart.includes(url)) {
            sitesForThisPart = [...sitesForThisPart, url];
          }
        }
      } else if (state === "result") {
        if (toolName === "googleSearch" && result && result.sources && Array.isArray(result.sources)) {
          const sourceUrls = result.sources.map((s: any) => s.sourceUrl || s.url).filter(Boolean);
          sourceUrls.forEach((url: string) => {
            if (url && !sitesForThisPart.includes(url)) {
              sitesForThisPart = [...sitesForThisPart, url];
            }
          });
        } else if (toolName === "fetchUrl" && result && result.url) {
          if (!sitesForThisPart.includes(result.url)) {
            sitesForThisPart = [...sitesForThisPart, result.url];
          }
          if (result.childResults && Array.isArray(result.childResults)) {
            result.childResults.forEach((childRes: any) => {
              if (childRes.url && !sitesForThisPart.includes(childRes.url)) {
                sitesForThisPart = [...sitesForThisPart, childRes.url];
              }
            });
          }
        }
      }
      if (sitesForThisPart.length > (searchedSitesByPart[i]?.length || 0)) {
        currentUpdates[i] = sitesForThisPart;
      }
    });

    if (Object.keys(currentUpdates).length > 0) {
      setSearchedSitesByPart(prev => {
        let changed = false;
        const newState = { ...prev };
        for (const partIdxStr in currentUpdates) {
          const partIdx = parseInt(partIdxStr, 10);
          if (!equal(newState[partIdx], currentUpdates[partIdx])) {
            newState[partIdx] = currentUpdates[partIdx];
            changed = true;
          }
        }
        return changed ? newState : prev;
      });
    }
  }, [message.parts, isLatestMessage, status, searchedSitesByPart]);

  function stripSourcesBlock(text: string): string {
    return text.replace(/<!-- AVURNA_SOURCES_START -->[\s\S]*?<!-- AVURNA_SOURCES_END -->/g, "").trim();
  }
  const aiMessageText = stripSourcesBlock(allText);

  const handleCopy = () => {
    copyToClipboard(aiMessageText);
    setCopied(true);
    if (isMobileOrTablet) toast("Copied to Clipboard");
    if (copyTimeout.current) clearTimeout(copyTimeout.current);
    copyTimeout.current = setTimeout(() => setCopied(false), 1000);
  };

  const handleUserMessageCopy = (textToCopy: string) => {
    copyToClipboard(textToCopy);
    setCopied(true);
    if (isMobileOrTablet) toast("Copied to Clipboard");
    if (copyTimeout.current) clearTimeout(copyTimeout.current);
    copyTimeout.current = setTimeout(() => setCopied(false), 1000);
  };

  useEffect(() => () => { if (copyTimeout.current) clearTimeout(copyTimeout.current); }, []);

  return (
    <AnimatePresence key={message.id}>
      <motion.div
        className="w-full mx-auto px-2 sm:px-4 group/message max-w-[97.5%] sm:max-w-[46rem]"
        initial={{ y: 5, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        key={`message-${message.id}`}
        data-role={message.role}
      >
        {/* === START OF RENDER FIX === */}
        {/* This block renders ALL media for the message, but only once and before other content. */}
        {isAssistant && (images.length > 0 || videos.length > 0) && (
          <div className="mb-4 flex flex-col gap-4">
            {images.length > 0 && <ImageSlider images={images} />}
            {videos.length > 0 && <VideoCarousel videos={videos} />}
          </div>
        )}
        {/* === END OF RENDER FIX === */}

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
                  <a key={src.url + i} href={src.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-2 py-2 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors mb-1">
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

        <div className={cn(isAssistant ? "flex w-full flex-col sm:flex-row items-start" : "flex flex-row gap-4 w-full group-data-[role=user]/message:ml-auto group-data-[role=user]/message:max-w-2xl group-data-[role=user]/message:w-fit")}>
          {isAssistant ? (
            <div className={cn("group/ai-message-hoverable", isMobileOrTablet ? "w-full pl-10" : "w-fit")} style={{ marginLeft: 0, paddingLeft: 0, marginTop: isMobileOrTablet ? 32 : undefined }}>
              <div className={cn(!isMobileOrTablet && "flex flex-col space-y-4 w-fit", isMobileOrTablet && styles.clearfix)} style={{ alignItems: !isMobileOrTablet ? 'flex-start' : undefined }}>
                {message.parts?.map((part, i) => {
                  switch (part.type) {
                    case "text": {
                      const isEffectivelyLastPart = i === (message.parts?.length || 0) - 1;
                      const isActivelyStreamingText = isAssistant && status === "streaming" && isLatestMessage && isEffectivelyLastPart;

                      return (
                        <motion.div
                          key={`message-${message.id}-part-${i}`}
                          initial={isActivelyStreamingText ? false : { y: 5, opacity: 0 }}
                          animate={isActivelyStreamingText ? {} : { y: 0, opacity: 1 }}
                          transition={{ duration: 0.2 }}
                          className="flex flex-row items-start w-full pb-4"
                        >
                          <div className="flex flex-col gap-4" style={{ marginLeft: 0, alignItems: 'flex-start', background: 'none', border: 'none', boxShadow: 'none' }}>
                            <Markdown>{part.text}</Markdown>
                          </div>
                        </motion.div>
                      );
                    }
                    case "tool-invocation": {
                      const shouldFadeOut = part.toolInvocation && part.toolInvocation.state === "result";
                      if (shouldFadeOut) {
                        return (
                          <motion.div
                            key={`message-${message.id}-part-${i}`}
                            initial={{ opacity: 1, height: 'auto' }}
                            animate={{ opacity: 0, height: 0, margin: 0, padding: 0 }}
                            transition={{ duration: 0.35, ease: 'easeInOut' }}
                            style={{ overflow: 'hidden' }}
                          />
                        );
                      }
                      const { toolName, state } = part.toolInvocation;
                      const label = (toolName === "googleSearch" && state === "call") ? "Searching the Web" : (toolName === "fetchUrl" && state === "call") ? "Analyzing Url data" : (toolName === "getWeatherdata" || toolName === "weatherTool") ? "Getting weather data" : (state === "call") ? `Running ${toolName}` : "";
                      const searchedSites = searchedSitesByPart[i] || [];
                      return (
                        <div className="flex flex-col" key={`message-${message.id}-part-${i}`}>
                          <div className="flex flex-row items-center gap-1" style={!isMobileOrTablet ? { marginLeft: '-16px', marginRight: '12px' } : { marginLeft: '-16px', marginRight: '12px' }}>
                            <div className="flex flex-row items-center gap-1">
                              <AnimatePresence initial={false}>
                                {searchedSites.map((url) => (
                                  <motion.img
                                    key={url}
                                    src={getFaviconUrl(url)}
                                    alt="site favicon"
                                    className="w-5 h-5 rounded mr-1"
                                    initial={{ x: -20, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    exit={{ x: 20, opacity: 0 }}
                                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                    style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}
                                  />
                                ))}
                              </AnimatePresence>
                            </div>
                            <span className="font-medium pl-4 mt-1 relative inline-block" style={{ minWidth: 120, fontSize: '1rem' }}>
                              {state === "call" && label ? (
                                <span style={{ position: 'relative', display: 'inline-block' }}>
                                  <span style={{ color: theme === 'dark' ? '#a3a3a3' : '#6b7280', background: theme === 'dark' ? 'linear-gradient(90deg, #fff 0%, #fff 40%, #a3a3a3 60%, #fff 100%)' : 'linear-gradient(90deg, #222 0%, #222 40%, #e0e0e0 60%, #222 100%)', backgroundSize: '200% 100%', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', animation: 'avurna-shimmer-text 1.3s linear infinite', animationTimingFunction: 'linear', willChange: 'background-position', display: 'inline-block' }} key={theme}>
                                    {label}
                                  </span>
                                  <style>{`@keyframes avurna-shimmer-text { 0% { background-position: -100% 0; } 100% { background-position: 100% 0; } }`}</style>
                                </span>
                              ) : null}
                            </span>
                          </div>
                        </div>
                      );
                    }
                    case "reasoning":
                      return (
                        <ReasoningMessagePart
                          key={`message-${message.id}-${i}`}
                          part={part}
                          isReasoning={(message.parts && status === "streaming" && i === message.parts.length - 1) ?? false}
                        />
                      );
                    default:
                      return null;
                  }
                })}
              </div>
              {(() => {
                const [showIconRow, setShowIconRow] = useState(isLatestMessage ? false : true);
                useEffect(() => {
                  if (!isMobileOrTablet && isAssistant && status === "ready") {
                    if (isLatestMessage) {
                      const timer = setTimeout(() => setShowIconRow(true), 450);
                      return () => clearTimeout(timer);
                    } else {
                      setShowIconRow(true);
                    }
                  }
                }, [isMobileOrTablet, isAssistant, status, isLatestMessage]);
                /** 
                 * WIP: WE WANT TO CHECK IF THE AI STATUS RESPONSE FAILED.
                 * IF IT DID, ON ALL DEVICES, WE WANT TO REDUCE THE NEGATIVE MARGIN TOP
                 * SO WE CAN RENDER THE ICONS ROW WELL.
                 */
                if (!isMobileOrTablet && isAssistant && status === "ready") {
                  return (
                    <div className="flex flex-row" style={{ marginTop: '-28px' }}>
                      <motion.div
                        className={cn("flex items-center gap-1 p-1 select-none pointer-events-auto", !isLatestMessage ? "group/ai-icon-row" : "")}
                        data-ai-action
                        style={{ marginLeft: '-16px', marginRight: '12px', alignSelf: 'flex-start' }}
                        initial={isLatestMessage ? { opacity: 0 } : { opacity: 0 }}
                        animate={isLatestMessage ? (showIconRow ? { opacity: 1 } : { opacity: 0 }) : { opacity: 0 }}
                        whileHover={!isLatestMessage ? { opacity: 1, transition: { duration: 0.2 } } : undefined}
                        transition={{ opacity: { duration: 0.2, delay: isLatestMessage && showIconRow ? 0.15 : 0 } }}
                      >
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button type="button" aria-label="Copy message" className="rounded-lg focus:outline-none flex h-[36px] w-[36px] items-center justify-center cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800" style={{ color: theme === 'dark' ? '#fff' : '#828282', background: 'transparent' }} onClick={handleCopy}>
                              {copied ? (<CheckIcon style={{ color: theme === 'dark' ? '#fff' : '#828282', transition: 'all 0.2s' }} />) : (<CopyIcon style={{ color: theme === 'dark' ? '#fff' : '#828282', transition: 'all 0.2s' }} />)}
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="select-none">{copied ? "Copied!" : "Copy"}</TooltipContent>
                        </Tooltip>
                      </motion.div>
                    </div>
                  );
                }
                return null;
              })()}
              {isMobileOrTablet && isAssistant && status === "ready" && (
                <div className="relative w-full">
                  <div className="flex absolute left-0 right-0 justify-start z-10">
                    <div className="flex items-center gap-1 py-1 sm:mr-6 select-none pointer-events-auto" style={{ marginTop: '-28px', marginLeft: '-8px', marginRight: '10px' }}>
                      <button type="button" aria-label="Copy message" className="text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg focus:outline-none flex h-[36px] w-[36px] items-center justify-center" style={{ color: '#828282', background: 'transparent' }} onClick={handleCopy}>
                        {copied ? <CheckIcon style={{ color: 'white', transition: 'all 0.2s' }} /> : <CopyIcon style={{ color: 'white', transition: 'all 0.2s' }} />}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col w-full space-y-4">
              {message.parts?.map((part, i) => {
                const isLastPart = i === (message.parts?.length || 0) - 1;
                switch (part.type) {
                  case "text":
                    const isEffectivelyLastPart = i === (message.parts?.length || 0) - 1;
                    const isLatestActivelyStreamingTextPart = isAssistant && status === "streaming" && isLatestMessage && isEffectivelyLastPart;
                    const LONG_MESSAGE_CHAR_LIMIT = 400;
                    const isUserMessage = message.role === "user";
                    const isLongUserMessage = isUserMessage && part.text.length > LONG_MESSAGE_CHAR_LIMIT;
                    const [expanded, setExpanded] = useState(false);
                    const isCollapsed = false;
                    const [drawerOpen, setDrawerOpen] = useState(false);

                    return (
                      <motion.div
                        initial={isLatestActivelyStreamingTextPart ? false : { y: 5, opacity: 0 }}
                        animate={isLatestActivelyStreamingTextPart ? {} : { y: 0, opacity: 1 }}
                        transition={{ duration: 0.2 }}
                        key={`message-${message.id}-part-${i}`}
                        className={typeof window !== 'undefined' && window.innerWidth < 640 ? "flex flex-row items-start w-full pb-4 mt-6 px-0 sm:px-0" : isMobileOrTablet && isLastPart ? "flex flex-row items-start w-full pb-4 mt-6" : "flex flex-row items-start w-full pb-4"}
                      >
                        <div className="flex flex-col w-full" style={{ background: 'none', border: 'none', boxShadow: 'none', position: 'relative' }}>
                          {isLatestActivelyStreamingTextPart ? (
                            <StreamingTextRenderer animationStyle="typewriter" fullText={part.text} wordSpeed={20} />
                          ) : (
                            <div className="group/user-message flex flex-col items-end w-full gap-1 relative justify-center max-w-3xl md:px-4 pb-2">
                              <motion.div
                                className={cn("prose-p:opacity-95 prose-strong:opacity-100 border border-border-l1 max-w-[100%] sm:max-w-[90%] rounded-br-lg message-bubble prose min-h-7 text-primary dark:prose-invert bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 px-5 py-2.5 rounded-3xl relative text-left break-words", isLongUserMessage ? "max-w-[90vw] md:max-w-3xl" : "max-w-[70vw] md:max-w-md", isLongUserMessage ? "relative" : "", isCollapsed ? "cursor-pointer" : "")}
                                style={{ lineHeight: '1.5', overflow: isLongUserMessage ? 'hidden' : undefined, cursor: isCollapsed ? 'pointer' : undefined, WebkitMaskImage: isLongUserMessage && !expanded ? 'linear-gradient(180deg, #000 60%, transparent 100%)' : undefined, maskImage: isLongUserMessage && !expanded ? 'linear-gradient(180deg, #000 60%, transparent 100%)' : undefined, paddingTop: !isLongUserMessage ? '12px' : undefined }}
                                initial={false}
                                animate={{ maxHeight: isLongUserMessage ? expanded ? 1000 : 120 : 'none' }}
                                transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
                                onClick={isCollapsed ? () => setExpanded(true) : undefined}
                              >
                                <div style={{ paddingRight: isLongUserMessage ? 36 : undefined, position: 'relative' }}>
                                  <Markdown>{isLongUserMessage && !expanded ? part.text.slice(0, LONG_MESSAGE_CHAR_LIMIT) + '...' : part.text}</Markdown>
                                  {isLongUserMessage && (
                                    <div style={{ position: 'absolute', top: 32, right: 8, zIndex: 10, display: 'flex', alignItems: 'center' }}>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <button type="button" aria-label={expanded ? "Collapse message" : "Expand message"} className="rounded-full p-1 flex items-center justify-center bg-transparent hover:bg-zinc-200 dark:hover:bg-zinc-700 cursor-pointer" onClick={e => { e.stopPropagation(); setExpanded(v => !v); }} tabIndex={0}>
                                            {expanded ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />}
                                          </button>
                                        </TooltipTrigger>
                                        <TooltipContent side="bottom" className="select-none z-[9999]" sideOffset={3} align="end">{expanded ? "Collapse message" : "Expand message"}</TooltipContent>
                                      </Tooltip>
                                    </div>
                                  )}
                                </div>
                              </motion.div>
                              {isMobileOrTablet && (
                                <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
                                  <DrawerTrigger asChild>
                                    <div className="absolute inset-0 z-10 cursor-pointer" style={{ borderRadius: 24 }} onClick={e => { e.stopPropagation(); setDrawerOpen(true); }} />
                                  </DrawerTrigger>
                                  <DrawerContent>
                                    <DrawerHeader><DrawerTitle className="w-full text-center">Actions</DrawerTitle></DrawerHeader>
                                    <div className="flex flex-col gap-2 px-4 py-2">
                                      <button type="button" aria-label="Copy message" className="flex items-center gap-3 py-3 px-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer" onClick={async () => { handleUserMessageCopy(part.text); await new Promise(res => setTimeout(res, 1000)); setDrawerOpen(false); }}>
                                        {copied ? (<CheckIcon style={{ color: theme === 'dark' ? '#fff' : '#828282', transition: 'all 0.2s', width: 22, height: 22 }} />) : (<CopyIcon style={{ color: theme === 'dark' ? '#fff' : '#828282', transition: 'all 0.2s', width: 22, height: 22 }} />)}
                                        <span className="text-base font-medium">{copied ? 'Copied!' : 'Copy'}</span>
                                      </button>
                                    </div>
                                  </DrawerContent>
                                </Drawer>
                              )}
                              {!isMobileOrTablet && (
                                <div className={cn("mt-1 mr-1 flex transition-opacity duration-200", !isLatestMessage ? "opacity-0 group-hover/user-message:opacity-100" : "opacity-100")}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button type="button" aria-label="Copy message" className={cn("rounded-md p-1.5 flex items-center justify-center select-none cursor-pointer focus:outline-none bg- hover:bg-zinc-200 dark:hover:bg-zinc-700")} onClick={() => handleUserMessageCopy(part.text)}>
                                        {copied ? (<CheckIcon style={{ color: theme === 'dark' ? '#fff' : '#828282', transition: 'all 0.2s' }} />) : (<CopyIcon style={{ color: theme === 'dark' ? '#fff' : '#828282', transition: 'all 0.2s' }} />)}
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
  if (prevProps.isLoading !== nextProps.isLoading) return false;
  if (prevProps.isLatestMessage !== nextProps.isLatestMessage) return false;
  if (prevProps.message.annotations !== nextProps.message.annotations) return false;
  if (!equal(prevProps.message.parts, nextProps.message.parts)) return false;
  return true;
});