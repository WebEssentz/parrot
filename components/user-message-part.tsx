"use client";

import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTheme } from "next-themes";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { MessageContainer } from "./message-container";

// Helper functions required by this component
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

export const UserMessagePart = ({ part, isLatestMessage }: { part: any, isLatestMessage: boolean }) => {
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
        <div className="flex flex-row w-full items-start">
             <div className="h-12 w-48 bg-zinc-200 dark:bg-zinc-700 rounded-xl animate-pulse" />
        </div>
    );
  }
  
  return (
    <div className="group/user-message flex flex-col items-start w-full gap-1 relative justify-center pb-2">
        <motion.div
          layout
          className="group/message-bubble prose dark:prose-invert text-zinc-800 dark:text-zinc-200 max-w-none"
          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        >
          {/* Using the standard MessageContainer for the user message now */}
          <MessageContainer role="user">
            {part.text}
          </MessageContainer>
        </motion.div>
    </div>
  );
};