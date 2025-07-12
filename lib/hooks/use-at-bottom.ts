// FILE: lib/hooks/use-at-bottom.ts

import * as React from 'react'
import type { RefObject } from 'react';

export function useAtBottom(containerRef: RefObject<HTMLElement | null>, offset = 0) {
  const [isAtBottom, setIsAtBottom] = React.useState(true);

  React.useEffect(() => {
    // FIX: Get the DOM element from the ref
    const container = containerRef.current;
    // FIX: If the container doesn't exist yet, do nothing.
    if (!container) return;

    const handleScroll = () => {
      const atBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + offset;
      setIsAtBottom(atBottom);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial check

    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [containerRef, offset]);

  return isAtBottom;
}