// FILE: hooks/useTypewriter.ts (FINAL, STABLE & CORRECTED VERSION)

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
  speed = 15,
  chunkSize = 4,
}: UseTypewriterProps): string => {
  const [displayText, setDisplayText] = useState('');

  // Use a single ref to hold all the values the animation loop needs.
  // This prevents the animation callback from depending on props or state.
  const stateRef = useRef({
    fullText,
    onComplete,
    isStopped,
    speed,
    chunkSize,
    index: 0,
    lastUpdateTime: 0,
    animationFrameId: null as number | null,
  });

  // Keep the ref's values synchronized with the latest props.
  // This runs on every render but is very cheap and does not affect the animation loop.
  useEffect(() => {
    stateRef.current.fullText = fullText;
    stateRef.current.onComplete = onComplete;
    stateRef.current.isStopped = isStopped;
    stateRef.current.speed = speed;
    stateRef.current.chunkSize = chunkSize;
  });

  // This animate function is now created ONLY ONCE for the entire component lifecycle.
  // It has no dependencies and is therefore stable.
  const animate = useCallback((timestamp: number) => {
    const state = stateRef.current;

    // If the loop is stopped, exit immediately.
    if (state.isStopped) {
      if (state.animationFrameId) cancelAnimationFrame(state.animationFrameId);
      return;
    }

    if (state.lastUpdateTime === 0) {
      state.lastUpdateTime = timestamp;
    }

    const elapsed = timestamp - state.lastUpdateTime;

    if (elapsed >= state.speed) {
      state.lastUpdateTime = timestamp;
      const nextIndex = Math.min(state.index + state.chunkSize, state.fullText.length);
      
      setDisplayText(state.fullText.substring(0, nextIndex));
      state.index = nextIndex;

      // If we've reached the end, call the callback and stop the loop.
      if (nextIndex >= state.fullText.length) {
        state.onComplete();
        return;
      }
    }

    // Continue the loop.
    state.animationFrameId = requestAnimationFrame(animate);
  }, []); // <-- The empty dependency array is the key to stability.

  // This effect manages the STARTING and STOPPING of the animation.
  useEffect(() => {
    // If the user manually stops the animation.
    if (isStopped) {
      if (stateRef.current.animationFrameId) {
        cancelAnimationFrame(stateRef.current.animationFrameId);
      }
      setDisplayText(fullText);
      return;
    }

    // Reset the state for a new message.
    stateRef.current.index = 0;
    stateRef.current.lastUpdateTime = 0;
    setDisplayText('');
    
    // Always cancel any previous animation frame before starting a new one.
    // This is the definitive fix for "ghost messages".
    if (stateRef.current.animationFrameId) {
      cancelAnimationFrame(stateRef.current.animationFrameId);
    }
    
    // Start the animation if there is text to display.
    if (fullText) {
      stateRef.current.animationFrameId = requestAnimationFrame(animate);
    }

    // The cleanup function is crucial for stopping the animation on unmount.
    return () => {
      if (stateRef.current.animationFrameId) {
        cancelAnimationFrame(stateRef.current.animationFrameId);
      }
    };
  }, [fullText, isStopped]); // <-- The dependencies are now correct and stable.

  return displayText;
};