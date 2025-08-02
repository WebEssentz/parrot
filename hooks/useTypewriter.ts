// FILE: hooks/useTypewriter.ts (FINAL, STABLE, AND CORRECTED)

import { useState, useEffect, useRef } from 'react';

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
  speed = 15,
  chunkSize = 4,
}: UseTypewriterProps): string => {
  const [displayText, setDisplayText] = useState('');
  
  // Use a ref for the animation frame ID to control the loop.
  const animationFrameId = useRef<number | null>(null);

  // This is the core effect that runs the animation.
  // It only re-runs if the source text (`fullText`) or the stop flag (`isStopped`) changes.
  useEffect(() => {
    // If the user has requested to stop, clean up and show the final text.
    if (isStopped) {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
      setDisplayText(fullText);
      return;
    }

    // If there's no text, just reset and do nothing.
    if (!fullText) {
      setDisplayText('');
      return;
    }

    // --- Animation State ---
    // These variables live ONLY inside this useEffect. They are reset every time
    // the effect re-runs (i.e., for a new message).
    let currentIndex = 0;
    let lastUpdateTime = 0;
    setDisplayText(''); // Start with a blank slate for the new message.

    const animate = (timestamp: number) => {
      // Initialize the timer on the first frame.
      if (lastUpdateTime === 0) {
        lastUpdateTime = timestamp;
      }

      const elapsed = timestamp - lastUpdateTime;

      // Check if enough time has passed to render the next chunk.
      if (elapsed >= speed) {
        lastUpdateTime = timestamp;
        
        const nextIndex = Math.min(currentIndex + chunkSize, fullText.length);
        
        // This is safe because `setDisplayText` will schedule a render, but
        // this `animate` loop continues independently via requestAnimationFrame.
        setDisplayText(fullText.substring(0, nextIndex));
        currentIndex = nextIndex;
      }

      // If we haven't reached the end, continue the loop.
      if (currentIndex < fullText.length) {
        animationFrameId.current = requestAnimationFrame(animate);
      } else {
        // We're done. Call the completion callback.
        onComplete();
      }
    };

    // Start the animation loop for the new message.
    animationFrameId.current = requestAnimationFrame(animate);

    // The cleanup function is critical. It runs when the component unmounts
    // OR before the effect re-runs for a new message.
    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
    
  }, [fullText, isStopped, speed, chunkSize, onComplete]); // The dependencies are now correct.

  return displayText;
};