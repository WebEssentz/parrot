"use-client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowDown } from "lucide-react";
// --- 1. Import useState and useEffect ---
import { useState, useEffect } from "react";

// --- 2. Create a self-contained hook to check for mobile/tablet size ---
// We keep it in this file to make the component fully independent.
const useIsMobileOrTablet = () => {
  const [isMobileOrTablet, setIsMobileOrTablet] = useState(false);

  useEffect(() => {
    // A standard breakpoint for "not a large desktop" is 1024px.
    const checkDeviceSize = () => {
      setIsMobileOrTablet(window.innerWidth < 1024);
    };

    // Check on initial load
    checkDeviceSize();

    // Add listener for window resize
    window.addEventListener("resize", checkDeviceSize);

    // Cleanup listener on component unmount
    return () => {
      window.removeEventListener("resize", checkDeviceSize);
    };
  }, []); // Empty dependency array ensures this runs only once

  return isMobileOrTablet;
};


interface ScrollToBottomButtonProps {
  isVisible: boolean;
  onClick: () => void;
}

export function ScrollToBottomButton({ isVisible, onClick }: ScrollToBottomButtonProps) {
  // --- 3. Use the hook to get the current device state ---
  const isMobileOrTablet = useIsMobileOrTablet();

  // --- 4. Define the spacing based on the device type ---
  // More space on mobile/tablet (3rem), less on desktop (3.5rem).
  const bottomGap = isMobileOrTablet ? '3rem' : '3.5rem';

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          onClick={onClick}
          aria-label="Scroll to bottom"
          className="absolute left-1/2 -translate-x-1/2 cursor-pointer z-30 flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200 bg-white/80 text-zinc-600 backdrop-blur-sm hover:bg-zinc-100 dark:border-zinc-700/80 dark:bg-[#1C1C1C] dark:text-zinc-300 dark:hover:bg-zinc-700"
          style={{
            // --- 5. Apply the dynamic gap to the style ---
            // The '+' correctly adds space *above* the input area.
            bottom: `calc(var(--input-area-height, 80px) - ${bottomGap})`
          }}
          initial={{ opacity: 0, y: 10, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.9 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          <ArrowDown className="h-5 w-5" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}