"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/sidebar";
import { SidebarContext } from "@/lib/sidebar-context";
import { AnimatePresence, motion } from "framer-motion";

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isDesktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(true);
  const [isInitialStateLoaded, setIsInitialStateLoaded] = useState(false);

  useEffect(() => {
    const savedState = localStorage.getItem("sidebarCollapsed");
    setDesktopSidebarCollapsed(savedState ? JSON.parse(savedState) : true);
    setIsInitialStateLoaded(true);
  }, []);

  const toggleSidebar = () => setSidebarOpen(!isSidebarOpen);

  const toggleDesktopSidebar = () => {
    setDesktopSidebarCollapsed(prevState => {
      const newState = !prevState;
      localStorage.setItem("sidebarCollapsed", JSON.stringify(newState));
      return newState;
    });
  };

  if (!isInitialStateLoaded) {
    return null;
  }

  return (
    <SidebarContext.Provider
      value={{
        isSidebarOpen,
        toggleSidebar,
        isDesktopSidebarCollapsed,
        toggleDesktopSidebar,
      }}
    >
      <div className="flex h-screen w-full">
        {/* Desktop sidebar (static, in flex-flow) */}
        <div className="hidden lg:block">
          <Sidebar />
        </div>

        {/* Mobile sidebar (animated overlay) */}
        <AnimatePresence>
          {isSidebarOpen && (
            <>
              {/* --- THE FIX IS HERE (Backdrop) --- */}
              {/* Increased z-index from 30 to 40 to cover the header. */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={toggleSidebar}
                className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                aria-hidden="true"
              />
              {/* --- THE FIX IS HERE (Sidebar Panel) --- */}
              {/* Increased z-index from 40 to 50 to be on top of everything. */}
              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: "0%" }}
                exit={{ x: "-100%" }}
                transition={{ type: "tween", ease: "easeInOut", duration: 0.3 }}
                className="fixed top-0 left-0 h-full z-50 lg:hidden"
              >
                <Sidebar />
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Main content area */}
        <main
          className={`h-full flex-1 transition-[padding-left] duration-300 ease-in-out
              ${isDesktopSidebarCollapsed ? 'lg:pl-14' : 'lg:pl-64'}`}
        >
          {children}
        </main>
      </div>
    </SidebarContext.Provider>
  );
}