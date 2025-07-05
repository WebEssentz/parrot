// components/sidebar.tsx
"use client";

import { useEffect, useState } from "react";
import { useSidebar } from "@/lib/sidebar-context";
import { useMediaQuery } from "@/lib/hooks/use-media-query";
import { motion, AnimatePresence } from "framer-motion";
import { useUser, UserButton } from "@clerk/nextjs";
import { ChevronLeft, MessageSquarePlus } from "lucide-react";
import clsx from "clsx";
import { useTheme } from "next-themes";
import { dark } from "@clerk/themes";
import { PanelLeft, Search } from "lucide-react"; // A great icon for this purpose
import { SidebarIconButton } from "@/components/ui/sidebar-icon-button";
import { useRouter } from "next/navigation";
import { ChatHistoryList } from "./ChatHistoryList";

const SearchInput = () => {
  const { isDesktopSidebarCollapsed } = useSidebar();

  return (
    <div className="px-2">
      <motion.button
        layout // This animates the button's width change. Perfect.
        transition={{ type: "tween", ease: "easeInOut", duration: 0.3 }}
        className={clsx(
          // Base styles for the button
          "h-10 w-full group flex items-center overflow-hidden rounded-full relative",
          "cursor-pointer border text-zinc-500",
          "bg-bg-[#fcfcfc] border-zinc-200 hover:bg-zinc-200 hover:border-zinc-300",
          "dark:bg-zinc-700/20 dark:border-zinc-700/75 dark:text-zinc-400 dark:hover:bg-[#3b3b3b] dark:hover:border-zinc-700",

          // --- Let the content inside handle padding and alignment ---
          {
            "w-full px-3": !isDesktopSidebarCollapsed,
            "w-10 justify-center": isDesktopSidebarCollapsed,
          }
        )}
      >
        {/* 
                  This wrapper div handles the alignment of the content.
                  It's a subtle but important change that helps separate the
                  concerns of the resizing container from its internal layout.
                */}
        <div className="w-full flex items-center justify-center">
          <AnimatePresence>
            {!isDesktopSidebarCollapsed && (
              <motion.span
                key="search-text"
                // --- THE CRITICAL FIX ---
                // Opt this element out of the parent's layout animation.
                // This allows our manual opacity animation to run without interference.
                layout={false}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { delay: 0.2, duration: 0.2 } }}
                exit={{ opacity: 0, transition: { duration: 0.1 } }}
                className="mr-auto text-sm whitespace-nowrap" // mr-auto pushes the icon to the right
              >
                Search...
              </motion.span>
            )}
          </AnimatePresence>
          <Search size={17} />
        </div>
      </motion.button>
    </div>
  );
};

// =================================================================
// The Custom "New Chat" Icon Component from your SVG
// =================================================================
const NewChatIcon = ({ className }: { className?: string }) => {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      // We use clsx to merge the base class with any passed-in classes
      className={clsx("stroke-[2]", className)}
    >
      <path d="M10 4V4C8.13623 4 7.20435 4 6.46927 4.30448C5.48915 4.71046 4.71046 5.48915 4.30448 6.46927C4 7.20435 4 8.13623 4 10V13.6C4 15.8402 4 16.9603 4.43597 17.816C4.81947 18.5686 5.43139 19.1805 6.18404 19.564C7.03968 20 8.15979 20 10.4 20H14C15.8638 20 16.7956 20 17.5307 19.6955C18.5108 19.2895 19.2895 18.5108 19.6955 17.5307C20 16.7956 20 15.8638 20 14V14" stroke="currentColor" strokeLinecap="square"></path>
      <path d="M12.4393 14.5607L19.5 7.5C20.3284 6.67157 20.3284 5.32843 19.5 4.5C18.6716 3.67157 17.3284 3.67157 16.5 4.5L9.43934 11.5607C9.15804 11.842 9 12.2235 9 12.6213V15H11.3787C11.7765 15 12.158 14.842 12.4393 14.5607Z" stroke="currentColor" strokeLinecap="square"></path>
    </svg>
  );
};
// =================================================================
// The Final "New Chat" Button with your custom icon
// =================================================================
const NewChatButton = () => {
  const router = useRouter();
  const { isDesktopSidebarCollapsed } = useSidebar();
  // The 'toggleSidebar' might be needed if you want to close the mobile sidebar on click
  const { toggleSidebar, isSidebarOpen } = useSidebar();


  const handleClick = () => {
    router.push('/chat');

    if (isSidebarOpen) {
      toggleSidebar();
    }
  };

  return (
    <div className="px-2">
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleClick();
        }}
        // focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 hover:text-primary hover:bg-zinc-200/70 dark:hover:bg-zinc-700/30
        className={clsx(
          "h-10 w-full group flex items-center justify-start px-3 overflow-hidden relative",
          "border border-transparent text-zinc-500 dark:text-zinc-300 cursor-pointer",
          "rounded-lg hover:text-primary hover:bg-zinc-200/70 dark:hover:bg-zinc-700/30",
          // --- Conditional Styles ---
          {
            "justify-start px-3 -ml-[0.2rem]": !isDesktopSidebarCollapsed,

            // --- THIS IS THE FIX ---
            // When collapsed, center the content and add a small left margin.
            "justify-center pl-[0.57rem]": isDesktopSidebarCollapsed,
          }

        )}
      >

        {/* --- HERE IS THE CHANGE: Using your custom icon --- */}
        <NewChatIcon className="flex-shrink-0" />

        <AnimatePresence>
          {!isDesktopSidebarCollapsed && (
            <motion.span
              key="new-chat-text"
              initial={{ opacity: 0 }}
              layout={false}
              animate={{ opacity: 1, transition: { delay: 0.1, duration: 0.2 } }}
              exit={{ opacity: 0, transition: { duration: 0.1 } }}
              className="text-sm whitespace-nowrap ml-2 -mt-[0.2rem]"
            >
              New chat
            </motion.span>
          )}
        </AnimatePresence>
      </button>
    </div>
  )
}

// --- Main Sidebar Component ---
export const Sidebar = () => {
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => { setHasMounted(true); }, []);

  const { isDesktopSidebarCollapsed, toggleDesktopSidebar } = useSidebar();
  const { user } = useUser();
  const { resolvedTheme } = useTheme();
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  const handleAsideClick = () => { if (isDesktop) toggleDesktopSidebar(); };

  // Appearance props for the Clerk UserButton, defined once for reuse.
  const userButtonAppearance = {
    baseTheme: resolvedTheme === 'dark' ? dark : undefined,
    elements: {
      userButtonAvatarBox: "h-8 w-8",
      userButtonPopoverCard: {
        backgroundColor: resolvedTheme === 'dark' ? '#272727' : '#ffffff',
        border: '1px solid',
        borderColor: resolvedTheme === 'dark' ? '#3f3f46' : '#e5e5e5',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
      },
      userButtonPopoverFooter: { display: "none" },
    },
  };
  const userProfileAppearance = {
    baseTheme: resolvedTheme === 'dark' ? dark : undefined,
    elements: {
      card: {
        backgroundColor: resolvedTheme === 'dark' ? '#272727' : '#FFFFFF',
        border: '1px solid',
        borderColor: resolvedTheme === 'dark' ? '#3f3f46' : '#e5e5e5',
        boxShadow: 'none',
        width: '100%',
        maxWidth: '56rem',
      },
      headerTitle: { color: resolvedTheme === 'dark' ? '#FFFFFF' : '#000000' },
      navbar: { backgroundColor: resolvedTheme === 'dark' ? '#272727' : '#F9FAFB' },
      navbarButton__active: { backgroundColor: resolvedTheme === 'dark' ? '#212121' : '#F3F4F6' },
      rootBox: { color: resolvedTheme === 'dark' ? '#D1D5DB' : '#374151' },
      formFieldInput: { backgroundColor: resolvedTheme === 'dark' ? '#212121' : '#FFFFFF' },
      profilePage__footer: { display: 'none' },
    },
  };

  if (!hasMounted) return null;

  return (
    <motion.aside
      layout
      initial={false}
      animate={isDesktopSidebarCollapsed ? "collapsed" : "open"}
      variants={{
        open: { width: "16rem" },
        collapsed: { width: "3.5rem" },
      }}
      transition={{ type: "tween", ease: "easeInOut", duration: 0.3 }}
      // --- THIS IS THE RESTORED STYLING ---
      className={clsx(
        "flex h-full flex-col border-r overflow-x-hidden",
        "border-zinc-200 dark:border-zinc-800",
        // These classes are now conditional based on screen size
        {
          "fixed top-0 left-0 z-50": isDesktop, // z-50 to match mobile panel
          "cursor-ew-resize": isDesktop,
          "bg-[#F7F7F8] dark:bg-[#1C1C1C] shadow border-r dark:border-r-[#333333]": isDesktopSidebarCollapsed,
          "bg-[#f9f9f9] dark:bg-[#1E1E1E] dark:border-r-[#333333]": !isDesktopSidebarCollapsed,
          "w-64": !isDesktop, // Give it a static width on mobile
        }
      )}
    >
      <div
        className="flex flex-col h-full w-full"
        onClick={handleAsideClick}
      >
        {/* === 1. TOP SECTION (Header, Search, New Chat) === */}
        <div className="flex-shrink-0">
          {/* Header */}
          <div className="flex-shrink-0 p-2 min-h-[56px] w-full flex items-center relative">
            <AnimatePresence>
              {!isDesktopSidebarCollapsed && (
                <motion.div
                  key="avurna-title"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20, transition: { duration: 0.1 } }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  // --- THIS IS THE FIX ---
                  // Applying the exact styles from the other header
                  className="absolute left-4 select-none font-medium text-zinc-900 dark:text-white"
                  style={{
                    fontSize: '20px', // Corresponds to text-[20px]
                    lineHeight: '22px',
                    fontFamily: 'Google Sans, "Helvetica Neue", sans-serif',
                    letterSpacing: 'normal',
                  }}
                >
                  Avurna
                </motion.div>
              )}
            </AnimatePresence>
            <motion.div
              layout
              transition={{ type: "tween", ease: "easeInOut", duration: 0.3 }}
              className={clsx(!isDesktopSidebarCollapsed && "absolute right-2 top-2")}
            >
              <SidebarIconButton
                icon={PanelLeft}
                onClick={(e) => { e.stopPropagation(); toggleDesktopSidebar(); }}
                className="pl-[0.68rem]"
              />
            </motion.div>
          </div>

          <div className="h-[0.60rem]" />
          <SearchInput />
          <div className="h-1.5" />
          <NewChatButton />
        </div>

        {/* === 2. MIDDLE SECTION (Scrollable Chat History) === */}
        {/* `flex-grow` makes this section take all available vertical space. */}
        {/* `mt-4` adds the requested spacing below the "New Chat" button. */}
        <div className="flex-grow overflow-y-auto mt-4">
          {/* 
            ======================================================================
            === THIS IS THE FIX ===
            We wrap the ChatHistoryList in AnimatePresence and a motion.div
            to control its visibility and animation.
            ======================================================================
          */}
          <AnimatePresence>
            {!isDesktopSidebarCollapsed && (
              <motion.div
                key="chat-history-list" // A unique key for AnimatePresence to track
                // CRITICAL: This prevents the parent's `layout` animation from
                // interfering with our opacity animation, ensuring no glitches.
                layout={false}
                initial={{ opacity: 0 }}
                // The `delay` ensures the sidebar has finished expanding before the list fades in.
                animate={{ opacity: 1, transition: { delay: 0.25, duration: 0.2 } }}
                // The `exit` animation is quick, making the list disappear instantly.
                exit={{ opacity: 0, transition: { duration: 0.1 } }}
              >
                <ChatHistoryList />
              </motion.div>
            )}
          </AnimatePresence>
        </div>


        {/* === BOTTOM FOOTER SECTION === */}
        <div className="flex-shrink-0 w-full p-1 px-1">
          <AnimatePresence initial={false} mode="wait">
            {isDesktopSidebarCollapsed ? (
              // --- COLLAPSED STATE LAYOUT (Vertical Stack) ---
              <motion.div
                key="collapsed"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col items-start space-y-2 mb-2"
              >
                <div className="w-full h-10 flex items-center justify-center">
                  <motion.div
                    animate={{ rotate: 180 }}
                    transition={{ duration: 0.3 }}
                    className="p-1 rounded-md text-zinc-500"
                  >
                    <ChevronLeft size={19} />
                  </motion.div>
                </div>
                <div onClick={(e) => e.stopPropagation()} className="w-full flex justify-center">
                  <UserButton
                    afterSignOutUrl="/"
                    appearance={userButtonAppearance}
                    userProfileProps={{ appearance: userProfileAppearance }}
                  />
                </div>
              </motion.div>
            ) : (
              // --- OPEN STATE LAYOUT (Horizontal) ---
              // OPEN STATE LAYOUT
              <motion.div key="open" /* ... */ >
                {/* --- FIX 3: Shift UserButton and Chevron apart --- */}
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="w-full flex items-center justify-between p-2 rounded-lg cursor-pointer hover:bg-zinc-200/70 dark:hover:bg-zinc-700/30"
                >
                  {/* This container keeps the avatar and name together */}
                  <div className="flex items-center flex-grow min-w-0">
                    <UserButton
                      afterSignOutUrl="/"
                      appearance={userButtonAppearance}
                      userProfileProps={{ appearance: userProfileAppearance }}
                    />
                    <span className="truncate text-sm font-medium text-zinc-700 dark:text-zinc-300 ml-3">
                      {user?.firstName || user?.username || 'User'} {user?.lastName || ''}
                    </span>
                  </div>
                  {/* The chevron is now separate, pushed to the right by justify-between */}
                  <div className="p-1 text-zinc-500 flex-shrink-0">
                    <ChevronLeft size={19} />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.aside>
  );
};