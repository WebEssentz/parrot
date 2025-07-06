"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { ThemeToggle } from "./theme-toggle";
import { useSidebar } from "@/lib/sidebar-context";
import { Menu } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export const UserChatHeader = () => {
  const { resolvedTheme } = useTheme();
  const { toggleSidebar, isDesktopSidebarCollapsed } = useSidebar();
  
  const [isDesktop, setIsDesktop] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 1024px)');
    const handleResize = () => setIsDesktop(mediaQuery.matches);
    
    handleResize();
    mediaQuery.addEventListener('change', handleResize);
    
    return () => mediaQuery.removeEventListener('change', handleResize);
  }, []);
  
  const [showBorder, setShowBorder] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setShowBorder(window.scrollY > 2);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (isDesktop === undefined) {
    return null;
  }

  return (
    <motion.div
      initial={false}
      animate={{
        left: isDesktop ? (isDesktopSidebarCollapsed ? '3.5rem' : '16rem') : '0rem'
      }}
      transition={{ type: "tween", ease: "easeInOut", duration: 0.3 }}
      className={
        // --- THE FIX IS HERE ---
        // Lowered z-index from 40 to 30 to sit below the mobile sidebar.
        `fixed right-0 top-0 bg-background/80 backdrop-blur-sm z-30` + 
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
          
          <AnimatePresence>
            {isDesktop && isDesktopSidebarCollapsed && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0, transition: { delay: 0.2 } }}
                exit={{ opacity: 0, x: -10, transition: { duration: 0.2 } }}
                className={
                  `text-[20px] font-leading select-none mt-1 font-medium text-zinc-900 dark:text-white`
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