import { useRef, useCallback, type RefObject } from 'react';

// src/lib/hooks/use-scroll-to-bottom.ts
export function useScrollToBottom(): [
  RefObject<HTMLDivElement | null>,
  RefObject<HTMLDivElement | null>,
  () => void
] {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  // Scroll the container to its maximum scroll position (true bottom)
  const scrollToBottom = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    } else if (endRef.current) {
      endRef.current.scrollIntoView({ block: 'end' });
    }
  }, []);

  return [containerRef, endRef, scrollToBottom];
}