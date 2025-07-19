// FILE: component/sidebar.tsx

"use client"

import { useEffect, useState, useRef } from "react"
import type React from "react"
import { useSidebar } from "@/lib/sidebar-context"
import { useMediaQuery } from "@/lib/hooks/use-media-query"
import { motion, AnimatePresence } from "framer-motion"
import { useUser } from "@clerk/nextjs"
import { Search, ChevronLeft, ChevronsRight, ChevronsLeft } from "lucide-react"
import clsx from "clsx"
import { SidebarIconButton } from "@/components/ui/sidebar-icon-button"
import { useRouter, usePathname } from "next/navigation"
import { ChatHistoryList } from "./ChatHistoryList"
import { CustomUserMenu, UserAvatar } from "@/components/ui/CustomUserMenu"

// --- Child components are unchanged ---
const SearchInput = () => {
  const { isDesktopSidebarCollapsed } = useSidebar()
  return (
    <div className="px-2">
      <motion.button
        layout
        transition={{ type: "tween", ease: "easeInOut", duration: 0.3 }}
        className={clsx("h-10 w-full group flex items-center overflow-hidden rounded-full relative", "cursor-pointer border text-zinc-500", "bg-bg-[#fcfcfc] border-zinc-200 hover:bg-zinc-200 hover:border-zinc-300", "dark:bg-zinc-700/20 dark:border-zinc-700/75 dark:text-zinc-400 dark:hover:bg-[#3b3b3b] dark:hover:border-zinc-700", { "w-full px-3": !isDesktopSidebarCollapsed, "w-10 justify-center": isDesktopSidebarCollapsed, })}>
        <div className="w-full flex items-center justify-center">
          <AnimatePresence>
            {!isDesktopSidebarCollapsed && (<motion.span key="search-text" layout={false} initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.2, duration: 0.2 } }} exit={{ opacity: 0, transition: { duration: 0.1 } }} className="mr-auto text-sm whitespace-nowrap">Search...</motion.span>)}
          </AnimatePresence>
          <Search size={17} />
        </div>
      </motion.button>
    </div>
  )
}
const NewChatIcon = ({ className }: { className?: string }) => {
  return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={clsx("stroke-[2]", className)}><path d="M10 4V4C8.13623 4 7.20435 4 6.46927 4.30448C5.48915 4.71046 4.71046 5.48915 4.30448 6.46927C4 7.20435 4 8.13623 4 10V13.6C4 15.8402 4 16.9603 4.43597 17.816C4.81947 18.5686 5.43139 19.1805 6.18404 19.564C7.03968 20 8.15979 20 10.4 20H14C15.8638 20 16.7956 20 17.5307 19.6955C18.5108 19.2895 19.2895 18.5108 19.6955 17.5307C20 16.7956 20 15.8638 20 14V14" stroke="currentColor" strokeLinecap="square"></path><path d="M12.4393 14.5607L19.5 7.5C20.3284 6.67157 20.3284 5.32843 19.5 4.5C18.6716 3.67157 17.3284 3.67157 16.5 4.5L9.43934 11.5607C9.15804 11.842 9 12.2235 9 12.6213V15H11.3787C11.7765 15 12.158 14.842 12.4393 14.5607Z" stroke="currentColor" strokeLinecap="square"></path></svg>)
}
const NewChatButton = () => {
  const { isDesktopSidebarCollapsed, toggleSidebar, isSidebarOpen } = useSidebar()
  const router = useRouter()
  const pathname = usePathname()
  const handleNewChat = (e: React.MouseEvent) => {
    // This stopPropagation is important to prevent the sidebar from toggling
    e.preventDefault(); e.stopPropagation(); 
    if (isSidebarOpen) { toggleSidebar() }; 
    if (pathname === "/chat") { window.location.href = "/chat" } else { router.push("/chat"); router.refresh() }
  }
  return (
    <div className="px-2">
      <button onClick={handleNewChat} className={clsx("h-10 w-full group flex items-center justify-start px-3 overflow-hidden relative", "border border-transparent text-zinc-500 dark:text-zinc-300 cursor-pointer", "rounded-lg hover:text-primary hover:bg-zinc-200/70 dark:hover:bg-zinc-700/30", "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", { "justify-start px-3 -ml-[0.2rem]": !isDesktopSidebarCollapsed, "justify-center pl-[0.57rem]": isDesktopSidebarCollapsed, })}>
        <NewChatIcon className="flex-shrink-0" />
        <AnimatePresence>
          {!isDesktopSidebarCollapsed && (<motion.span key="new-chat-text" initial={{ opacity: 0 }} layout={false} animate={{ opacity: 1, transition: { delay: 0.1, duration: 0.2 } }} exit={{ opacity: 0, transition: { duration: 0.1 } }} className="text-sm whitespace-nowrap ml-2 -mt-[0.2rem]">New chat</motion.span>)}
        </AnimatePresence>
      </button>
    </div>
  )
}

// --- Main Sidebar Component ---
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
  
  if (!hasMounted) return null

  return (
    <motion.aside
      onClick={handleSidebarClick}
      layout
      initial={false}
      // FIX 2: Only animate based on the collapse state if on desktop
      animate={isDesktop && isDesktopSidebarCollapsed ? "collapsed" : "open"}
      // FIX 1: Only provide collapse/open width variants on desktop
      variants={isDesktop ? { open: { width: "16rem" }, collapsed: { width: "3.2rem" } } : {}}
      transition={{ type: "tween", ease: "easeInOut", duration: 0.3 }}
      className={clsx(
        "flex h-full flex-col border-r overflow-x-hidden", 
        "border-zinc-200 dark:border-zinc-800", 
        { 
          "fixed top-0 left-0 z-50": isDesktop, 
          "cursor-ew-resize": isDesktop && isDesktopSidebarCollapsed,
          "bg-[#FFFFFF] dark:bg-[#1C1C1C] shadow-md border-r dark:border-r-[#333333]": isDesktop && isDesktopSidebarCollapsed, 
          "bg-[#f9f9f9] dark:bg-[#1E1E1E] dark:border-r-[#333333]": !isDesktop || !isDesktopSidebarCollapsed, 
          "w-64": !isDesktop, 
      })}>
      <div className="flex flex-col h-full w-full">
        <div onClick={(e) => e.stopPropagation()}>
          <div className="flex-shrink-0 p-2 min-h-[56px] w-full flex items-center relative">
            <AnimatePresence>
              {!isDesktopSidebarCollapsed && (<motion.div key="avurna-title" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20, transition: { duration: 0.1 } }} transition={{ duration: 0.3, ease: "easeOut" }} className="absolute left-4 select-none font-medium text-zinc-900 dark:text-white" style={{ fontSize: "20px", lineHeight: "22px", fontFamily: 'Google Sans, "Helvetica Neue", sans-serif', letterSpacing: "normal", }}>Avurna</motion.div>)}
            </AnimatePresence>
            <motion.div layout transition={{ type: "tween", ease: "easeInOut", duration: 0.3 }} className={clsx(!isDesktopSidebarCollapsed && "absolute right-2 top-2")}>
              {/* FIX 3: The collapse/expand button is now a desktop-only feature */}
              {isDesktop && (
                <SidebarIconButton 
                  icon={isDesktopSidebarCollapsed ? ChevronsRight : ChevronsLeft} 
                  onClick={handleToggleIconClick}
                  className={clsx("cursor-pointer", { "pl-[0.68rem]": isDesktopSidebarCollapsed, "pl-[0.5rem]": !isDesktopSidebarCollapsed, })}
                />
              )}
            </motion.div>
          </div>
          <div className="h-[0.60rem]" />
          <SearchInput />
          <div className="h-1.5" />
          <NewChatButton />
        </div>
        
        <div className="flex-grow overflow-y-auto mt-4">
          <AnimatePresence>
            {!isDesktopSidebarCollapsed && (<motion.div key="chat-history-list" layout={false} initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.25, duration: 0.2 } }} exit={{ opacity: 0, transition: { duration: 0.1 } }}><ChatHistoryList /></motion.div>)}
          </AnimatePresence>
        </div>
        
        <div className="flex-shrink-0 w-full p-1 px-1" onClick={(e) => e.stopPropagation()}>
            <CustomUserMenu>
                <button className={clsx("user-profile-button w-full flex items-center p-2 rounded-lg", "cursor-pointer")}>
                    <span className="hover-circle"></span>
                    <div className="flex items-center flex-grow min-w-0">
                      <UserAvatar />
                      <AnimatePresence>
                        {!isDesktopSidebarCollapsed && (
                            <motion.div key="user-info" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0, transition: { delay: 0.2, duration: 0.2 } }} exit={{ opacity: 0, x: -10, transition: { duration: 0.1 } }} className="truncate ml-3">
                                <span className="truncate text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                    {user?.firstName || user?.username || "User"} {user?.lastName || ""}
                                </span>
                            </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                     <AnimatePresence>
                        {!isDesktopSidebarCollapsed && (
                            <motion.div key="user-menu-chevron" initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.2, duration: 0.2 } }} exit={{ opacity: 0, transition: { duration: 0.1 } }} className="p-1 text-zinc-500 flex-shrink-0">
                               <ChevronLeft size={19} />
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