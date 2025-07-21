// components/AvurnaDropOverlay.tsx
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud } from 'lucide-react'; // Keeping UploadCloud as per "KEEP THE AVURNA THINGS"

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

export const AvurnaDropOverlay: React.FC<AvurnaDropOverlayProps> = ({ isVisible }) => {
  const [displayedMessage, setDisplayedMessage] = useState('');
  const [fullMessage, setFullMessage] = useState('');
  const messageIndexRef = useRef(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isVisible) {
      // Pick a random message when the overlay becomes visible
      const randomIndex = Math.floor(Math.random() * avurnaMessages.length);
      const chosenMessage = avurnaMessages[randomIndex];
      setFullMessage(chosenMessage);
      setDisplayedMessage('');
      messageIndexRef.current = 0;

      // Start typewriter effect
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      intervalRef.current = setInterval(() => {
        setDisplayedMessage((prev) => {
          if (messageIndexRef.current < chosenMessage.length) {
            messageIndexRef.current += 1;
            return chosenMessage.substring(0, messageIndexRef.current);
          } else {
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
            }
            return prev;
          }
        });
      }, 50); // Typing speed (50ms per character)
    } else {
      // Reset when not visible
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      setDisplayedMessage('');
      setFullMessage('');
      messageIndexRef.current = 0;
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isVisible]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          // This outer div provides the full-screen blur effect.
          // It now directly contains the icon and text, without an inner box.
          className="fixed inset-0 z-30 flex flex-col items-center justify-center backdrop-blur-md transition-all duration-300"
          style={{
            backgroundColor: 'transparent', // Explicitly transparent to allow blur to show
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Upload icon - now directly on the blurred background */}
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 100, damping: 15 }}
            className="flex flex-col items-center"
          >
            <UploadCloud size={64} className="text-[var(--primary-accent)] mb-4 animate-pulse-gentle" /> {/* Adjusted size and color variable */}
            
            {/* "Drop Files Here" text - smaller font size */}
            <p className="text-xl font-semibold text-[var(--dropzone-foreground)]">Drop files here</p> {/* Adjusted font size and color variable */}
          </motion.div>

          {/* Avurna's message - now directly on the blurred background */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 100, damping: 15 }}
            className="mt-4 text-center text-lg font-medium text-[var(--dropzone-muted-foreground)] px-8" // Adjusted font size and color variable
          >
            {displayedMessage}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
