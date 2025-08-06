// components/strategy-slate.tsx

'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Lightbulb, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Markdown } from './markdown'; // Ensure this path is correct

/**
 * The definitive component for displaying the AI's thought process.
 * Features a live, animated view that transitions to a collapsible summary.
 */
export function StrategySlate({ reasoningParts, isLastPartReasoning }: {
  reasoningParts: any[],
  isLastPartReasoning: boolean;
}) {
  const [startTime] = useState(Date.now());
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isThinking, setIsThinking] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const hasCalculatedTime = useRef(false);

  useEffect(() => {
    if (isThinking && !isLastPartReasoning && !hasCalculatedTime.current) {
      const finalTime = ((Date.now() - startTime) / 1000).toFixed(2);
      setElapsedTime(Number(finalTime));
      setIsThinking(false);
      hasCalculatedTime.current = true;
    }
  }, [isLastPartReasoning, isThinking, startTime]);

  if (!reasoningParts || reasoningParts.length === 0) {
    return null;
  }

  const fullReasoningText = reasoningParts
    .map(part => part.details.map((detail: any) => detail.text).join('\n\n'))
    .join('\n\n');
  
  const liveTitle = fullReasoningText.split('\n')[0].replace(/#+\s*/, '').trim() || "Thinking...";

  // --- NEW, CUSTOM SHIMMER COMPONENT ---
  const ShimmerText = ({ text }: { text: string }) => {
    return (
      <div className="flex items-center gap-2 mb-2 pl-1" aria-label={text}>
        <Lightbulb className="size-4 text-zinc-500 dark:text-zinc-400 flex-shrink-0" />
        <div className="flex">
          {text.split('').map((char, index) => (
            <motion.span
              key={index}
              className="text-xs text-zinc-500 dark:text-zinc-400"
              style={{ display: 'inline-block' }} // Needed for transform animations
              initial={{ opacity: 0.3, y: 3 }}
              animate={{ opacity: [0.3, 1, 0.3], y: [3, 0, 3] }}
              transition={{
                duration: 2.5, // Slower, more subtle duration
                ease: "easeInOut",
                delay: index * 0.08, // Staggered delay for a left-to-right wave
                repeat: Infinity,
              }}
            >
              {/* Use a non-breaking space for spaces to maintain layout */}
              {char === ' ' ? '\u00A0' : char}
            </motion.span>
          ))}
        </div>
      </div>
    );
  };

  return (
    <motion.div
      className="my-4"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      {isThinking && (
        <>
          <ShimmerText text="Thinking..." />
          <div className="border border-zinc-200/80 dark:border-zinc-700/60 rounded-lg p-3 animate-pulse-border">
            <style>{`
              @keyframes pulse-border {
                0%, 100% { border-color: rgba(161, 161, 170, 0.4); }
                50% { border-color: rgba(161, 161, 170, 0.8); }
              }
              .animate-pulse-border {
                animation: pulse-border 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
              }
            `}</style>
            <div className="flex items-center gap-3 mb-2">
              <div className="font-medium text-sm text-zinc-800 dark:text-zinc-200">
                <Markdown>{liveTitle}</Markdown>
              </div>
            </div>
            <div className="prose prose-sm dark:prose-invert max-w-none text-zinc-600 dark:text-zinc-400 pl-4">
              <Markdown>
                {fullReasoningText.substring(fullReasoningText.indexOf('\n') + 1)}
              </Markdown>
            </div>
          </div>
        </>
      )}

      {!isThinking && (
        <div>
          <div
            className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 cursor-pointer w-fit"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <span>
              Thought for {elapsedTime} {elapsedTime <= 1 ? 'second' : 'seconds'}
            </span>
            {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </div>

          <AnimatePresence>
            {isExpanded && (
              <motion.div
                key="thought-details"
                initial={{ height: 0, opacity: 0, marginTop: 0 }}
                animate={{ height: 'auto', opacity: 1, marginTop: '0.75rem' }}
                exit={{ height: 0, opacity: 0, marginTop: 0 }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                <div className="border border-zinc-200/80 dark:border-zinc-700/60 rounded-lg p-3">
                    <div className="flex items-center gap-3 mb-2">
                        <Check className="size-4 text-green-500 flex-shrink-0" />
                        <h3 className="font-medium text-sm text-zinc-800 dark:text-zinc-200">
                            Final Thoughts
                        </h3>
                    </div>
                    <div className="prose prose-sm dark:prose-invert max-w-none text-zinc-600 dark:text-zinc-100 pl-7">
                        <Markdown>{fullReasoningText}</Markdown>
                    </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}