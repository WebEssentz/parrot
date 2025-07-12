"use-client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowDown } from "lucide-react"; 
import { useState, useEffect } from "react";

// Hook to check for mobile/tablet size
const useIsMobileOrTablet = () => {
  const [isMobileOrTablet, setIsMobileOrTablet] = useState(false);
  useEffect(() => {
    const checkDeviceSize = () => setIsMobileOrTablet(window.innerWidth < 1024);
    checkDeviceSize();
    window.addEventListener("resize", checkDeviceSize);
    return () => window.removeEventListener("resize", checkDeviceSize);
  }, []);
  return isMobileOrTablet;
};

interface ScrollToBottomButtonProps {
  isVisible: boolean;
  onClick: () => void;
}

export function ScrollToBottomButton({ isVisible, onClick }: ScrollToBottomButtonProps) {
  const isMobileOrTablet = useIsMobileOrTablet();
  // Use a larger gap on mobile for easier tapping
  const bottomGap = isMobileOrTablet ? '0rem' : '0rem';

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          onClick={onClick}
          aria-label="Scroll to bottom"
          // --- FIX #1: Use 'fixed' positioning so it doesn't scroll with the page ---
          className="fixed left-1/2 -translate-x-1/2 cursor-pointer z-30 flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200 bg-white/80 text-zinc-600 backdrop-blur-sm hover:bg-zinc-100 dark:border-zinc-700/80 dark:bg-[#1C1C1C] dark:text-zinc-300 dark:hover:bg-zinc-700"
          style={{
            // --- FIX #2: Use '+' to add space ABOVE the input area, not '-' ---
            bottom: `calc(var(--input-area-height, 80px) + ${bottomGap})`
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