"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UploadCloud } from "lucide-react";

interface AvurnaDropOverlayProps {
  isVisible: boolean;
}

const avurnaMessages = [
  "What treasures do you bring me today?",
  "Ready to process anything you throw my way.",
  "Intriguing. Let's see what you've got!",
  "Files detected. I'm all ears... or rather, all algorithms.",
  "A new challenge? Excellent.",
  "Bringing data to life, one file at a time.",
  "The journey of a thousand insights begins with a single drop.",
  "Ready to assist with those bytes!",
  "Ooh, something new!",
  "My circuits are buzzing with anticipation.",
  "Don't be shy, just drop it.",
];

// 🧹 Hook for typewriter effect
function useTypewriter(text: string, speed: number = 50) {
  const [display, setDisplay] = useState("");
  const indexRef = useRef(0);
  const frameRef = useRef<number>();

  useEffect(() => {
    if (!text) {
      setDisplay("");
      return;
    }

    const step = () => {
      indexRef.current++;
      if (indexRef.current <= text.length) {
        setDisplay(text.slice(0, indexRef.current));
        frameRef.current = window.setTimeout(step, speed);
      }
    };

    step();

    return () => {
      if (frameRef.current) clearTimeout(frameRef.current);
      indexRef.current = 0;
    };
  }, [text, speed]);

  return display;
}

export const AvurnaDropOverlay: React.FC<AvurnaDropOverlayProps> = ({ isVisible }) => {
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (isVisible) {
      const randomIndex = Math.floor(Math.random() * avurnaMessages.length);
      setMessage(avurnaMessages[randomIndex]);
    } else {
      setMessage("");
    }
  }, [isVisible]);

  const displayedMessage = useTypewriter(message);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-0 z-30 flex flex-col items-center justify-center backdrop-blur-md transition-all duration-300"
          style={{ backgroundColor: "transparent" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 100, damping: 15 }}
            className="flex flex-col items-center"
          >
            <UploadCloud
              size={64}
              className="text-[var(--primary-accent)] mb-4 animate-pulse-gentle"
              aria-hidden="true"
            />
            <h2 className="text-xl font-semibold text-[var(--dropzone-foreground)]">
              Drop files here
            </h2>
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 100, damping: 15 }}
            className="mt-4 text-center text-lg font-medium text-[var(--dropzone-muted-foreground)] px-8"
            aria-live="polite"
          >
            {displayedMessage || "Awaiting your drop..."}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
