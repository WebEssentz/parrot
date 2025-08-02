"use client"

import { useEffect, useState, useRef } from "react"
import type React from "react"
import { useSidebar } from "@/lib/sidebar-context"
import { useMediaQuery } from "@/lib/hooks/use-media-query"
import { motion, AnimatePresence } from "framer-motion"
import { useUser } from "@clerk/nextjs"
import { Search, ChevronLeft, Plus } from "lucide-react"
import { ButtonIcon, CustomChevronsLeft } from "@/components/icons"
import clsx from "clsx"
import { SidebarIconButton } from "@/components/ui/sidebar-icon-button"
import { useRouter, usePathname } from "next/navigation"
import { ChatHistoryList } from "./ChatHistoryList"
import { CustomUserMenu, UserAvatar } from "@/components/ui/CustomUserMenu"

// --- THE DEFINITIVE, SearchInput COMPONENT ---
const SearchInput = ({ shouldShowContent }: { shouldShowContent: boolean }) => {
  return (
    // REMOVED the redundant px-2 wrapper div that caused misalignment
    <motion.button
      layout="position"
      transition={{ type: "tween", ease: "easeInOut", duration: 0.3 }}
      className={clsx(
        "h-10 w-full group cursor-pointer flex items-center overflow-hidden relative transition-colors",
        "rounded-lg text-black dark:text-white hover:bg-zinc-200/60 dark:hover:bg-zinc-800/80",
        { "w-full justify-start px-3": shouldShowContent, "w-10 justify-center": !shouldShowContent }
      )}
    >
      <Search size={18} className="flex-shrink-0 text-zinc-800 dark:text-white" />
      <AnimatePresence>
        {shouldShowContent && (
          <motion.span
            key="search-text"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { delay: 0.15, duration: 0.2 } }}
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
            // --- FIX: Reduced spacing ---
            className="ml-[0.43rem] text-sm font-normal text-zinc-800 dark:text-zinc-200 hover:cursor-pointer"
          >
            Search chats
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  )
}

// --- THE DEFINITIVE, CHATGPT-STYLE NewChatButton COMPONENT ---
const NewChatButton = ({ shouldShowContent }: { shouldShowContent: boolean }) => {
  const { isDesktopSidebarCollapsed, toggleSidebar, isSidebarOpen } = useSidebar()
  const router = useRouter()
  const pathname = usePathname()

  const handleNewChat = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (!isDesktopSidebarCollapsed && isSidebarOpen) { toggleSidebar() };
    if (pathname === "/chat") { window.location.href = "/chat" }
    else { router.push("/chat"); router.refresh() }
  }

  return (
    // REMOVED the redundant px-2 wrapper div that caused misalignment
    <motion.button
      layout="position"
      transition={{ type: "tween", ease: "easeInOut", duration: 0.3 }}
      onClick={handleNewChat}
      className={clsx(
        "h-10 w-full group flex cursor-pointer items-center overflow-hidden relative transition-colors",
        "rounded-lg text-black dark:text-white hover:bg-zinc-200/60 dark:hover:bg-zinc-800/80",
        { "justify-start px-3": shouldShowContent },
        { "justify-center w-10": !shouldShowContent }
      )}
    >
      <ButtonIcon className="flex-shrink-0" />
      <AnimatePresence>
        {shouldShowContent && (
          <motion.span
            key="new-chat-text"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { delay: 0.15, duration: 0.2 } }}
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
            // --- FIX: Reduced spacing ---
            className="ml-[0.43rem] text-sm font-normal text-zinc-800 dark:text-zinc-200 hover:cursor-pointer"
          >
            New chat
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  )
}


export const Sidebar = () => {
  const [hasMounted, setHasMounted] = useState(false)
  const initialLoadHandled = useRef(false);

  useEffect(() => { setHasMounted(true) }, [])

  const { isDesktopSidebarCollapsed, toggleDesktopSidebar, isSidebarOpen, toggleSidebar } = useSidebar()
  const { user } = useUser()
  const isDesktop = useMediaQuery("(min-width: 1024px)")

  useEffect(() => {
    if (hasMounted && !initialLoadHandled.current) {
      if (!isDesktop && !isSidebarOpen) {
        toggleSidebar();
      }
      initialLoadHandled.current = true;
    }
  }, [hasMounted, isDesktop, isSidebarOpen, toggleSidebar]);

  const handleSidebarClick = () => {
    if (isDesktop && isDesktopSidebarCollapsed) {
      toggleDesktopSidebar();
    }
  }

  const handleToggleIconClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleDesktopSidebar();
  }

  const shouldShowContent = isDesktop ? !isDesktopSidebarCollapsed : isSidebarOpen;

  if (!hasMounted) return null

  return (
    <motion.aside
      onClick={handleSidebarClick}
      layout
      initial={false}
      animate={isDesktop && isDesktopSidebarCollapsed ? "collapsed" : "open"}
      variants={isDesktop ? { open: { width: "16rem" }, collapsed: { width: "3.5rem" } } : {}}
      transition={{ type: "tween", ease: "easeInOut", duration: 0.3 }}
      className={clsx(
        "flex h-full flex-col border-r overflow-x-hidden",
        isDesktop && !isDesktopSidebarCollapsed ? "bg-[#f9fafb] dark:bg-[#161717] dark:borber dark:border-zinc-700/40" : "bg-white border-zinc-100",
        "dark:bg-[#1C1C1C] dark:border-zinc-800",
        {
          "fixed top-0 left-0 z-50": isDesktop,
          "cursor-ew-resize": isDesktop && isDesktopSidebarCollapsed,
          "w-64": !isDesktop && isSidebarOpen,
          "w-0": !isDesktop && !isSidebarOpen,
        })}
    >
      <div className="flex flex-col h-full w-full">
        {/* --- Header & Actions Section with corrected padding and layout --- */}
        <div onClick={(e) => e.stopPropagation()} className="p-2 space-y-2">
          <div className="flex h-10 w-full items-center">
            <AnimatePresence>
              {shouldShowContent && (
                <motion.div
                  key="avurna-title"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0, transition: { delay: 0.1 } }}
                  exit={{ opacity: 0, x: -10, transition: { duration: 0.1 } }}
                  className="font-heading select-none text-xl font-medium px-2"
                >
                  <span className="bg-gradient-to-r from-[#F59E0B] to-[#EF4444] bg-clip-text text-transparent">
                    Avurna
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
            <motion.div layout transition={{ type: "tween", ease: "easeInOut", duration: 0.3 }} className="ml-auto">
              {isDesktop && (
                <SidebarIconButton
                  icon={CustomChevronsLeft}
                  onClick={handleToggleIconClick}
                  className={clsx(
                    "cursor-ew-resize transition-transform",
                    isDesktopSidebarCollapsed ? "text-zinc-900 dark:text-white" : "text-zinc-500 dark:text-zinc-400",
                    !isDesktopSidebarCollapsed && "rotate-180"
                  )}
                />
              )}
            </motion.div>
          </div>
          <div className={clsx(
            shouldShowContent ? "space-y-0.5" : "gap-y-0.5 flex flex-col items-center"
          )}> {/* Reduced spacing between buttons when collapsed */}
            <NewChatButton shouldShowContent={shouldShowContent} />
            <SearchInput shouldShowContent={shouldShowContent} />
          </div>
        </div>

        {/* --- Chat History Section --- */}
        <div className="flex-grow overflow-y-auto mt-4 px-2">
          <AnimatePresence>
            {shouldShowContent && (
              <motion.div
                key="chat-history-list"
                layout={false}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { delay: 0.2, duration: 0.2 } }}
                exit={{ opacity: 0, transition: { duration: 0.1 } }}
              >
                {/* --- FIX: REMOVED the "Chats" text header --- */}
                <ChatHistoryList />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* --- User Menu Section --- */}
        <div className="flex-shrink-0 w-full p-2 mt-0" onClick={(e) => e.stopPropagation()}>
          <CustomUserMenu>
            <button className={clsx("user-profile-button w-full flex items-center p-2 rounded-lg transition-colors", "hover:bg-zinc-200/60 dark:hover:bg-zinc-800/80", "cursor-pointer")}>
              <div className="flex items-center flex-grow min-w-0 mt-0">
                <UserAvatar />
                <AnimatePresence>
                  {shouldShowContent && (
                    <motion.div key="user-info" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0, transition: { delay: 0.2, duration: 0.2 } }} exit={{ opacity: 0, x: -10, transition: { duration: 0.1 } }} className="truncate ml-3">
                      <span className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-200" style={{ position: 'relative', top: '-4px' }}>
                        {user?.firstName || user?.username || "User"}
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <AnimatePresence>
                {shouldShowContent && (
                  <motion.div key="user-menu-chevron" initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.2, duration: 0.2 } }} exit={{ opacity: 0, transition: { duration: 0.1 } }} className="flex-shrink-0">
                    <ChevronLeft size={19} className="text-zinc-500 dark:text-zinc-400" />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          </CustomUserMenu>
        </div>
      </div>
    </motion.aside>
  )
}