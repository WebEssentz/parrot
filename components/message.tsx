"use client";

import React from "react";
import { useEffect, useState } from "react";
import { saveMediaToIDB } from "@/lib/media-idb";
import { Modal } from "./ui/modal";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "./ui/sheet";
import type { Message as TMessage } from "ai";
import { AnimatePresence, motion } from "framer-motion";
import { useTheme } from "next-themes";
import { memo, useCallback, useRef } from "react";
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
import styles from "@/components/ui/image-slider.module.css";
import { MediaCarousel } from "./ui/media-carousel";

// --- Helper Components & Hooks ---

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

/**
 * Extracts a display name from a resolved URL using an open API for semantic extraction.
 * Falls back to domain extraction if the API is unavailable.
 * @param resolvedUrl The fully resolved URL string
 */
export async function extractWebpageName(resolvedUrl: string): Promise<string> {
  if (!resolvedUrl) return '';
  try {
    // Use microlink.io public API (no key required)
    const apiUrl = `https://api.microlink.io/?url=${encodeURIComponent(resolvedUrl)}`;
    const response = await fetch(apiUrl);
    if (response.ok) {
      const data = await response.json();
      // Try to get the best name: site, publisher, title, url
      if (data && data.data) {
        if (typeof data.data.site === 'string' && data.data.site.trim()) {
          return data.data.site.trim();
        }
        if (typeof data.data.publisher === 'string' && data.data.publisher.trim()) {
          return data.data.publisher.trim();
        }
        if (typeof data.data.title === 'string' && data.data.title.trim()) {
          return data.data.title.trim();
        }
      }
    }
  } catch { }
  // Fallback: extract domain
  try {
    const u = new URL(resolvedUrl);
    if (u.hostname === 'vertexaisearch.cloud.google.com' && u.pathname.startsWith('/grounding-api-redirect/')) {
      return 'Unknown Source';
    }
    return u.hostname.replace(/^www\./, "");
  } catch {
    return resolvedUrl;
  }
}

// --- WebpageTitleDisplay expects a { title, url, snippet } object ---
// Now uses useWebpageTitle to fetch the actual webpage title from microlink.io
function useWebpageTitle(url: string) {
  const [title, setTitle] = useState<string>("");
  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    async function fetchTitle() {
      try {
        const apiUrl = `https://api.microlink.io/?url=${encodeURIComponent(url)}`;
        const resp = await fetch(apiUrl);
        const data = await resp.json();
        if (!cancelled && data.status === 'success' && data.data && data.data.title) {
          setTitle(data.data.title);
        }
      } catch {
        // fallback: show nothing
      }
    }
    fetchTitle();
    return () => { cancelled = true; };
  }, [url]);
  return title;
}

async function fetchWebpageDescription(url: string): Promise<string> {
  try {
    const resp = await fetch(`/api/extract-description?url=${encodeURIComponent(url)}`);
    if (!resp.ok) return "";
    const data = await resp.json();
    return data.description || "";
  } catch {
    return "";
  }
}

function WebpageTitleDisplay({ source }: { source?: { title?: string; url: string; snippet?: string } }) {
  // Always use the actual webpage title from microlink.io
  const title = useWebpageTitle(source?.url || "");
  const [description, setDescription] = useState<string>("");
  const [hasFetched, setHasFetched] = useState(false);
  useEffect(() => {
    if (!source?.url || hasFetched) return;
    let cancelled = false;
    (async () => {
      const desc = await fetchWebpageDescription(source.url);
      if (!cancelled) {
        setDescription(desc);
        setHasFetched(true);
      }
    })();
    return () => { cancelled = true; };
    // Only run once per URL
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source?.url]);
  if (!source || !source.url) return null;
  // If the title starts with "AUZI", render "Unknown Source"
  const displayTitle = (title && title.trim().toUpperCase().startsWith("AUZI"))
    ? "Unknown Source"
    : (title || source.title || source.url);
  return (
    <>
      <div className="font-semibold text-sm mt-1 text-zinc-800 dark:text-zinc-100">
        {displayTitle}
      </div>
      {description && (
        <div className="text-xs mt-1 text-zinc-500 dark:text-zinc-400 italic max-w-xs line-clamp-2">
          <Markdown>{description}</Markdown>
        </div>
      )}
      {source.snippet && !description && (
        <div className="text-xs mt-1 text-zinc-500 dark:text-zinc-400 italic max-w-xs line-clamp-2">
          <Markdown>{source.snippet}</Markdown>
        </div>
      )}
    </>
  );
}

// --- SourceFavicon Component ---
// Skeleton shimmer for favicon loading, matching tool invocation UI
function FaviconSkeleton() {
  const { theme } = useTheme ? useTheme() : { theme: "light" };
  return (
    <span
      className="w-4 h-4 rounded-full border border-zinc-200 dark:border-zinc-700 -ml-1 first:ml-0 inline-block align-middle shadow-sm"
      style={{
        background: theme === 'dark'
          ? 'linear-gradient(90deg, #3f3f46 0%, #52525b 40%, #3f3f46 60%, #3f3f46 100%)'
          : 'linear-gradient(90deg, #e5e7eb 0%, #f3f4f6 40%, #e5e7eb 60%, #e5e7eb 100%)',
        backgroundSize: '200% 100%',
        animation: 'avurna-shimmer-favicon 1.3s linear infinite',
        zIndex: 1,
      }}
      key={theme}
    >
      <style>{`@keyframes avurna-shimmer-favicon { 0% { background-position: -100% 0; } 100% { background-position: 100% 0; } }`}</style>
    </span>
  );
}

function SourceFavicon({ url, title }: { url: string; title: string }) {
  const [favicon, setFavicon] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [errored, setErrored] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErrored(false);
    (async () => {
      let urlToUse = url;
      if (url.includes("vertexaisearch.cloud.google.com/grounding-api-redirect/")) {
        urlToUse = await resolveRedirectUrl(url);
      }
      try {
        const u = new URL(urlToUse);
        if (u.protocol === "file:") {
          setFavicon("/file.svg");
          setLoading(false);
          return;
        } else if (u.protocol === "window:") {
          setFavicon("/window.svg");
          setLoading(false);
          return;
        } else {
          setFavicon(getFaviconUrl(urlToUse));
        }
      } catch {
        setFavicon("/globe.svg");
        setLoading(false);
        return;
      }
    })();
    return () => { cancelled = true; };
  }, [url]);

  // When favicon changes, try to load it, then store in IndexedDB after successful load
  useEffect(() => {
    if (!favicon) return;
    setLoading(true);
    setErrored(false);
    const img = new window.Image();
    img.src = favicon;
    img.onload = async () => {
      setLoading(false);
      setErrored(false);
      // Only cache if not a local fallback
      if (favicon.startsWith('http') || favicon.startsWith('https')) {
        try {
          const resp = await fetch(favicon);
          if (resp.ok) {
            const blob = await resp.blob();
            if (blob.size > 0) {
              try {
                const u = new URL(url);
                const dbKey = `favicon:${u.hostname}`;
                saveMediaToIDB(dbKey, blob, {
                  key: dbKey,
                  type: 'image',
                  mimeType: blob.type,
                  size: blob.size,
                  title: title,
                  sourceUrl: url,
                });
              } catch { }
            }
          }
        } catch { }
      }
    };
    img.onerror = () => {
      setErrored(true);
      setLoading(false);
    };
  }, [favicon, url, title]);

  if (loading) {
    return <FaviconSkeleton />;
  }
  if (errored) {
    return (
      <img
        src="/globe.svg"
        alt={title}
        className="w-4 h-4 rounded-full border border-zinc-200 dark:border-zinc-700 shadow-sm -ml-1 first:ml-0"
        style={{ display: 'inline-block', verticalAlign: 'middle', zIndex: 1, boxShadow: '0 1px 4px rgba(0,0,0,0.10)' }}
      />
    );
  }
  return (
    <img
      src={favicon || "/globe.svg"}
      alt={title}
      className="w-4 h-4 rounded-full border border-zinc-200 dark:border-zinc-700 shadow-sm -ml-1 first:ml-0"
      style={{ display: 'inline-block', verticalAlign: 'middle', zIndex: 1, boxShadow: '0 1px 4px rgba(0,0,0,0.10)' }}
      onError={e => { e.currentTarget.onerror = null; e.currentTarget.src = '/globe.svg'; }}
    />
  );
}


// Caches resolved URLs for the session
const resolvedUrlCache: Record<string, Promise<string>> = {};

/**
 * Resolves a redirect URL (e.g., vertexaisearch.cloud.google.com/grounding-api-redirect/...) to its final destination.
 * Returns the resolved URL, or the original if not a redirect or on error.
 */
export async function resolveRedirectUrl(siteUrl: string): Promise<string> {
  if (!siteUrl.includes("vertexaisearch.cloud.google.com/grounding-api-redirect/")) return siteUrl;
  if (Object.prototype.hasOwnProperty.call(resolvedUrlCache, siteUrl)) return resolvedUrlCache[siteUrl];
  const promise = fetch("/api/resolve-redirect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: siteUrl }),
  })
    .then(res => res.json())
    .then(data => data.resolvedUrl || siteUrl)
    .catch(() => siteUrl);
  resolvedUrlCache[siteUrl] = promise;
  return promise;
}

export function getFaviconUrl(siteUrl: string): string {
  try {
    const url = new URL(siteUrl);
    // Use Google's favicon service for robustness
    return `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=32`;
  } catch {
    return "/globe.svg";
  }
}

if (typeof window !== 'undefined') {
  const styleId = 'ai-message-hover-style';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.innerHTML = `.group\\/ai-message-hoverable:hover [data-ai-action] { opacity: 1 !important; };`;
    document.head.appendChild(style);
  }
}

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

function copyToClipboard(text: string) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text);
  } else {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }
}

interface ReasoningPartData {
  type: "reasoning";
  reasoning: string;
  details: Array<{ type: "text"; text: string; signature?: string } | { type: "redacted"; data: string }>;
}

interface ReasoningMessagePartProps {
  part: ReasoningPartData;
  isReasoning: boolean;
}

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

export function ReasoningMessagePart({ part, isReasoning }: ReasoningMessagePartProps) {
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
            <span key={theme} style={{ background: theme === 'dark' ? 'linear-gradient(90deg, #fff 0%, #fff 40%, #a3a3a3 60%, #fff 100%)' : 'linear-gradient(90deg, #222 0%, #222 40%, #e0e0e0 60%, #222 100%)', backgroundSize: '200% 100%', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', willChange: 'background-position', display: 'inline-block', transition: 'background 0.2s, color 0.2s' }} className="!bg-transparent">Reasoning</span>
          </span>
        </div>
      ) : (
        <div className="flex flex-row gap-2 items-center">
          <span className="font-medium text-sm pl-4 mt-1 relative inline-block" style={{ minWidth: 120, cursor: 'pointer' }} onClick={() => setIsExpanded((v) => !v)}>Reasoned for a few seconds</span>
          <button className={cn("cursor-pointer rounded-full dark:hover:bg-zinc-800 hover:bg-zinc-200", { "dark:bg-zinc-800 bg-zinc-200": isExpanded })} onClick={() => setIsExpanded(!isExpanded)}>
            {isExpanded ? <ChevronDownIcon className="h-4 w-4" /> : <ChevronUpIcon className="h-4 w-4" />}
          </button>
        </div>
      )}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div key="reasoning" className="text-sm dark:text-zinc-400 text-zinc-600 flex flex-col gap-4 border-l pl-3 dark:border-zinc-800" initial="collapsed" animate="expanded" exit="collapsed" variants={variants} transition={{ duration: 0.2, ease: "easeInOut" }}>
            {part.details.map((detail, detailIndex) => detail.type === "text" ? <Markdown key={detailIndex}>{detail.text}</Markdown> : "<redacted>")}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const UserTextMessagePart = ({ part, isLatestMessage }: { part: TMessage['parts'][number], isLatestMessage: boolean }) => {
  const [expanded, setExpanded] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const copyTimeout = useRef<NodeJS.Timeout | null>(null);
  const { theme } = useTheme();
  const isMobileOrTablet = useIsMobileOrTablet();

  if (!part || part.type !== 'text') return null;

  const handleUserMessageCopy = (textToCopy: string) => {
    copyToClipboard(textToCopy);
    setCopied(true);
    if (isMobileOrTablet) toast("Copied to Clipboard");
    if (copyTimeout.current) clearTimeout(copyTimeout.current);
    copyTimeout.current = setTimeout(() => setCopied(false), 1000);
  };

  useEffect(() => () => { if (copyTimeout.current) clearTimeout(copyTimeout.current); }, []);

  const LONG_MESSAGE_CHAR_LIMIT = 400;
  const isLongUserMessage = part.text.length > LONG_MESSAGE_CHAR_LIMIT;

  return (
    <motion.div initial={{ y: 5, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.2 }} className="flex flex-row items-start w-full pb-4">
      <div className="flex flex-col w-full" style={{ background: 'none', border: 'none', boxShadow: 'none', position: 'relative' }}>
        <div className="group/user-message flex flex-col items-end w-full gap-1 relative justify-center max-w-3xl md:px-4 pb-2">
          <motion.div
            className={cn("prose-p:opacity-95 prose-strong:opacity-100 border border-border-l1 max-w-[100%] sm:max-w-[90%] rounded-br-lg message-bubble prose min-h-7 text-primary dark:prose-invert bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 px-5 py-2.5 rounded-3xl relative text-left break-words", isLongUserMessage ? "max-w-[90vw] md:max-w-3xl" : "max-w-[70vw] md:max-w-md", isLongUserMessage && "relative")}
            style={{ lineHeight: '1.5', overflow: isLongUserMessage ? 'hidden' : undefined, WebkitMaskImage: isLongUserMessage && !expanded ? 'linear-gradient(180deg, #000 60%, transparent 100%)' : undefined, maskImage: isLongUserMessage && !expanded ? 'linear-gradient(180deg, #000 60%, transparent 100%)' : undefined, paddingTop: !isLongUserMessage ? '12px' : undefined }}
            initial={false}
            animate={{ maxHeight: isLongUserMessage ? expanded ? 1000 : 120 : 'none' }}
            transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
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
      </div>
    </motion.div>
  );
};

const PurePreviewMessage = ({ message, isLatestMessage, status }: { message: TMessage; isLoading: boolean; status: "error" | "submitted" | "streaming" | "ready"; isLatestMessage: boolean; }) => {
  const { theme } = useTheme ? useTheme() : { theme: undefined };
  const isAssistant = message.role === "assistant";
  // Sidebar open state for sources
  const [sourcesSidebarOpen, setSourcesSidebarOpen] = useState(false);
  const [sourcesDrawerOpen, setSourcesDrawerOpen] = useState(false);

  const { images, videos, sources, allText } = React.useMemo(() => {
    const extractedImages: { src: string; alt?: string; source?: { url: string; title?: string; } }[] = [];
    const extractedVideos: { src: string; poster?: string; title?: string }[] = [];
    let combinedText = "";

    if (isAssistant) {
      for (const part of message.parts || []) {
        if (part.type === "tool-invocation" && (part.toolInvocation as any)?.result) {
          const result = (part.toolInvocation as any).result;
          if (result) {
            if (Array.isArray(result.images)) extractedImages.push(...result.images);
            if (Array.isArray(result.videos)) extractedVideos.push(...result.videos);
          }
        } else if (part.type === "text" && part.text.trim()) {
          combinedText += part.text + "\n\n";
        }
      }
    }
    const extractedSources = extractSourcesFromText(combinedText);
    return { images: extractedImages, videos: extractedVideos, sources: extractedSources, allText: combinedText };
  }, [message.parts, isAssistant]);

  const [showSources, setShowSources] = useState(false);
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
          if (url && !sitesForThisPart.includes(url)) sitesForThisPart = [...sitesForThisPart, url];
        }
      } else if (state === "result") {
        if (toolName === "googleSearch" && result && result.sources && Array.isArray(result.sources)) {
          const sourceUrls = result.sources.map((s: any) => s.sourceUrl || s.url).filter(Boolean);
          sourceUrls.forEach((url: string) => {
            if (url && !sitesForThisPart.includes(url)) sitesForThisPart = [...sitesForThisPart, url];
          });
        }
      }
      if (sitesForThisPart.length > (searchedSitesByPart[i]?.length || 0)) currentUpdates[i] = sitesForThisPart;
    });

    if (Object.keys(currentUpdates).length > 0) {
      setSearchedSitesByPart(prev => {
        const newState = { ...prev };
        let changed = false;
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

  const stripSourcesBlock = (text: string) => text.replace(/<!-- AVURNA_SOURCES_START -->[\s\S]*?<!-- AVURNA_SOURCES_END -->/g, "").trim();
  const aiMessageText = stripSourcesBlock(allText);

  const handleCopy = () => {
    copyToClipboard(aiMessageText);
    setCopied(true);
    if (isMobileOrTablet) toast("Copied to Clipboard");
    if (copyTimeout.current) clearTimeout(copyTimeout.current);
    copyTimeout.current = setTimeout(() => setCopied(false), 1000);
  };

  useEffect(() => () => { if (copyTimeout.current) clearTimeout(copyTimeout.current); }, []);

  const hasContent = isAssistant ? (message.parts ?? []).some(p => p.type !== 'tool-invocation' || (p.toolInvocation as any)?.result) : (message.parts ?? []).length > 0;
  if (!hasContent && status === 'ready') return null;

  return (
    <AnimatePresence key={message.id}>
      <motion.div className="w-full mx-auto px-2 sm:px-4 group/message max-w-[97.5%] sm:max-w-[46rem]" initial={{ y: 5, opacity: 0 }} animate={{ y: 0, opacity: 1 }} key={`message-${message.id}`} data-role={message.role}>
        {isAssistant && (images.length > 0 || videos.length > 0) && (
          <div className="mb-4 w-full">
            <MediaCarousel
              images={images}
              videos={videos}
              maxImages={(() => {
                const text = allText.toLowerCase();
                // If user explicitly asks for image(s), ignore videos
                if (/\b(image|images|picture|pictures|photo|photos|pic|pics|img|jpg|jpeg|png|gif|gifs)\b/.test(text)) {
                  // Try to extract a number from the message text (e.g., "show me 2 images")
                  const match = text.match(/(?:show|display|give|see|want|need|find|fetch|render|provide|list|give me|show me|display me|see me|want me|need me|find me|fetch me|render me|provide me|list me)?\s*(\d+)\s*(?:images|pictures|photos|pics|img|jpg|jpeg|png|gifs?)/);
                  if (match && match[1]) {
                    const n = parseInt(match[1], 10);
                    if (!isNaN(n) && n > 0) return n;
                  }
                  // If plural, show 4 by default
                  if (/images|pictures|photos|pics|gifs/.test(text)) return 4;
                  // If singular, show 1
                  if (/image|picture|photo|pic|gif/.test(text)) return 1;
                  // Fallback: show 1 image
                  return 1;
                }
                // If user explicitly asks for video(s), ignore images
                if (/\b(video|videos|clip|clips|movie|movies|mp4|webm|mov|avi)\b/.test(text)) {
                  return 0;
                }
                // If ambiguous (user didn't specify), show 4 images by default if available
                if (images.length > 0) return 4;
                return 0;
              })()}
              maxVideos={(() => {
                const text = allText.toLowerCase();
                // If user explicitly asks for video(s), ignore images
                if (/\b(video|videos|clip|clips|movie|movies|mp4|webm|mov|avi)\b/.test(text)) {
                  // Try to extract a number from the message text (e.g., "show me 2 videos")
                  const match = text.match(/(?:show|display|give|see|want|need|find|fetch|render|provide|list|give me|show me|display me|see me|want me|need me|find me|fetch me|render me|provide me|list me)?\s*(\d+)\s*(?:videos|clips|movies|mp4|webm|mov|avi)/);
                  if (match && match[1]) {
                    const n = parseInt(match[1], 10);
                    if (!isNaN(n) && n > 0) return n;
                  }
                  // If plural, show 4 by default
                  if (/videos|clips|movies/.test(text)) return 4;
                  // If singular, show 1
                  if (/video|clip|movie/.test(text)) return 1;
                  // Fallback: show 1 video
                  return 1;
                }
                // If user explicitly asks for image(s), ignore videos
                if (/\b(image|images|picture|pictures|photo|photos|pic|pics|img|jpg|jpeg|png|gif|gifs)\b/.test(text)) {
                  return 0;
                }
                // If ambiguous, fallback to previous logic: if both present, prefer images
                if (videos.length > 0 && images.length === 0) return 4;
                return 0;
              })()}
            />
          </div>
        )}
        <div className={cn(isAssistant ? "flex w-full flex-col sm:flex-row items-start" : "flex flex-row gap-4 w-full group-data-[role=user]/message:ml-auto group-data-[role=user]/message:max-w-2xl group-data-[role=user]/message:w-fit")}>
          {isAssistant ? (
            <div className={cn("group/ai-message-hoverable", isMobileOrTablet ? "w-full pl-10" : "w-fit")} style={{ marginLeft: 0, paddingLeft: 0, marginTop: isMobileOrTablet ? 32 : undefined }}>
              <div className={cn(!isMobileOrTablet && "flex flex-col space-y-4 w-fit", isMobileOrTablet && styles.clearfix)} style={{ alignItems: !isMobileOrTablet ? 'flex-start' : undefined }}>
                {/* Render all message parts safely, with hooks only at the top level */}
                {message.parts?.map((part, i) => {
                  if (part.type === "text") {
                    const isEffectivelyLastPart = i === (message.parts?.length || 0) - 1;
                    const isActivelyStreamingText = isAssistant && status === "streaming" && isLatestMessage && isEffectivelyLastPart;
                    return (
                      <motion.div key={`message-${message.id}-part-${i}`} initial={isActivelyStreamingText ? false : { y: 5, opacity: 0 }} animate={isActivelyStreamingText ? {} : { y: 0, opacity: 1 }} transition={{ duration: 0.2 }} className="flex flex-row items-start w-full pb-4">
                        <div className="flex flex-col gap-4" style={{ marginLeft: 0, alignItems: 'flex-start', background: 'none', border: 'none', boxShadow: 'none' }}>
                          <Markdown>{part.text}</Markdown>
                        </div>
                      </motion.div>
                    );
                  }
                  if (part.type === "tool-invocation") {
                    if (part.toolInvocation.state === "result") {
                      return <motion.div key={`message-${message.id}-part-${i}`} initial={{ opacity: 1, height: 'auto' }} animate={{ opacity: 0, height: 0, margin: 0, padding: 0 }} transition={{ duration: 0.35, ease: 'easeInOut' }} style={{ overflow: 'hidden' }} />;
                    }
                    const { toolName, state } = part.toolInvocation;
                    const label = (toolName === "googleSearch" && state === "call") ? "Searching the Web" : (toolName === "fetchUrl" && state === "call") ? "Analyzing Url data" : (toolName === "getWeatherdata" || toolName === "weatherTool") ? "Getting weather data" : (state === "call") ? `Running ${toolName}` : "";
                    const searchedSites = searchedSitesByPart[i] || [];
                    return (
                      <div className="flex flex-col" key={`message-${message.id}-part-${i}`}>
                        <div className="flex flex-row items-center gap-1" style={!isMobileOrTablet ? { marginLeft: '-16px', marginRight: '12px' } : { marginLeft: '-16px', marginRight: '12px' }}>
                          <div className="flex flex-row items-center gap-1">
                            <AnimatePresence initial={false}>
                              {searchedSites.map((url, idx) => (
                                <motion.img
                                  key={url}
                                  src={getFaviconUrl(url)}
                                  alt="site favicon"
                                  className="w-4 h-4 rounded-full border border-zinc-200 dark:border-zinc-700 shadow-sm -ml-1 first:ml-0"
                                  initial={{ x: -20, opacity: 0 }}
                                  animate={{ x: 0, opacity: 1 }}
                                  exit={{ x: 20, opacity: 0 }}
                                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                  style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.10)', position: 'relative', zIndex: 10 - idx, marginLeft: idx === 0 ? 0 : -8, display: 'inline-block' }}
                                />
                              ))}
                            </AnimatePresence>
                          </div>
                          <span className="font-medium pl-4 mt-1 relative inline-block" style={{ minWidth: 120, fontSize: '1rem' }}>
                            {state === "call" && label ? (
                              <span style={{ position: 'relative', display: 'inline-block' }}>
                                <span style={{ color: theme === 'dark' ? '#a3a3a3' : '#6b7280', background: theme === 'dark' ? 'linear-gradient(90deg, #fff 0%, #fff 40%, #a3a3a3 60%, #fff 100%)' : 'linear-gradient(90deg, #222 0%, #222 40%, #e0e0e0 60%, #222 100%)', backgroundSize: '200% 100%', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', animation: 'avurna-shimmer-text 1.3s linear infinite', animationTimingFunction: 'linear', willChange: 'background-position', display: 'inline-block' }} key={theme}> {label} </span>
                                <style>{`@keyframes avurna-shimmer-text { 0% { background-position: -100% 0; } 100% { background-position: 100% 0; } }`}</style>
                              </span>
                            ) : null}
                          </span>
                        </div>
                      </div>
                    );
                  }
                  if (part.type === "reasoning") {
                    return (
                      <ReasoningMessagePart key={`message-${message.id}-${i}`} part={part as ReasoningPartData} isReasoning={(message.parts && status === "streaming" && i === message.parts.length - 1) ?? false} />
                    );
                  }
                  return null;
                })}
              </div>
              {/* Always show the icon row, regardless of latest message */}
              {isAssistant && status === "ready" && (
                <div className={cn(!isMobileOrTablet ? "flex flex-row mb-8" : "relative w-full mt-8")} style={!isMobileOrTablet ? { marginTop: '-20px' } : { marginTop: '-16px' }}>
                  <motion.div className={cn("flex items-center gap-1 p-1 select-none pointer-events-auto group/ai-icon-row")}
                    data-ai-action
                    style={!isMobileOrTablet ? { marginLeft: '-16px', marginRight: '12px', alignSelf: 'flex-start' } : { position: 'absolute', left: 0, right: 0, marginLeft: '-16px', marginRight: '10px', zIndex: 10, justifyContent: 'start' }}
                    initial={{ opacity: 1 }} animate={{ opacity: 1 }}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" aria-label="Copy message" className={cn(!isMobileOrTablet ? "rounded-lg focus:outline-none flex h-[36px] w-[36px] items-center justify-center cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800" : "text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg focus:outline-none flex h-[36px] w-[36px] items-center justify-center")}
                          style={{ color: theme === 'dark' ? '#fff' : '#828282', background: 'transparent' }} onClick={handleCopy}>
                          {copied ? (<CheckIcon style={{ color: theme === 'dark' ? '#fff' : '#828282', transition: 'all 0.2s' }} />) : (<CopyIcon style={{ color: theme === 'dark' ? '#fff' : '#828282', transition: 'all 0.2s' }} />)}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="select-none">{copied ? "Copied!" : "Copy"}</TooltipContent>
                    </Tooltip>
                    {/* Sources button beside copy icon */}
                    {sources.length > 0 && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          {isMobileOrTablet ? (
                            <>
                              <button
                                className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 rounded-3xl text-sm font-medium ml-1"
                                type="button"
                                onClick={() => setSourcesDrawerOpen(true)}
                              >
                                {sources.slice(0, 3).map((src, idx) => (
                                  <span key={src.url + idx} style={{ position: 'relative', zIndex: 10 - idx, marginLeft: idx === 0 ? 0 : -8, display: 'inline-block', verticalAlign: 'middle', top: '-2px' }}>
                                    <SourceFavicon url={src.url} title={src.title} />
                                  </span>
                                ))}
                                <span style={{ verticalAlign: 'middle', position: 'relative', marginTop: '-2px' }}>{sources.length === 1 ? 'Source' : 'Sources'} ({sources.length})</span>
                              </button>
                              <Drawer open={sourcesDrawerOpen} onOpenChange={setSourcesDrawerOpen}>
                                <DrawerContent>
                                  <DrawerHeader>
                                    <DrawerTitle>Sources</DrawerTitle>
                                  </DrawerHeader>
                                  <div className="p-4 max-h-[70vh] w-full min-w-[260px] flex flex-col">
                                    <div className="overflow-y-auto max-h-[55vh] pr-1">
                                      {(() => {
                                        // Find googleSearch tool result with searchResults
                                        const googleSearchPart = (message.parts || []).find(
                                          (part: any) =>
                                            part.type === 'tool-invocation' &&
                                            'toolInvocation' in part &&
                                            part.toolInvocation?.toolName === 'googleSearch' &&
                                            Array.isArray(part.toolInvocation?.result?.searchResults)
                                        );
                                        const searchResults =
                                          googleSearchPart && 'toolInvocation' in googleSearchPart &&
                                            (googleSearchPart.toolInvocation as any)?.result?.searchResults
                                            ? (googleSearchPart.toolInvocation as any).result.searchResults
                                            : [];
                                        if (searchResults.length > 0) {
                                          return searchResults.map((result: any, i: number) => (
                                            <a
                                              key={i}
                                              href={result.url || result.sourceUrl}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="flex items-start gap-3 p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors mb-2"
                                            >
                                              <SourceFavicon url={result.url || result.sourceUrl} title={result.title || result.siteName || ''} />
                                              <div className="flex flex-col">
                                                <WebpageTitleDisplay source={{
                                                  title: result.title || result.siteName || '',
                                                  url: result.url || result.sourceUrl,
                                                  snippet: result.snippet || result.description || ''
                                                }} />
                                              </div>
                                            </a>
                                          ));
                                        }
                                        // Fallback: extract markdown sources
                                        const markdownSources = extractSourcesFromText(allText);
                                        if (markdownSources.length > 0) {
                                          // Helper to check if a title is valid
                                          const isValidTitle = (title: string) => {
                                            if (!title || title.length > 70 || title.includes('/') || !title.includes(' ')) {
                                              return false;
                                            }
                                            return true;
                                          };
                                          return markdownSources.map((src, i) => (
                                            <a
                                              key={i}
                                              href={src.url}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="flex items-start gap-3 p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors mb-2"
                                            >
                                              <SourceFavicon url={src.url} title={src.title} />
                                              <div className="flex flex-col">
                                                <div className="font-medium text-sm text-zinc-900 dark:text-zinc-100 line-clamp-1">
                                                  {isValidTitle(src.title) ? src.title : (() => { try { return new URL(src.url).hostname; } catch { return src.url; } })()}
                                                </div>
                                                <WebpageTitleDisplay source={{ url: src.url }} />
                                              </div>
                                            </a>
                                          ));
                                        }
                                        return <div className="text-sm text-zinc-500 dark:text-zinc-400">No sources found.</div>;
                                      })()}
                                    </div>
                                  </div>
                                </DrawerContent>
                              </Drawer>
                            </>
                          ) : (
                            <Sheet open={sourcesSidebarOpen} onOpenChange={setSourcesSidebarOpen}>
                              <SheetTrigger asChild>
                                <button
                                  className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 rounded-3xl text-sm font-medium ml-1"
                                  type="button"
                                  onClick={() => setSourcesSidebarOpen(true)}
                                >
                                  {sources.slice(0, 3).map((src, idx) => (
                                    <span key={src.url + idx} style={{ position: 'relative', zIndex: 10 - idx, marginLeft: idx === 0 ? 0 : -8, display: 'inline-block', verticalAlign: 'middle', top: '-2px' }}>
                                      <SourceFavicon url={src.url} title={src.title} />
                                    </span>
                                  ))}
                                  <span style={{ verticalAlign: 'middle', position: 'relative', marginTop: '-2px' }}>{sources.length === 1 ? 'Source' : 'Sources'} ({sources.length})</span>
                                </button>
                              </SheetTrigger>
                              <SheetContent side="right" className="p-0 max-w-md w-full flex flex-col">
                                <div className="flex flex-col h-full w-full">
                                  <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
                                    <div className="font-semibold text-lg">Sources</div>
                                    <button onClick={() => setSourcesSidebarOpen(false)} className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white p-1 rounded transition-colors cursor-pointer" aria-label="Close sources sidebar">
                                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M6 6l8 8M6 14L14 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                                    </button>
                                  </div>
                                  <div className="flex-1 overflow-y-auto px-6 py-4">
                                    {(() => {
                                      // Find googleSearch tool result with searchResults
                                      const googleSearchPart = (message.parts || []).find(
                                        (part: any) =>
                                          part.type === 'tool-invocation' &&
                                          'toolInvocation' in part &&
                                          part.toolInvocation?.toolName === 'googleSearch' &&
                                          Array.isArray(part.toolInvocation?.result?.searchResults)
                                      );
                                      const searchResults =
                                        googleSearchPart && 'toolInvocation' in googleSearchPart &&
                                          (googleSearchPart.toolInvocation as any)?.result?.searchResults
                                          ? (googleSearchPart.toolInvocation as any).result.searchResults
                                          : [];
                                      if (searchResults.length > 0) {
                                        return searchResults.map((result: any, i: number) => (
                                          <a
                                            key={i}
                                            href={result.url || result.sourceUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-start gap-3 p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors mb-2"
                                          >
                                            <SourceFavicon url={result.url || result.sourceUrl} title={result.title || result.siteName || ''} />
                                            <div className="flex flex-col">
                                              <WebpageTitleDisplay source={{
                                                title: result.title || result.siteName || '',
                                                url: result.url || result.sourceUrl,
                                                snippet: result.snippet || result.description || ''
                                              }} />
                                            </div>
                                          </a>
                                        ));
                                      }
                                      // Fallback: extract markdown sources
                                      const markdownSources = extractSourcesFromText(allText);
                                      if (markdownSources.length > 0) {
                                        return markdownSources.map((src, i) => (
                                          <a
                                            key={i}
                                            href={src.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-start gap-3 p-2  rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors mb-2"
                                          >
                                            <SourceFavicon url={src.url} title={src.title} />
                                            <div className="flex flex-col">
                                              <div className="font-medium text-sm text-zinc-500 dark:text-zinc-400 line-clamp-1"
                                                style={{ marginTop: '-3px' }}>{src.title}</div>
                                              <WebpageTitleDisplay source={{ url: src.url }} />
                                            </div>
                                          </a>
                                        ));
                                      }
                                      return <div className="text-sm text-zinc-500 dark:text-zinc-400">No sources found.</div>;
                                    })()}
                                  </div>
                                </div>
                              </SheetContent>
                            </Sheet>
                          )}
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="select-none">{sources.length === 1 ? 'Show source' : 'Show sources'}</TooltipContent>
                      </Tooltip>
                    )}
                  </motion.div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col w-full space-y-4">
              {(message.parts ?? []).map((part, i) => (
                <UserTextMessagePart key={`user-message-${message.id}-part-${i}`} part={part} isLatestMessage={isLatestMessage} />
              ))}
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