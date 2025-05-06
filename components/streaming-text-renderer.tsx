// components/streaming-text-renderer.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Markdown } from './markdown';

interface StreamingTextRendererProps {
  fullText: string;
  wordSpeed?: number;
  asMarkdown?: boolean;
  className?: string;
  onComplete?: () => void;
}

const splitIntoWordsAndSeparators = (text: string): string[] => {
  if (!text) return [];
  return text.match(/\S+|\s+/g) || [];
};

export const StreamingTextRenderer: React.FC<StreamingTextRendererProps> = ({
  fullText,
  wordSpeed = 50, // Adjusted default speed
  asMarkdown = false,
  className,
  onComplete,
}) => {
  const [displayedText, setDisplayedText] = useState('');
  const allWordsRef = useRef<string[]>([]); // All words received so far
  const currentIndexRef = useRef(0); // Index of the next word to display
  const animationFrameIdRef = useRef<number | null>(null);
  const lastUpdateTimeRef = useRef(0);

  useEffect(() => {
    // Update the target words whenever fullText changes
    allWordsRef.current = splitIntoWordsAndSeparators(fullText);

    const animate = (timestamp: number) => {
      if (currentIndexRef.current >= allWordsRef.current.length) {
        // Typing complete for all currently known words
        setDisplayedText(allWordsRef.current.join('')); // Ensure final sync
        if (onComplete) onComplete();
        animationFrameIdRef.current = null;
        return;
      }

      if (timestamp - lastUpdateTimeRef.current >= wordSpeed) {
        currentIndexRef.current += 1;
        const wordsToDisplay = allWordsRef.current.slice(0, currentIndexRef.current);
        setDisplayedText(wordsToDisplay.join(''));
        lastUpdateTimeRef.current = timestamp;
      }

      // Continue animation if there are more words to type
      if (currentIndexRef.current < allWordsRef.current.length) {
        animationFrameIdRef.current = requestAnimationFrame(animate);
      } else {
        // Just finished typing all known words
        setDisplayedText(allWordsRef.current.join('')); // Ensure final sync
        if (onComplete) onComplete();
        animationFrameIdRef.current = null;
      }
    };

    // If there are new words to type and animation is not already running
    if (currentIndexRef.current < allWordsRef.current.length && !animationFrameIdRef.current) {
      lastUpdateTimeRef.current = performance.now(); // Reset time for the first word of a new batch
      animationFrameIdRef.current = requestAnimationFrame(animate);
    } else if (currentIndexRef.current >= allWordsRef.current.length && displayedText !== fullText) {
      // If typing was "done" but fullText updated (e.g. trailing space, or a quick full update)
      setDisplayedText(fullText); // Ensure final sync
    }

    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
      }
    };
  }, [fullText, wordSpeed, onComplete, displayedText]); // displayedText in deps to help sync if animation finishes but fullText changes slightly

  // This effect handles cases where fullText might be reset or change in a way
  // that requires resetting the currentIndexRef.
  useEffect(() => {
    // If fullText is empty, reset everything
    if (fullText === '') {
      setDisplayedText('');
      currentIndexRef.current = 0;
      allWordsRef.current = [];
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
      }
      return;
    }

    // A simple heuristic: if the displayed text is longer than the new fullText,
    // or if the beginning of displayedText doesn't match fullText, consider it a reset.
    // This helps if the stream restarts or changes dramatically.
    if (displayedText.length > fullText.length || !fullText.startsWith(displayedText.substring(0, Math.min(displayedText.length, 10) ))) {
        // If displayed text is somehow ahead or completely different, reset animation
        const currentWordsInDisplayed = splitIntoWordsAndSeparators(displayedText);
        const newWordsInFullText = splitIntoWordsAndSeparators(fullText);

        // Find how many leading words match
        let matchingWords = 0;
        while(
            matchingWords < currentWordsInDisplayed.length &&
            matchingWords < newWordsInFullText.length &&
            currentWordsInDisplayed[matchingWords] === newWordsInFullText[matchingWords]
        ) {
            matchingWords++;
        }
        currentIndexRef.current = matchingWords; // Start animation from the first differing word
        setDisplayedText(newWordsInFullText.slice(0, matchingWords).join(''));

        // Restart animation if needed
        if (animationFrameIdRef.current) {
            cancelAnimationFrame(animationFrameIdRef.current);
            animationFrameIdRef.current = null;
        }
        if (currentIndexRef.current < newWordsInFullText.length) {
            lastUpdateTimeRef.current = performance.now();
            // Define animate here or bring it into this scope
            const animate = (timestamp: number) => {
                if (currentIndexRef.current >= newWordsInFullText.length) {
                    setDisplayedText(newWordsInFullText.join(''));
                    if (onComplete) onComplete();
                    animationFrameIdRef.current = null;
                    return;
                }

                if (timestamp - lastUpdateTimeRef.current >= wordSpeed) {
                    currentIndexRef.current += 1;
                    const wordsToDisplay = newWordsInFullText.slice(0, currentIndexRef.current);
                    setDisplayedText(wordsToDisplay.join(''));
                    lastUpdateTimeRef.current = timestamp;
                }

                if (currentIndexRef.current < newWordsInFullText.length) {
                    animationFrameIdRef.current = requestAnimationFrame(animate);
                } else {
                    setDisplayedText(newWordsInFullText.join(''));
                    if (onComplete) onComplete();
                    animationFrameIdRef.current = null;
                }
            };
            animationFrameIdRef.current = requestAnimationFrame(animate);
        }
    }
  // 'animate' isn't a stable function, so we can't put it in dependencies.
  // This effect mostly cares about fullText and displayedText for reset logic.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullText, displayedText]);


  const content = asMarkdown ? <Markdown>{displayedText}</Markdown> : displayedText;

  return (
    <div
      className={className}
      style={!asMarkdown ? { whiteSpace: 'pre-wrap', wordBreak: 'break-word' } : {}}
    >
      {content}
    </div>
  );
};