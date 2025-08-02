// FILE: hooks/useTypewriter.ts (FINAL, WORKING VERSION)

import { useState, useEffect, useRef, useCallback } from 'react';

interface UseTypewriterProps {
  fullText: string;
  onComplete: () => void;
  isStopped: boolean;
  speed?: number;
  chunkSize?: number;
}

export const useTypewriter = ({
  fullText,
  onComplete,
  isStopped,
  speed = 15, // Adjusted for a snappier feel
  chunkSize = 4,
}: UseTypewriterProps): string => {
  const [displayText, setDisplayText] = useState('');

  // Refs for values that persist across renders without causing them
  const onCompleteRef = useRef(onComplete);
  const animationFrameId = useRef<number | null>(null);
  const lastUpdateTime = useRef<number | null>(null);
  
  // Use a ref to track the current position in the text.
  // This is the key to avoiding stale state in the animation loop.
  const indexRef = useRef(0);

  // Keep the onComplete callback fresh
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const animate = useCallback((timestamp: number) => {
    // If the loop is running for the first time
    if (lastUpdateTime.current === null) {
      lastUpdateTime.current = timestamp;
    }

    const elapsed = timestamp - lastUpdateTime.current;

    let shouldRequestNextFrame = true;

    // If enough time has passed, update the text
    if (elapsed > speed) {
      lastUpdateTime.current = timestamp;

      // Get the current index from the ref
      let currentIndex = indexRef.current;
      const nextIndex = Math.min(currentIndex + chunkSize, fullText.length);

      // Only update if we have new text to show
      if (currentIndex < nextIndex) {
        const newText = fullText.substring(0, nextIndex);
        setDisplayText(newText);
        // Update the ref for the next iteration
        indexRef.current = nextIndex;
      }
      
      // If we've reached the end, stop the animation loop
      if (nextIndex >= fullText.length) {
        onCompleteRef.current();
        shouldRequestNextFrame = false;
      }
    }

    // Continue the loop if we are not at the end
    if (shouldRequestNextFrame) {
      animationFrameId.current = requestAnimationFrame(animate);
    }
  }, [speed, chunkSize, fullText]); // Dependency on fullText is important to restart on change

  // This effect manages starting and stopping the animation loop
  useEffect(() => {
    // If user manually stops, kill the animation
    if (isStopped) {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
      setDisplayText(fullText); // Show the final text
      return;
    }

    // Reset everything when fullText changes
    indexRef.current = 0;
    lastUpdateTime.current = null;
    setDisplayText('');

    // Start the animation if there's text to display
    if (fullText) {
      animationFrameId.current = requestAnimationFrame(animate);
    }

    // Cleanup: cancel the animation frame when the component unmounts or deps change
    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [fullText, isStopped, animate]);

  return displayText;
};