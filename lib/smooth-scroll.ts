// FILE: lib/smooth-scroll.ts

"use client"

import type { Transition } from "framer-motion"

export const smoothScrollConfig: Transition = {
  type: "spring",
  damping: 25,
  stiffness: 120,
  mass: 0.8,
}

export const initSmoothScrolling = () => {
  // Add smooth scrolling CSS
  const style = document.createElement("style")
  style.textContent = `
    html {
      scroll-behavior: smooth;
    }
    
    * {
      scroll-behavior: smooth;
    }
    
    .smooth-scroll {
      scroll-behavior: smooth;
      -webkit-overflow-scrolling: touch;
    }
    
    .editor-content {
      scroll-behavior: smooth;
    }
    
    /* Custom scrollbar */
    ::-webkit-scrollbar {
      width: 8px;
    }
    
    ::-webkit-scrollbar-track {
      background: rgba(0, 0, 0, 0.05);
      border-radius: 4px;
    }
    
    ::-webkit-scrollbar-thumb {
      background: rgba(59, 130, 246, 0.3);
      border-radius: 4px;
      transition: all 0.3s ease;
    }

    ::-webkit-scrollbar-thumb:hover {
      background: rgba(59, 130, 246, 0.5);
    }
  `
  document.head.appendChild(style)
}
