// app/chat/layout.tsx
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
        <Sidebar />
        
        {/* Mobile-only overlay */}
        <AnimatePresence>
          {isSidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={toggleSidebar}
              className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            />
          )}
        </AnimatePresence>

        {/* Main content area */}
        <main
          className={`h-screen flex-1 overflow-y-auto transition-[padding-left] duration-300 ease-in-out
                      ${isDesktopSidebarCollapsed ? 'lg:pl-14' : 'lg:pl-64'}`} // <-- THE FIX IS HERE
        >
          {children}
        </main>
      </div>
    </SidebarContext.Provider>
  );
}