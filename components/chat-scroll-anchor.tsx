"use client";

import { useInView } from "react-intersection-observer";
import { useAtBottom } from "@/lib/hooks/use-at-bottom";
import { useEffect, type RefObject } from "react";
import React from "react";

interface ChatScrollAnchorProps {
  // FIX: The ref can be null initially, so we allow for that type.
  containerRef: RefObject<HTMLElement | null>;
}

export function ChatScrollAnchor({ containerRef }: ChatScrollAnchorProps) {
  const isAtBottom = useAtBottom(containerRef);
  const { ref, entry, inView } = useInView({
    threshold: 1,
    root: containerRef.current,
  });

  useEffect(() => {
    if (isAtBottom && entry?.target) {
      entry.target.scrollIntoView({
        block: "start",
        behavior: "smooth",
      });
    }
  }, [inView, entry, isAtBottom]);

  return <div ref={ref} className="h-px w-full" />;
}