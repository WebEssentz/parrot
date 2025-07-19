// FILE: components/user-chat-header.tsx

"use client";

import { useEffect, useState } from "react";
import { ThemeToggle } from "../theme-toggle";
import { useSidebar } from "@/lib/sidebar-context";
import { motion } from "framer-motion";

// The SVG is now its own component to make it reusable and cleaner.
const CustomMenuIcon = ({ className }: { className?: string }) => (
  <svg 
    width="20" 
    height="20" 
    viewBox="0 0 20 20" 
    fill="currentColor" 
    xmlns="http://www.w3.org/2000/svg" 
    className={className}
  >
    <path d="M11.6663 12.6686L11.801 12.6823C12.1038 12.7445 12.3313 13.0125 12.3313 13.3337C12.3311 13.6547 12.1038 13.9229 11.801 13.985L11.6663 13.9987H3.33325C2.96609 13.9987 2.66839 13.7008 2.66821 13.3337C2.66821 12.9664 2.96598 12.6686 3.33325 12.6686H11.6663ZM16.6663 6.00163L16.801 6.0153C17.1038 6.07747 17.3313 6.34546 17.3313 6.66667C17.3313 6.98788 17.1038 7.25586 16.801 7.31803L16.6663 7.33171H3.33325C2.96598 7.33171 2.66821 7.03394 2.66821 6.66667C2.66821 6.2994 2.96598 6.00163 3.33325 6.00163H16.6663Z"></path>
  </svg>
);

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
      <div className="flex h-14 items-center px-4">
        <button onClick={toggleSidebar} className="mr-2 block lg:hidden">
            {/* The original Menu icon is now replaced with your SVG component. */}
            <CustomMenuIcon className="h-5 w-5 text-zinc-900 dark:text-zinc-100" />
            <span className="sr-only">Toggle Sidebar</span>
        </button>
        
        <div className="flex-1 min-w-0">
          {children}
        </div>
        
        <div className="flex items-center pl-2">
          <ThemeToggle />
        </div>
      </div>
    </motion.div>
  );
};