// hooks/use-on-click-outside.ts

import { useEffect, RefObject } from 'react';

type AnyEvent = MouseEvent | TouchEvent;

// --- THIS IS THE MODIFIED SIGNATURE ---
export function useOnClickOutside(
  ref: RefObject<HTMLElement>, // We removed the generic and are now explicit
  handler: (event: AnyEvent) => void,
): void {
  useEffect(() => {
    const listener = (event: AnyEvent) => {
      const el = ref?.current;

      // This logic is already correct and handles the null case at runtime
      if (!el || el.contains(event.target as Node)) {
        return;
      }

      handler(event);
    };

    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);

    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler]);
}