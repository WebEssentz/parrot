// src/components/messages.tsx
import type { Message as TMessage } from "ai";
import { Message } from "./message";
import { useRef, useLayoutEffect, useState, useEffect } from "react";
// No need for useScrollToBottom here; handled in Chat


export const Messages = ({
  messages,
  isLoading,
  status,
  endRef,
  headerHeight = 0,
}: {
  messages: TMessage[];
  isLoading: boolean;
  status: "error" | "submitted" | "streaming" | "ready";
  endRef: React.RefObject<HTMLDivElement>;
  headerHeight?: number;
}) => {
  // Ref for the latest message
  const latestMsgRef = useRef<HTMLDivElement>(null);
  // Ref for the scrollable container
  const containerRef = useRef<HTMLDivElement>(null);
  // Track if user is at the bottom
  const [isUserAtBottom, setIsUserAtBottom] = useState(true);

  // Handler to check if user is at the bottom
  const handleScroll = () => {
    const container = containerRef.current;
    if (!container) return;
    // Allow 2px tolerance
    const atBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 2;
    setIsUserAtBottom(atBottom);
  };

  // Scroll latest message just below the header when messages change
  useLayoutEffect(() => {
    // Only auto-scroll if user is at bottom or not streaming
    if (!latestMsgRef.current) return;
    const container = containerRef.current || latestMsgRef.current.closest('.overflow-y-auto');
    if (!container) return;
    // Only scroll if user is at bottom or not streaming
    if (isUserAtBottom || (status !== 'streaming' && status !== 'submitted')) {
      const latestRect = latestMsgRef.current.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const offset = latestRect.top - containerRect.top - headerHeight;
      if (Math.abs(offset) > 2) {
        container.scrollBy({ top: offset, behavior: 'smooth' });
      }
    }
  }, [messages, headerHeight, isUserAtBottom, status]);

  // When streaming ends, auto-scroll to bottom if user was at bottom before
  useEffect(() => {
    if ((status === 'ready' || status === 'error') && isUserAtBottom && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [status, isUserAtBottom]);

  const hasMessages = messages.length > 0;
  // Check if desktop (match logic in Chat)
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  return (
    <div
      className="flex-1 max-w-full py-8 sm:py-10 overflow-y-auto overscroll-auto"
      ref={containerRef}
      onScroll={handleScroll}
      style={{ position: 'relative' }}
    >
      <div className="w-full px-2 sm:px-4 sm:max-w-3xl mx-auto pt-8">
        {messages.map((m, i) => {
          const isLatest = i === messages.length - 1;
          let messageStatus: "error" | "submitted" | "streaming" | "ready" = "ready";
          let messageIsLoading = false;

          if (m.role === "assistant" && isLatest) {
            messageStatus = status;
            messageIsLoading = isLoading || status === "streaming" || status === "submitted";
          } else if (m.role === "user") {
            messageStatus = "ready";
            messageIsLoading = false;
          }
          return (
            <div
              key={m.id}
              ref={isLatest ? latestMsgRef : undefined}
              data-latest-message={isLatest ? "true" : undefined}
            >
              <Message
                isLatestMessage={isLatest}
                isLoading={messageIsLoading}
                message={m}
                status={messageStatus}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};