// FILE: components/user-chat-header.tsx

"use client";

import { useEffect, useState } from "react";
import { ThemeToggle } from "../theme-toggle";
import { useSidebar } from "@/lib/sidebar-context";
import { Menu } from "lucide-react";
import { motion } from "framer-motion";

export const UserChatHeader = ({ children }: { children: React.ReactNode }) => {
  const { isDesktopSidebarCollapsed, toggleSidebar } = useSidebar();
  const [isDesktop, setIsDesktop] = useState<boolean | undefined>(undefined);
  const [showBorder, setShowBorder] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 1024px)');
    const handleResize = () => setIsDesktop(mediaQuery.matches);
    handleResize();
    mediaQuery.addEventListener('change', handleResize);
    return () => mediaQuery.removeEventListener('change', handleResize);
  }, []);
  
  useEffect(() => {
    const onScroll = () => {
      setShowBorder(window.scrollY > 2);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (isDesktop === undefined) return null;

  return (
    <motion.div
      initial={false}
      animate={{
        left: isDesktop ? (isDesktopSidebarCollapsed ? '3.5rem' : '16rem') : '0rem'
      }}
      transition={{ type: "tween", ease: "easeInOut", duration: 0.3 }}
      className={
        `fixed right-0 top-0 bg-background/80 backdrop-blur-sm z-30` + 
        (showBorder ? " border-b border-border" : " border-b-transparent")
      }
      style={{ boxShadow: showBorder ? '0 2px 8px 0 rgba(0,0,0,0.03)' : 'none' }}
    >
      {/* --- THIS IS THE FIX --- */}
      {/* The layout is simplified to three main sections for correct positioning. */}
      <div className="flex h-14 items-center px-4">
        {/* Section 1: Hamburger Menu (for mobile) */}
        <button onClick={toggleSidebar} className="mr-2 block lg:hidden">
            <Menu className="h-6 w-6 text-zinc-900 dark:text-zinc-100" />
            <span className="sr-only">Toggle Sidebar</span>
        </button>
        
        {/* Section 2: Dynamic Content (takes up all available space) */}
        <div className="flex-1 min-w-0"> {/* `min-w-0` is crucial for truncation to work in flex children */}
          {children}
        </div>
        
        {/* Section 3: Theme Toggle */}
        <div className="flex items-center pl-2">
          <ThemeToggle />
        </div>
      </div>
    </motion.div>
  );
};