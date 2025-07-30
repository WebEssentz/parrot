// FILE: hooks/useTypewriter.ts
import { useState, useEffect, useRef } from 'react';

interface UseTypewriterProps {
  fullText: string;
  onComplete: () => void;
  isStopped: boolean;
  speed?: number;
  chunkSize?: number; // How many characters to add at a time
}

export const useTypewriter = ({
  fullText,
  onComplete,
  isStopped,
  speed = 15,      // A more stable interval, e.g., 15ms
  chunkSize = 4,   // The number of characters to render per interval
}: UseTypewriterProps): string => {
  const [displayText, setDisplayText] = useState('');
  const indexRef = useRef(0);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // Effect to handle manual stop by the user
  useEffect(() => {
    if (isStopped) {
      // When stopped, immediately show the text that was streamed so far and finish.
      setDisplayText(fullText);
      onCompleteRef.current();
    }
  }, [isStopped, fullText]);


  useEffect(() => {
    // Exit early if the animation was stopped by the user
    if (isStopped) {
      return;
    }

    // Reset the index if a new, shorter message stream begins
    if (indexRef.current > fullText.length) {
      indexRef.current = 0;
      setDisplayText('');
    }

    const timer = setInterval(() => {
      // Calculate the next index by adding the chunk size, ensuring it doesn't exceed the total length
      const nextIndex = Math.min(indexRef.current + chunkSize, fullText.length);

      // Set the display text to the new, longer substring
      setDisplayText(fullText.substring(0, nextIndex));
      indexRef.current = nextIndex;

      // If we have now rendered the entire text, clear the interval and call the onComplete callback
      if (nextIndex >= fullText.length) {
        clearInterval(timer);
        onCompleteRef.current();
      }
    }, speed);

    // Cleanup function to clear the interval when the component unmounts or dependencies change
    return () => clearInterval(timer);
  }, [fullText, isStopped, speed, chunkSize]);

  return displayText;
};