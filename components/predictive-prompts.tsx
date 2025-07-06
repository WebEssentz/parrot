// src/components/predictive-prompts.tsx
"use client";

import { motion, useAnimationControls } from "framer-motion";
import { memo, useEffect } from "react";
import React from "react";

interface PredictivePromptsProps {
  prompts: string[];
  currentUserInput: string;
  onSelect: (prompt: string) => void;
}

function PurePredictivePrompts({
  prompts,
  currentUserInput,
  onSelect,
}: PredictivePromptsProps) {
  const controls = useAnimationControls();

  // --- Animation Variants ---
  // We define the "states" our component can be in.
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

  // --- useEffect Hooks for Orchestration ---

  // HOOK 1: Plays the initial "cascade" animation ONCE on mount.
  useEffect(() => {
    // We tell the controls to sequence from "hidden" to "visible".
    // Framer Motion automatically applies this to all children with variants.
    controls.start("visible");
  }, [controls]);

  // HOOK 2: Plays the re-engagement "wiggle" animation on window focus.
  useEffect(() => {
    const handleFocus = () => {
      // This animation runs independently on the container itself.
      // It does not affect the children's "visible" state.
      controls.start({
        y: [0, -3, 0],
        transition: { duration: 0.4, ease: "easeInOut" },
      });
    };

    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [controls]);

  // If there are no prompts, don't render anything.
  if (!prompts || prompts.length === 0) {
    return null;
  }

  return (
    // We use the `animate` prop to link our controls.
    // We use `variants` to define the "hidden" and "visible" states.
    // We use `initial` to set the starting state.
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate={controls}
      exit="hidden" // On exit, it will reverse the "visible" transition.
      className="absolute top-full z-20 mt-2 w-full overflow-hidden bg-transparent p-0 backdrop-blur-sm"
    >
      <div className="flex flex-col">
        {prompts.map((prompt) => {
          const inputLower = currentUserInput.toLowerCase();
          const promptLower = prompt.toLowerCase();
          const isMatch = promptLower.startsWith(inputLower);

          const matchedPart = isMatch
            ? prompt.substring(0, currentUserInput.length)
            : "";
          const remainingPart = isMatch
            ? prompt.substring(currentUserInput.length)
            : prompt;

          // Each item gets the itemVariants. The parent `motion.div` will
          // automatically orchestrate their animation based on `staggerChildren`.
          return (
            <motion.div key={prompt} variants={itemVariants}>
              <button
                onClick={() => onSelect(prompt)}
                className="w-full px-4 py-3.5 cursor-pointer text-left text-sm font-normal rounded-lg text-zinc-300 hover:bg-zinc-400/10 border-b border-zinc-700/50 last:border-b-0"
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