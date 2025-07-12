"use client";

import { motion, useAnimationControls } from "framer-motion";
import { memo, useEffect, useState, useCallback } from "react";
import React from "react";

interface PredictivePromptsProps {
  prompts: string[];
  currentUserInput: string;
  onSelect: (prompt: string) => void;
  // --- NEW ---: Add a callback to handle dismissal via Escape key
  onDismiss: () => void;
}

function PurePredictivePrompts({
  prompts,
  currentUserInput,
  onSelect,
  // --- NEW ---: Destructure the new onDismiss prop
  onDismiss,
}: PredictivePromptsProps) {
  const controls = useAnimationControls();
  // --- NEW ---: State to track the currently highlighted suggestion
  const [activeIndex, setActiveIndex] = useState(-1);

  // --- Animation Variants (Unchanged) ---
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 5, opacity: 0 },
    visible: { y: 0, opacity: 1 },
  };

  // --- NEW FEATURE: Keyboard Event Handler ---
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Ignore if there are no prompts to navigate
      if (prompts.length === 0) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault(); // Prevent cursor from moving in the input
          setActiveIndex((prevIndex) => (prevIndex + 1) % prompts.length);
          break;
        case "ArrowUp":
          e.preventDefault(); // Prevent cursor from moving in the input
          // Modulo operator handles looping correctly for positive numbers
          setActiveIndex((prevIndex) => (prevIndex - 1 + prompts.length) % prompts.length);
          break;
        case "Enter":
          // Only act if a prompt is actually selected
          if (activeIndex >= 0) {
            e.preventDefault(); // Prevent form submission
            onSelect(prompts[activeIndex]);
          }
          break;
        case "Escape":
          e.preventDefault();
          onDismiss(); // Call parent to hide the prompts
          break;
      }
    },
    [activeIndex, prompts, onSelect, onDismiss]
  );

  // --- NEW ---: Effect to attach the global keydown listener
  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);
  
  // --- NEW ---: Effect to reset selection when prompts change
  useEffect(() => {
    setActiveIndex(-1);
  }, [prompts]);
  
  // --- NEW ---: Effect to scroll the highlighted item into view
  useEffect(() => {
    if (activeIndex >= 0) {
      const activeElement = document.getElementById(`prompt-${activeIndex}`);
      // 'nearest' ensures minimal scrolling
      activeElement?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [activeIndex]);


  // --- Existing Animation Hooks (Unchanged) ---
  useEffect(() => {
    controls.start("visible");
  }, [controls]);

  useEffect(() => {
    const handleFocus = () => {
      controls.start({
        y: [0, -3, 0],
        transition: { duration: 0.4, ease: "easeInOut" },
      });
    };
    window.addEventListener("focus", handleFocus);
    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, [controls]);

  // If there are no prompts, don't render anything.
  if (!prompts || prompts.length === 0) {
    return null;
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate={controls}
      exit="hidden"
      className="absolute top-full z-20 mt-2 w-full overflow-hidden bg-transparent p-0 backdrop-blur-sm"
    >
      <div className="flex flex-col">
        {prompts.map((prompt, index) => { // Added index for tracking
          const inputLower = currentUserInput.toLowerCase();
          const promptLower = prompt.toLowerCase();
          const isMatch = promptLower.startsWith(inputLower);

          const matchedPart = isMatch
            ? prompt.substring(0, currentUserInput.length)
            : "";
          const remainingPart = isMatch
            ? prompt.substring(currentUserInput.length)
            : prompt;

          // --- NEW ---: Determine if the current item is focused
          const isFocused = index === activeIndex;

          return (
            <motion.div key={prompt} variants={itemVariants}>
              <button
                // --- NEW ---: Added id for scrollIntoView
                id={`prompt-${index}`}
                onClick={() => onSelect(prompt)}
                // --- MODIFIED ---: Conditionally apply focus style
                className={`w-full px-4 py-3.5 cursor-pointer text-left text-sm font-normal rounded-lg text-zinc-300 hover:bg-zinc-400/10 border-b border-zinc-700/50 last:border-b-0 ${
                  isFocused ? "bg-zinc-400/10" : "" // This is your existing hover style, ensuring consistency
                }`}
              >
                {isMatch ? (
                  <>
                    <span className="text-zinc-500 dark:text-zinc-500">{matchedPart}</span>
                    <span className="text-primary dark:text-zinc-200">{remainingPart}</span>
                  </>
                ) : (
                  <span className="text-zinc-200">{prompt}</span>
                )}
              </button>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

export const PredictivePrompts = memo(PurePredictivePrompts);