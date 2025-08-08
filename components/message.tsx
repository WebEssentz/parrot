// FILE: components/message.tsx

"use client";

import React from "react";
import { useEffect, useState } from "react";
import { saveDescriptionToIDB, getDescriptionFromIDB } from "../lib/desc-idb";
import { saveMediaToIDB } from "@/lib/media-idb";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";
import type { Message as TMessage } from "ai";
import { AnimatePresence, motion } from "framer-motion";
import TypewriterStream from './TypewriterStream';
import { useTheme } from "next-themes";
import { memo, useRef } from "react";
import { CopyIcon, CheckIcon, ThumbsUpIcon, ThumbsDownIcon } from "./icons";
import { StrategySlate } from "./strategy-slate";
import { Download, ExternalLink, File as FileIcon, FileText, Info, X } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { GithubWorkflowAggregator } from './ui/github-workflow-aggregator';
import { toast } from "sonner";
import { useUser } from "@clerk/nextjs";
import Image from "next/image"
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
import styles from "@/components/ui/image-slider.module.css";
import { MediaCarousel } from "./ui/media-carousel";

interface ImageOverlayProps {
  src: string;
  alt: string;
  onClose: () => void;
  fileName?: string;
  // Removed onOpenInLens prop as it's no longer needed
}

export default function ImageOverlay({
  src,
  alt,
  onClose,
  fileName,
}: ImageOverlayProps) { // Removed onOpenInLens from destructuring
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      // Use flex-col for a vertical layout and add padding around the entire overlay
      className="fixed inset-0 z-50 flex flex-col bg-black/80 backdrop-blur-md p-4 md:p-6" // Slightly more blur
      onClick={onClose}
    >
      {/* Header Bar */}
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -50, opacity: 0 }}
        transition={{ delay: 0.1, duration: 0.2 }}
        // The header now sits cleanly at the top. Use relative and z-10 to keep it above the image.
        // Updated to explicitly center filename and handle actions separately
        className="relative z-10 flex w-full items-center justify-between text-white mb-4" // Added margin-bottom
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left Section: Close Button */}
        <button
          onClick={onClose}
          className="p-2 rounded-full cursor-pointer transition-colors hover:bg-white/20"
          aria-label="Close image view"
        >
          <X size={24} />
        </button>

        {/* Center Section: Filename (if provided) */}
        {fileName && (
          <span className="flex-1 text-center text-lg font-semibold truncate px-4"> {/* flex-1 to allow centering, truncate for long names */}
            {fileName}
          </span>
        )}

        {/* Right Section: New Action Buttons (e.g., Download, Info) */}
        <div className="flex items-center space-x-2">
          {/* Example: Download Button */}
          <button
            // You'll need to implement the actual download logic here or pass it as a prop
            onClick={(e) => { e.stopPropagation(); console.log('Download clicked for:', src); /* Add download logic */ }}
            className="p-2 rounded-full cursor-pointer transition-colors hover:bg-white/20"
            aria-label="Download image"
            title="Download image" // Tooltip
          >
            <Download size={20} />
          </button>
          {/* Example: Info Button (placeholder for more details) */}
          <button
            // You'll need to implement the info display logic here or pass it as a prop
            onClick={(e) => { e.stopPropagation(); console.log('Info clicked for:', src); /* Add info display logic */ }}
            className="p-2 rounded-full cursor-pointer transition-colors hover:bg-white/20"
            aria-label="Image information"
            title="Image information" // Tooltip
          >
            <Info size={20} />
          </button>
        </div>
      </motion.div>

      {/* Image Container - This now grows to fill available space */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30, delay: 0.05 }}
        // flex-1 makes the container grow, and my-4 adds vertical spacing.
        className="relative my-4 h-full w-full flex-1 flex items-center justify-center" // Added flex for centering image within container
        onClick={(e) => e.stopPropagation()}
      >
        {/* Using layout="fill" with objectFit="contain" is the key to making the image
          responsive. It will fill the parent container while maintaining its aspect
          ratio without being cropped. The parent div now controls the size.
        */}
        <Image
          src={src}
          alt={alt}
          layout="fill"
          objectFit="contain"
          className="rounded-xl shadow-xl" // Slightly less rounding and shadow for a cleaner look
        />
      </motion.div>
    </motion.div>
  );
}

function isValidUUID(id: string): boolean {
  if (!id) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

async function prefetchSourceMeta(sources: { url: string; title?: string }[]) {
  for (const src of sources) {
    extractWebpageName(src.url).then(name => { });
    getDescriptionFromIDB(src.url).then(async (desc) => {
      if (!desc) {
        const newDesc = await fetchWebpageDescription(src.url);
        if (newDesc) {
          await saveDescriptionToIDB(src.url, newDesc);
        }
      }
    });
  }
}

export async function extractWebpageName(resolvedUrl: string): Promise<string> {
  if (!resolvedUrl) return '';
  try {
    const apiUrl = `https://api.microlink.io/?url=${encodeURIComponent(resolvedUrl)}`;
    const response = await fetch(apiUrl);
    if (response.ok) {
      const data = await response.json();
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
      } catch { }
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

const descriptionCache: Record<string, string> = {};

function WebpageTitleDisplay({ source }: { source?: { title?: string; url: string; snippet?: string } }) {
  const title = useWebpageTitle(source?.url || "");
  const [description, setDescription] = useState<string>("");
  const [hasFetched, setHasFetched] = useState(false);
  const [isOffline, setIsOffline] = useState(typeof window !== 'undefined' ? !navigator.onLine : false);

  useEffect(() => {
    let cancelled = false;
    if (!source?.url) return;
    (async () => {
      const idbDesc = await getDescriptionFromIDB(source.url);
      if (!cancelled && idbDesc) {
        setDescription(idbDesc);
        setHasFetched(true);
        return;
      }
      if (!cancelled && Object.prototype.hasOwnProperty.call(descriptionCache, source.url)) {
        setDescription(descriptionCache[source.url]);
        setHasFetched(true);
        return;
      }
      if (!cancelled) {
        setHasFetched(false);
      }
    })();
    return () => { cancelled = true; };
  }, [source?.url]);

  useEffect(() => {
    let cancelled = false;
    if (!source?.url || hasFetched) return;
    if (Object.prototype.hasOwnProperty.call(descriptionCache, source.url)) {
      setDescription(descriptionCache[source.url]);
      setHasFetched(true);
      return;
    }
    (async () => {
      const desc = await fetchWebpageDescription(source.url);
      if (!cancelled) {
        setDescription(desc);
        descriptionCache[source.url] = desc;
        if (isOffline && desc) {
          await saveDescriptionToIDB(source.url, desc);
        }
        setHasFetched(true);
      }
    })();
    return () => { cancelled = true; };
  }, [source?.url, hasFetched, isOffline]);

  useEffect(() => {
    const goOnline = () => setIsOffline(false);
    const goOffline = () => setIsOffline(true);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    setIsOffline(!navigator.onLine);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  useEffect(() => {
    if (!isOffline || !source?.url) return;
    if (descriptionCache[source.url]) {
      saveDescriptionToIDB(source.url, descriptionCache[source.url]);
    }
  }, [isOffline, source?.url]);

  if (!source || !source.url) return null;
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

const faviconCache: Record<string, string> = {};

function SourceFavicon({ url, title }: { url: string; title: string }) {
  const [favicon, setFavicon] = React.useState<string | null>(url ? faviconCache[url] || null : null);
  const [loading, setLoading] = React.useState(!favicon);
  const [errored, setErrored] = React.useState(false);

  useEffect(() => {
    let cancelled = false;
    if (faviconCache[url]) {
      setFavicon(faviconCache[url]);
      setLoading(false);
      setErrored(false);
      return;
    }
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
          faviconCache[url] = "/file.svg";
          setFavicon("/file.svg");
          setLoading(false);
          return;
        } else if (u.protocol === "window:") {
          faviconCache[url] = "/window.svg";
          setFavicon("/window.svg");
          setLoading(false);
          return;
        } else {
          const favUrl = getFaviconUrl(urlToUse);
          setFavicon(favUrl);
        }
      } catch {
        faviconCache[url] = "/globe.svg";
        setFavicon("/globe.svg");
        setLoading(false);
        return;
      }
    })();
    return () => { cancelled = true; };
  }, [url]);

  useEffect(() => {
    if (!favicon) return;
    if (faviconCache[url] === favicon) {
      setLoading(false);
      setErrored(false);
      return;
    }
    setLoading(true);
    setErrored(false);
    const img = new window.Image();
    img.src = favicon;
    img.onload = async () => {
      faviconCache[url] = favicon;
      setLoading(false);
      setErrored(false);
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

const resolvedUrlCache: Record<string, Promise<string>> = {};

export async function resolveRedirectUrls(sites: string[]): Promise<Record<string, string>> {
  const toResolve = sites.filter(siteUrl => siteUrl.includes("vertexaisearch.cloud.google.com/grounding-api-redirect/"));
  const alreadyCached: Record<string, string> = {};
  for (const url of toResolve) {
    if (Object.prototype.hasOwnProperty.call(resolvedUrlCache, url)) {
      const cached = resolvedUrlCache[url];
      if (cached && typeof cached.then === 'function') { }
    }
  }
  const needToFetch = toResolve.filter(url => !alreadyCached[url]);
  let resolvedMap: Record<string, string> = {};
  if (needToFetch.length > 0) {
    const promise = fetch("/api/resolve-redirect/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ urls: needToFetch }),
    })
      .then(res => res.json())
      .then(data => data.resolved || {})
      .catch(() => ({}));
    const result = await promise;
    Object.entries(result).forEach(([k, v]) => {
      resolvedUrlCache[k] = Promise.resolve(String(v));
    });
    resolvedMap = { ...alreadyCached, ...result };
  } else {
    resolvedMap = alreadyCached;
  }
  sites.forEach(url => {
    if (!url.includes("vertexaisearch.cloud.google.com/grounding-api-redirect/")) {
      resolvedMap[url] = url;
    }
  });
  return resolvedMap;
}

export async function resolveRedirectUrl(siteUrl: string): Promise<string> {
  const result = await resolveRedirectUrls([siteUrl]);
  return result[siteUrl] || siteUrl;
}

export function getFaviconUrl(siteUrl: string): string {
  try {
    const url = new URL(siteUrl);
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

const UserTextMessagePart = ({ part, isLatestMessage }: { part: any, isLatestMessage: boolean }) => {
  const EditIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12.1 4.93l2.97 2.97M4 13.06V16h2.94l8.06-8.06a2.1 2.1 0 0 0-2.97-2.97L4 13.06z" />
    </svg>
  );
  const [expanded, setExpanded] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const copyTimeout = useRef<NodeJS.Timeout | null>(null);
  const { theme } = useTheme();
  const isMobileOrTablet = useIsMobileOrTablet();
  const { isSignedIn, user: liveUser } = useUser();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const imageUrlToShow = part.experimental_customData?.imageUrl || liveUser?.imageUrl;

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
  const isWideUserMessage = part.text.length > 80;

  if (!mounted) {
    return (
      <motion.div initial={{ y: 5, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.2 }} className="flex flex-row items-center w-full pb-4">
        {isSignedIn && (
          <div className="flex-shrink-0" style={{ alignSelf: 'flex-start', marginTop: '10px', marginRight: '8px' }}>
            <div className="h-7 w-7 rounded-full bg-zinc-200 dark:bg-zinc-700 animate-pulse" />
          </div>
        )}
        <div className={isSignedIn ? "flex flex-row w-full items-start" : "flex flex-row w-full items-start"}>
          <div className="h-12 w-48 bg-zinc-200 dark:bg-zinc-700 rounded-xl animate-pulse" />
        </div>
      </motion.div>
    );
  }

  const bubbleBgColor = theme === 'dark' ? '#2A2A2A' : '#f3f5f6';
  const tailBorderColor = theme === 'dark' ? '#2A2A2A' : '#efeff3ff';

  return (
    <>
      <style jsx global>{`
  .user-bubble-with-tail {
    position: relative;
  }
  .user-bubble-with-tail::before {
    content: "";
    position: absolute;
    width: 0px;
    height: 0px;
    left: -8px;
    top: 14px;
    transform: translateY(-50%);
    border-top: 6px solid transparent;
    border-bottom: 6px solid transparent;
    border-right: 8px solid var(--tail-color, #efeff3ff);
  }
`}</style>

      <motion.div initial={{ y: 5, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.2 }} className="flex flex-row items-center w-full pb-4">
        {isSignedIn && (
          <div className="flex-shrink-0" style={{ alignSelf: 'flex-start', marginTop: '10px', marginRight: '8px' }}>
            {imageUrlToShow && (
              <img
                src={imageUrlToShow}
                alt="User Avatar"
                className="h-7 w-7 rounded-full"
              />
            )}
          </div>
        )}
        <div className={isSignedIn ? "flex flex-row w-full items-start" : "flex flex-row w-full items-start"} style={{ background: 'none', border: 'none', boxShadow: 'none', position: 'relative' }}>
          <div className="group/user-message flex flex-col items-start w-full gap-1 relative justify-center pb-2" style={{ flex: '1 1 auto', position: 'relative' }}>
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', width: '100%' }}>
              <motion.div
                layout
                className={cn(
                  "user-bubble-with-tail",
                  "group/message-bubble prose-p:opacity-95 prose-strong:opacity-100 border border-border-l1 message-bubble prose min-h-7 text-primary dark:prose-invert bg-zinc-50 text-zinc-900 dark:text-zinc-100 px-5 py-2.5 rounded-xl relative text-left break-words",
                  isLongUserMessage ? "max-w-[90vw]" : "max-w-[70vw]",
                  isLongUserMessage && "relative"
                )}
                style={{
                  lineHeight: '1.5',
                  overflow: 'hidden',
                  paddingTop: !isLongUserMessage ? '12px' : undefined,
                  background: bubbleBgColor,
                  borderColor: tailBorderColor,
                  ['--tail-color' as string]: tailBorderColor,
                }}
                transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              >
                <div style={{ paddingRight: (!isMobileOrTablet && !isWideUserMessage) ? 72 : isLongUserMessage ? 36 : undefined, position: 'relative' }}>
                  <AnimatePresence initial={false} mode="wait">
                    <motion.div
                      key={expanded ? "full" : "truncated"}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      {isLongUserMessage && !expanded
                        ? part.text.slice(0, LONG_MESSAGE_CHAR_LIMIT) + '...'
                        : part.text}
                    </motion.div>
                  </AnimatePresence>

                  {isLongUserMessage && (
                    <div style={{ position: 'absolute', top: 32, right: 8, zIndex: 10, display: 'flex', alignItems: 'center' }}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button type="button" aria-label={expanded ? "Collapse message" : "Expand message"} className="rounded-full p-1 flex items-center justify-center bg-transparent hover:bg-zinc-200 dark:hover:bg-zinc-700 cursor-pointer" onClick={e => { e.stopPropagation(); setExpanded(v => !v); }} tabIndex={0}>
                            <AnimatePresence initial={false} mode="wait">
                              <motion.div
                                key={expanded ? "up" : "down"}
                                initial={{ rotate: -90, opacity: 0 }}
                                animate={{ rotate: 0, opacity: 1 }}
                                exit={{ rotate: 90, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                              >
                                {expanded ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />}
                              </motion.div>
                            </AnimatePresence>
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="select-none z-[9999]" sideOffset={3} align="end">{expanded ? "Collapse message" : "Expand message"}</TooltipContent>
                      </Tooltip>
                    </div>
                  )}
                  {!isMobileOrTablet && !isWideUserMessage && (
                    <div style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', display: 'flex', gap: 2 }}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span
                            className="edit-icon-short-user-message rounded-full p-1.5 transition-colors"
                            style={{
                              cursor: 'pointer',
                              color: theme === 'dark' ? '#a1a1aa' : '#52525b',
                              transition: 'opacity 0.18s',
                              pointerEvents: 'auto',
                              background: 'transparent',
                              marginRight: '2px',
                              marginTop: '1px',
                            }}
                            tabIndex={-1}
                            onMouseEnter={e => { e.currentTarget.style.background = theme === 'dark' ? '#27272a' : '#e4e4e7'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                          >
                            <EditIcon style={{ color: theme === 'dark' ? '#a1a1aa' : '#52525b' }} />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" align="center" className="select-none">Edit message</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            aria-label="Copy message"
                            className="copy-icon-short-user-message rounded-full p-1.5 transition-colors"
                            style={{
                              cursor: 'pointer',
                              color: theme === 'dark' ? '#a1a1aa' : '#52525b',
                              transition: 'opacity 0.18s',
                              pointerEvents: 'auto',
                              background: 'transparent',
                              marginRight: '0px',
                              marginTop: '1px',
                            }}
                            tabIndex={-1}
                            onClick={e => { e.stopPropagation(); handleUserMessageCopy(part.text); }}
                            onMouseEnter={e => { e.currentTarget.style.background = theme === 'dark' ? '#27272a' : '#e4e4e7'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                          >
                            {copied
                              ? (<CheckIcon style={{ color: theme === 'dark' ? '#a1a1aa' : '#52525b', transition: 'all 0.2s' }} />)
                              : (<CopyIcon style={{ color: theme === 'dark' ? '#a1a1aa' : '#52525b', transition: 'all 0.2s' }} />)
                            }
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" align="center" className="select-none">{copied ? "Copied!" : "Copy"}</TooltipContent>
                      </Tooltip>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
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
            {!isMobileOrTablet && isWideUserMessage && (
              <div
                className={cn(
                  "mt-1 flex transition-opacity duration-200",
                  !isLatestMessage ? "opacity-0 group-hover/user-message:opacity-100" : "opacity-100",
                  "justify-end w-full"
                )}
                style={{ marginRight: 0 }}
              >
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
    </>
  );
};

// THIS IS THE COMPONENT TO REPLACE
const CommittedPreview = ({ attachment, onImageClick }: { attachment: any; onImageClick: (url: string) => void; }) => {
  const isImage = attachment.contentType?.startsWith('image/');
  const isTextFile = attachment.contentType === "text/plain";

  // The image preview logic is perfect, so we keep it.
  if (isImage) {
    return (
      <button
        onClick={() => onImageClick(attachment.url)}
        className="relative h-20 w-20 hover:cursor-pointer flex-shrink-0 group rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800"
      >
        <img
          src={attachment.url}
          alt={attachment.name}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
      </button>
    );
  }

  // --- NEW LOGIC FOR TEXT FILES AND OTHER DOCUMENTS ---
  // We now render a component that looks exactly like our FilePreview chip,
  // but it's a simple link that opens the file in a new tab.
  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noopener noreferrer"
      // This className recreates the look of our text file chip
      className="h-12 w-48 max-w-48 rounded-lg flex items-center gap-2 text-left transition-colors duration-200
                 bg-zinc-100 border border-zinc-200/80 hover:border-zinc-300 hover:bg-zinc-200 
                 dark:bg-zinc-900/40 dark:border-zinc-700/40 dark:hover:border-zinc-600/40 dark:hover:bg-zinc-800 
                 focus:outline-none focus:ring-1 focus:ring-ring focus:ring-offset-1 px-2.5"
    >
      {/* Conditionally render a text icon or a generic file icon */}
      {isTextFile ? (
        <FileText className="h-5 w-5 flex-shrink-0 text-green-600 dark:text-green-500" />
      ) : (
        <FileIcon className="h-5 w-5 flex-shrink-0 text-zinc-500" />
      )}
      <p className="flex-grow truncate text-sm font-medium text-zinc-700 dark:text-zinc-200">
        {attachment.name}
      </p>
    </a>
  );
};

const PurePreviewMessage = ({ chatId, message, isLatestMessage, onAnimationComplete, stop, userStoppedAnimation, animatingMessageId, setAnimatingMessageId, status }: { chatId: string; stop: () => void; userStoppedAnimation: boolean; onAnimationComplete: () => void; message: TMessage; isLoading: boolean; status: "error" | "submitted" | "streaming" | "ready"; isLatestMessage: boolean; animatingMessageId: string | null; setAnimatingMessageId: React.Dispatch<React.SetStateAction<string | null>>; }) => {
  const { theme } = useTheme ? useTheme() : { theme: undefined };
  const { user } = useUser();
  const isAssistant = message.role === "assistant";
  const [sourcesSidebarOpen, setSourcesSidebarOpen] = useState(false);
  const [sourcesDrawerOpen, setSourcesDrawerOpen] = useState(false);
  const [voteStatus, setVoteStatus] = useState<'up' | 'down' | null>(null);
  const [viewingImage, setViewingImage] = useState<string | null>(null);

  // --- FIX: SIMPLIFY THE COMPLETION HANDLER ---
  const handleAnimationComplete = () => {
    // 1. Tell the parent to clear the animation state, which will hide the "stop" button.
    setAnimatingMessageId(null);
    
    // 2. Call the onAnimationComplete prop, which now triggers handleSaveChat in the parent.
    onAnimationComplete();
  };

  // 5. This effect runs to tell the parent when an animation SHOULD start.
  useEffect(() => {
    // If this is the latest message and it's a new stream,
    // tell the parent component to start the animation for this message's ID.
    if (isLatestMessage && status === 'streaming' && !userStoppedAnimation) {
      setAnimatingMessageId(message.id);
    }
  }, [isLatestMessage, status, message.id, setAnimatingMessageId, userStoppedAnimation]);


  const reasoningParts = React.useMemo(() =>
    message.parts?.filter(part => part.type === 'reasoning') ?? [],
    [message.parts]
  );

  const regularParts = React.useMemo(() =>
    message.parts?.filter(part => part.type !== 'reasoning') ?? [],
    [message.parts]
  );

  const userAttachments = React.useMemo(() => {
    if (message.role !== "user" || !message.experimental_attachments) {
      return [];
    }
    return message.experimental_attachments;
  }, [message.role, message.experimental_attachments]);

  const isLastPartReasoning = React.useMemo(() => {
    if (!message.parts || message.parts.length === 0) return false;
    return message.parts[message.parts.length - 1].type === 'reasoning';
  }, [message.parts]);

  // --- FIX: Separated calculation from destructuring to avoid TDZ error ---
  const memoizedData = React.useMemo(() => {
    const extractedImages: { src: string; alt?: string; source?: { url: string; title?: string; } }[] = [];
    const extractedVideos: { src: string; poster?: string; title?: string }[] = [];
    let combinedText = "";
    let foundSearchResults: Array<{ image?: string; imageUrl?: string; title?: string; url?: string }> = [];
    let foundVisionFiltering: any = undefined;

    if (isAssistant) {
      for (const part of message.parts || []) {
        if (part.type === "tool-invocation" && (part.toolInvocation as any)?.result) {
          const result = (part.toolInvocation as any).result;
          if (result) {
            if (Array.isArray(result.images)) extractedImages.push(...result.images);
            if (Array.isArray(result.videos)) extractedVideos.push(...result.videos);
            if (
              Array.isArray(result.searchResults) &&
              result.searchResults.some((r: { image?: string; imageUrl?: string }) => r.image || r.imageUrl)
            ) {
              foundSearchResults = result.searchResults;
            }
            if (result.visionFiltering) {
              foundVisionFiltering = result.visionFiltering;
            }
          }
        } else if (part.type === "text" && part.text.trim()) {
          combinedText += part.text + "\n\n";
        }
      }
    }
    const extractedSources = extractSourcesFromText(combinedText);
    return { images: extractedImages, videos: extractedVideos, sources: extractedSources, allText: combinedText, searchResults: foundSearchResults, visionFiltering: foundVisionFiltering };
  }, [message.parts, isAssistant]);

  const { images, videos, sources, allText, searchResults, visionFiltering } = memoizedData;

  useEffect(() => {
    if (sources.length > 0) {
      prefetchSourceMeta(sources);
    }
  }, [sources]);

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
      let sitesForThisPart: string[] = [];
      if (state === "call" && isLatestMessage && status !== "ready") {
        if (toolName === "fetchUrl" && args && typeof args === "object" && args.url) {
          const url = args.url as string;
          if (url) sitesForThisPart.push(url);
        }
      } else if (state === "result") {
        if (toolName === "googleSearch" && result && result.sources && Array.isArray(result.sources)) {
          const sourceUrls = result.sources.map((s: any) => s.sourceUrl || s.url).filter(Boolean);
          sitesForThisPart.push(...sourceUrls);
        }
      }
      const uniqueSites = Array.from(new Set(sitesForThisPart));
      if (uniqueSites.length > 0) {
        currentUpdates[i] = uniqueSites;
      }
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
  }, [message.parts, isLatestMessage, status]);

  const stripSourcesBlock = (text: string) => text.replace(/<!-- AVURNA_SOURCES_START -->[\s\S]*?<!-- AVURNA_SOURCES_END -->/g, "").trim();
  const aiMessageText = stripSourcesBlock(allText);

  const handleCopy = () => {
    copyToClipboard(aiMessageText);
    setCopied(true);
    if (isMobileOrTablet) toast("Copied to Clipboard");
    if (copyTimeout.current) clearTimeout(copyTimeout.current);
    copyTimeout.current = setTimeout(() => setCopied(false), 1000);
  };

  const canVote = isValidUUID(message.id);

  const handleVote = async (voteType: 'up' | 'down') => {
    if (!canVote) {
      toast.info("This message isn't saved yet. Please wait a moment and try again.");
      return;
    }

    if (voteStatus) return;

    if (!user) {
      toast.error("You must be logged in to vote.");
      return;
    }

    setVoteStatus(voteType);

    try {
      const response = await fetch('/api/chat/vote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chatId,
          messageId: message.id,
          voteType,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setVoteStatus(null);
        toast.error(errorData.message || "Failed to record vote.");
      }
    } catch (error) {
      setVoteStatus(null);
      toast.error("An unexpected error occurred.");
    }
  };

  useEffect(() => () => { if (copyTimeout.current) clearTimeout(copyTimeout.current); }, []);

  const hasContent = isAssistant ? (message.parts ?? []).some(p => p.type !== 'tool-invocation' || (p.toolInvocation as any)?.result) : (message.parts ?? []).length > 0;
  if (!hasContent && status === 'ready') return null;

  const baseButtonClass = !isMobileOrTablet
    ? "rounded-lg focus:outline-none flex h-[36px] w-[36px] items-center justify-center cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800"
    : "text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg focus:outline-none flex h-[36px] w-[36px] items-center justify-center";

  const unselectedColor = theme === 'dark' ? '#FFFFFF' : '#71717A';
  const selectedFillColor = theme === 'dark' ? '#f9f9f9' : '#000000';

  return (
    <AnimatePresence key={message.id}>
      <AnimatePresence>
        {viewingImage && (
          <ImageOverlay src={viewingImage} alt="Attachment Preview" onClose={() => setViewingImage(null)} />
        )}
      </AnimatePresence>

      <motion.div className="w-full mx-auto px-2 sm:px-2 group/message max-w-[97.5%] sm:max-w-[53rem]" initial={{ y: 5, opacity: 0 }} animate={{ y: 0, opacity: 1 }} key={`message-${message.id}`} data-role={message.role}>
        {isAssistant && (
          (images.length > 0 || videos.length > 0) ? (
            <div className="mb-4 w-full">
              <MediaCarousel
                images={images}
                videos={videos}
                maxImages={(() => {
                  const text = allText.toLowerCase();
                  if (/\b(image|images|picture|pictures|photo|photos|pic|pics|img|jpg|jpeg|png|gif|gifs)\b/.test(text)) {
                    const match = text.match(/(?:show|display|give|see|want|need|find|fetch|render|provide|list|give me|show me|display me|see me|want me|need me|find me|fetch me|render me|provide me|list me)?\s*(\d+)\s*(?:images|pictures|photos|pics|img|jpg|jpeg|png|gifs?)/);
                    if (match && match[1]) {
                      const n = parseInt(match[1], 10);
                      if (!isNaN(n) && n > 0) return n;
                    }
                    if (/images|pictures|photos|pics|gifs/.test(text)) return 4;
                    if (/image|picture|photo|pic|gif/.test(text)) return 1;
                    return 1;
                  }
                  if (/\b(video|videos|clip|clips|movie|movies|mp4|webm|mov|avi)\b/.test(text)) {
                    return 0;
                  }
                  if (images.length > 0) return 4;
                  return 0;
                })()}
                maxVideos={(() => {
                  const text = allText.toLowerCase();
                  if (/\b(video|videos|clip|clips|movie|movies|mp4|webm|mov|avi)\b/.test(text)) {
                    const match = text.match(/(?:show|display|give|see|want|need|find|fetch|render|provide|list|give me|show me|display me|see me|want me|need me|find me|fetch me|render me|provide me|list me)?\s*(\d+)\s*(?:videos|clips|movies|mp4|webm|mov|avi)/);
                    if (match && match[1]) {
                      const n = parseInt(match[1], 10);
                      if (!isNaN(n) && n > 0) return n;
                    }
                    if (/videos|clips|movies/.test(text)) return 4;
                    if (/video|clip|movie/.test(text)) return 1;
                    return 1;
                  }
                  if (/\b(image|images|picture|pictures|photo|photos|pic|pics|img|jpg|jpeg|png|gif|gifs)\b/.test(text)) {
                    return 0;
                  }
                  if (videos.length > 0 && images.length === 0) return 4;
                  return 0;
                })()}
                visionFiltering={visionFiltering}
              />
            </div>
          ) : (searchResults.length > 0 && (
            <div className="mb-4 w-full">
              <MediaCarousel
                images={searchResults
                  .filter((r: any) => r.image || r.imageUrl)
                  .map((r: any) => ({
                    src: r.image || r.imageUrl,
                    alt: r.title || r.snippet || r.text || '',
                    source: { url: r.url || r.sourceUrl || '', title: r.title || '' }
                  }))}
                visionFiltering={visionFiltering}
              />
            </div>
          ))
        )}
        <div className={cn("flex w-full flex-col items-start")}>
          {isAssistant ? (
            <div className={cn("group/ai-message-hoverable", isMobileOrTablet ? "w-full pl-10" : "w-fit")} style={{ marginLeft: 0, paddingLeft: 0, marginTop: isMobileOrTablet ? 32 : undefined }}>
              <div className={cn(!isMobileOrTablet && "flex flex-col space-y-4 w-fit", isMobileOrTablet && styles.clearfix)} style={{ alignItems: !isMobileOrTablet ? 'flex-start' : undefined }}>
                {reasoningParts.length > 0 && (
                  <StrategySlate
                    reasoningParts={reasoningParts}
                    isLastPartReasoning={isLastPartReasoning}
                  />
                )}
                {regularParts.map((part, i) => {
                  // We only care about rendering text parts here.
                  if (part.type === "text") {

                    // This is our single source of truth for whether to animate.
                    // It's true only for the very last message, and only while our
                    // new `isAnimating` state says we should be.
                    const shouldAnimate = animatingMessageId === message.id;

                    return (
                      <motion.div
                        key={`message-${message.id}-part-${i}`}
                        className="flex flex-row items-start w-full pb-4"
                        // These animation props can be simplified or removed if they conflict
                        initial={{ y: 5, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="flex flex-col gap-4" style={{ marginLeft: 0, alignItems: 'flex-start', background: 'none', border: 'none', boxShadow: 'none' }}>
                          {shouldAnimate ? (
                            // --- If we should animate, render the typewriter ---
                            <TypewriterStream
                              fullText={part.text}
                              // Give it the function to call when its own animation is finished
                              onComplete={handleAnimationComplete}
                              isStopped={userStoppedAnimation}
                            />
                          ) : (
                            // --- Otherwise, render the static, final content ---
                            <Markdown>{part.text}</Markdown>
                          )}
                        </div>
                      </motion.div>
                    );
                  }
                  if (part.type === "tool-invocation") {
                    const githubWorkflowInvocations = (message.parts ?? []).filter(
                      p => p.type === 'tool-invocation' && p.toolInvocation.toolName === 'githubTool'
                    );
                    if (
                      part.toolInvocation.toolName === 'githubTool' &&
                      part.toolInvocation.state === 'call' &&
                      githubWorkflowInvocations.length > 0
                    ) {
                      return (
                        <div key={`message-${message.id}-part-${i}`} className="w-full">
                          <GithubWorkflowAggregator invocations={githubWorkflowInvocations} />
                        </div>
                      );
                    }
                    if (part.toolInvocation.state === "result") {
                      return <motion.div key={`message-${message.id}-part-${i}`} initial={{ opacity: 1, height: 'auto' }} animate={{ opacity: 0, height: 0, margin: 0, padding: 0 }} transition={{ duration: 0.35, ease: 'easeInOut' }} style={{ overflow: 'hidden' }} />;
                    }
                    const { toolName, state } = part.toolInvocation;
                    const label = (toolName === "googleSearch" && state === "call") ? "Searching the Web" : (toolName === "fetchUrl" && state === "call") ? "Analyzing Url data" : (toolName === "getWeatherdata" || toolName === "weatherTool") ? "Getting weather data" : (state === "call") ? `Running ${toolName}` : "";
                    const searchedSites = searchedSitesByPart[i] || [];
                    return (
                      <div className="flex flex-col" key={`message-${message.id}-part-${i}`}>
                        <div className="flex flex-row items-center gap-1" style={!isMobileOrTablet ? { marginLeft: '-16px', marginRight: '12px' } : { marginLeft: '-16px', marginRight: '12px' }}>
                          <div className="flex flex-row items-center gap-0.5">
                            <AnimatePresence initial={false}>
                              {searchedSites.map((url, idx) => (
                                <motion.img
                                  key={url}
                                  src={getFaviconUrl(url)}
                                  alt="site favicon"
                                  className="w-4 h-4 rounded-full border border-zinc-200 dark:border-zinc-700 shadow-sm"
                                  initial={{ x: -20, opacity: 0 }}
                                  animate={{ x: 0, opacity: 1 }}
                                  exit={{ x: 20, opacity: 0 }}
                                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                  style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.10)', position: 'relative', zIndex: 10 - idx, marginLeft: 0, display: 'inline-block', marginRight: 6, top: '6px' }}
                                />
                              ))}
                            </AnimatePresence>
                            {toolName === "fetchUrl" && state === "call" && label ? (
                              <span className="font-medium pl-1 mt-1 relative inline-block" style={{ minWidth: 120, fontSize: '1rem', marginLeft: 4 }}>
                                <span style={{ position: 'relative', display: 'inline-block' }}>
                                  <span style={{ color: theme === 'dark' ? '#a3a3a3' : '#6b7280', background: theme === 'dark' ? 'linear-gradient(90deg, #fff 0%, #fff 40%, #a3a3a3 60%, #fff 100%)' : 'linear-gradient(90deg, #222 0%, #222 40%, #e0e0e0 60%, #222 100%)', backgroundSize: '200% 100%', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', animation: 'avurna-shimmer-text 1.3s linear infinite', animationTimingFunction: 'linear', willChange: 'background-position', display: 'inline-block' }} key={theme}> {label} </span>
                                  <style>{`@keyframes avurna-shimmer-text { 0% { background-position: -100% 0; } 100% { background-position: 100% 0; } }`}</style>
                                </span>
                              </span>
                            ) : state === "call" && label ? (
                              <span className="font-medium pl-1 mt-1 relative inline-block" style={{ minWidth: 120, fontSize: '1rem' }}>
                                <span style={{ position: 'relative', display: 'inline-block' }}>
                                  <span style={{ color: theme === 'dark' ? '#a3a3a3' : '#6b7280', background: theme === 'dark' ? 'linear-gradient(90deg, #fff 0%, #fff 40%, #a3a3a3 60%, #fff 100%)' : 'linear-gradient(90deg, #222 0%, #222 40%, #e0e0e0 60%, #222 100%)', backgroundSize: '200% 100%', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', animation: 'avurna-shimmer-text 1.3s linear infinite', animationTimingFunction: 'linear', willChange: 'background-position', display: 'inline-block' }} key={theme}> {label} </span>
                                  <style>{`@keyframes avurna-shimmer-text { 0% { background-position: -100% 0; } 100% { background-position: 100% 0; } }`}</style>
                                </span>
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    );
                  }
                })}
              </div>
              {isAssistant && animatingMessageId !== message.id && (
                <div className={cn(!isMobileOrTablet ? "flex flex-row mb-8" : "w-full mb-14")} style={!isMobileOrTablet ? { marginTop: '-20px' } : { marginTop: '-16px' }}>
                  {/* --- NEW, STYLED "STOPPED" MESSAGE --- */}
                  {userStoppedAnimation && isLatestMessage && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="w-full text-sm italic text-zinc-500 mt-3 dark:text-zinc-400 -mt-2 mb-2"
                      style={{ marginLeft: !isMobileOrTablet ? '-16px' : undefined, paddingLeft: !isMobileOrTablet ? '1rem' : undefined }}
                    >
                      You stopped this response.
                    </motion.div>
                  )}
                  <motion.div className={cn("flex items-center gap-0.5 p-1 select-none pointer-events-auto group/ai-icon-row")}
                    data-ai-action
                    style={!isMobileOrTablet ? { marginLeft: '-16px', marginRight: '12px', alignSelf: 'flex-start' } : { position: 'relative', left: 0, right: 0, marginLeft: '-16px', marginRight: '10px', zIndex: 10, justifyContent: 'start' }}
                    initial={{ opacity: 1 }} animate={{ opacity: 1 }}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" aria-label="Copy message" className={cn(baseButtonClass)}
                          style={{ color: theme === 'dark' ? '#fff' : '#828282', background: 'transparent' }} onClick={handleCopy}>
                          {copied ? (<CheckIcon style={{ color: theme === 'dark' ? '#fff' : '#828282' }} />) : (<CopyIcon style={{ color: theme === 'dark' ? '#fff' : '#828282' }} />)}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="select-none">{copied ? "Copied!" : "Copy"}</TooltipContent>
                    </Tooltip>
                    {!voteStatus && (
                      <>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              aria-label="Upvote"
                              className={cn(baseButtonClass)}
                              style={{ color: unselectedColor, background: 'transparent' }}
                              onClick={() => handleVote('up')}
                            >
                              <ThumbsUpIcon fill={unselectedColor} />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="select-none">Upvote</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              aria-label="Downvote"
                              className={cn(baseButtonClass)}
                              style={{ color: unselectedColor, background: 'transparent' }}
                              onClick={() => handleVote('down')}
                            >
                              <ThumbsDownIcon fill={unselectedColor} />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="select-none">Downvote</TooltipContent>
                        </Tooltip>
                      </>
                    )}

                    {voteStatus === 'up' && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button type="button" aria-label="Upvoted" className={cn(baseButtonClass)} style={{ cursor: 'default' }}>
                            <ThumbsUpIcon fill={selectedFillColor} />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="select-none">Upvoted</TooltipContent>
                      </Tooltip>
                    )}

                    {voteStatus === 'down' && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button type="button" aria-label="Downvoted" className={cn(baseButtonClass)} style={{ cursor: 'default' }}>
                            <ThumbsDownIcon fill={selectedFillColor} />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="select-none">Downvoted</TooltipContent>
                      </Tooltip>
                    )}

                    {sources.length > 0 && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          {isMobileOrTablet ? (
                            // FIX: Wrap the button and Drawer in a span
                            <span className="inline-flex items-center">
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
                                        const markdownSources = extractSourcesFromText(allText);
                                        if (markdownSources.length > 0) {
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
                            </span>
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
                                      <svg width="20" height="20" viewBox="0 0 20" fill="none"><path d="M6 6l8 8M6 14L14 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                                    </button>
                                  </div>
                                  <div className="flex-1 overflow-y-auto px-6 py-4">
                                    {(() => {
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
                                            <div className="flex flex-col justify-center" style={{ marginTop: '-2px' }}>
                                              <div className="font-medium text-sm text-zinc-500 dark:text-zinc-400 line-clamp-1"
                                                style={{ marginTop: 0 }}>{src.title}</div>
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
            <div className="flex flex-col w-full space-y-2">
              {userAttachments.length > 0 && (
                <div className="flex justify-start w-full pl-9">
                  <div className="flex flex-row flex-wrap gap-3 py-2">
                    {userAttachments.map((att: any, index: number) => (
                      <CommittedPreview
                        key={att.id || `user-att-${index}`}
                        attachment={att}
                        onImageClick={setViewingImage}
                      />
                    ))}
                  </div>
                </div>
              )}
              {(message.parts ?? []).filter(part => part.type === 'text' && part.text.trim()).map((part, i) => (
                <UserTextMessagePart key={`user-message-${message.id}-part-${i}`} part={part} isLatestMessage={isLatestMessage} />
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

// --- THIS IS THE FINAL FIX ---
// Add the animatingMessageId check to the memo comparison function.
export const Message = memo(PurePreviewMessage, (prevProps, nextProps) => {
  // Always re-render the latest assistant message during a stream
  if (
    nextProps.isLatestMessage &&
    nextProps.message.role === 'assistant' &&
    nextProps.status === 'streaming'
  ) {
    return false;
  }

  // --- I ADDED THIS BLOCK ---
  // Always re-render if the animation state for this specific message changes.
  if (prevProps.animatingMessageId !== nextProps.animatingMessageId) {
    return false;
  }
  // --- END OF ADDED BLOCK ---

  // Always re-render if the stop signal has been sent
  if (prevProps.userStoppedAnimation !== nextProps.userStoppedAnimation) {
    return false;
  }
  
  // The rest of your existing, efficient comparison logic
  if (prevProps.status !== nextProps.status) return false;
  if (prevProps.isLoading !== nextProps.isLoading) return false;
  if (prevProps.isLatestMessage !== nextProps.isLatestMessage) return false;
  if (prevProps.chatId !== nextProps.chatId) return false;
  if (prevProps.message.annotations !== nextProps.message.annotations) return false;
  if (!equal(prevProps.message.parts, nextProps.message.parts)) return false;
  if (!equal(prevProps.message.experimental_attachments, nextProps.message.experimental_attachments)) return false;

  // If nothing critical has changed, skip the re-render.
  return true;
});