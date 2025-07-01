// components/user-chat-header.tsx
"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { ThemeToggle } from "./theme-toggle";
import { useSidebar } from "@/lib/sidebar-context";
import { useMediaQuery } from "@/lib/hooks/use-media-query";
import { Menu } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion"; // <-- Import AnimatePresence

export const UserChatHeader = () => {
  const { resolvedTheme } = useTheme();
  const { toggleSidebar, isDesktopSidebarCollapsed } = useSidebar();
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  
  const [showBorder, setShowBorder] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setShowBorder(window.scrollY > 2);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
  setIsLoaded(true);
  }, []);

  if (!isLoaded) return null;

  return (
    <motion.div
      initial={false}
      animate={{
        // --- THE FIX IS HERE ---
        left: isDesktop ? (isDesktopSidebarCollapsed ? '3.5rem' : '16rem') : '0rem'
      }}
      transition={{ type: "tween", ease: "easeInOut", duration: 0.3 }}
      className={
        `fixed right-0 top-0 bg-background/80 backdrop-blur-sm z-40` + 
        (showBorder ? " border-b border-border" : " border-b-transparent")
      }
      style={{ boxShadow: showBorder ? '0 2px 8px 0 rgba(0,0,0,0.03)' : 'none' }}
    >
      <div className="flex justify-between items-center p-4 py-2">
        <div className="flex flex-row items-center gap-2 shrink-0 ">
          <button onClick={toggleSidebar} className="mr-2 block lg:hidden">
              <Menu className="h-6 w-6 text-zinc-900 dark:text-zinc-100" />
              <span className="sr-only">Toggle Sidebar</span>
          </button>
          
          {/* --- THIS IS THE FIX --- */}
          {/* The "Avurna" text is now animated and conditional */}
          <AnimatePresence>
            {isDesktopSidebarCollapsed && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0, transition: { delay: 0.2 } }}
                exit={{ opacity: 0, x: -10, transition: { duration: 0.2 } }}
                className={
                  `text-[20px] font-leading select-none mt-2 font-medium text-zinc-900 dark:text-white`
                }
                style={{
                  lineHeight: '22px',
                  fontFamily: 'Google Sans, "Helvetica Neue", sans-serif',
                  letterSpacing: 'normal',
                }}
              >
                Avurna
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        <div className="flex items-center gap-2 pr-0" style={{ marginTop: '-2px' }}>
          <ThemeToggle />
        </div>
      </div>
    </motion.div>
  );
};