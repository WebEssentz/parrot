import { useEffect, useRef, type RefObject } from 'react';

export function useScrollToBottom(): [
  RefObject<HTMLDivElement>,
  RefObject<HTMLDivElement>,
] {
  const containerRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const end = endRef.current;
    if (!container || !end) return;

    let isUserNearBottom = true;
    let lastScrollTop = container.scrollTop;
    let ticking = false;

    // Helper: check if user is near the bottom
    const checkIfAtBottom = () => {
      const threshold = 64; // px, more forgiving for fast streaming
      const atBottom = Math.abs(container.scrollHeight - container.scrollTop - container.clientHeight) < threshold;
      isUserNearBottom = atBottom;
      return atBottom;
    };

    // Scroll to bottom if user is near the bottom (auto-scroll)
    const scrollToBottomIfNeeded = (force = false) => {
      if (isUserNearBottom || force) {
        // Use requestAnimationFrame for smoother scroll during streaming
        requestAnimationFrame(() => {
          // First, try smooth scroll
          end.scrollIntoView({ behavior: 'smooth', block: 'end' });
          // Then, after a short delay, force an instant scroll to guarantee bottom
          setTimeout(() => {
            end.scrollIntoView({ behavior: 'auto', block: 'end' });
          }, 60); // 1-2 frames later
        });
      }
    };

    // Mutation observer: only auto-scroll if user is near the bottom
    const observer = new MutationObserver(() => {
      // Use rAF to avoid layout thrashing during rapid streaming
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(() => {
          scrollToBottomIfNeeded();
          ticking = false;
        });
      }
    });
    observer.observe(container, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true,
    });

    // Listen for scroll events to update isUserNearBottom
    const onScroll = () => {
      checkIfAtBottom();
      lastScrollTop = container.scrollTop;
    };
    container.addEventListener('scroll', onScroll, { passive: true });

    // Listen for resize (e.g. keyboard, window resize)
    window.addEventListener('resize', () => scrollToBottomIfNeeded(true));

    // Initial check
    setTimeout(() => {
      checkIfAtBottom();
      scrollToBottomIfNeeded(true);
    }, 0);

    return () => {
      observer.disconnect();
      container.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', () => scrollToBottomIfNeeded(true));
    };
  }, []);

  // @ts-expect-error error
  return [containerRef, endRef];
}