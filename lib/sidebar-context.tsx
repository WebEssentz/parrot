// FILE: lib/sidebar-context.tsx

"use client";

import { createContext, useContext } from 'react';

type SidebarContextType = {
  isSidebarOpen: boolean; // For mobile
  toggleSidebar: () => void; // For mobile
  isDesktopSidebarCollapsed: boolean; // For desktop
  toggleDesktopSidebar: () => void; // For desktop
};

export const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
}