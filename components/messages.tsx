// src/components/messages.tsx
import type { Message as TMessage } from "ai";
import { Message } from "./message";
import { useRef, useLayoutEffect, useState } from "react";
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

  // Scroll latest message just below the header when messages change
  useLayoutEffect(() => {
    if (!latestMsgRef.current) return;
    const latestRect = latestMsgRef.current.getBoundingClientRect();
    const container = latestMsgRef.current.closest('.overflow-y-auto');
    if (!container) return;
    const containerRect = container.getBoundingClientRect();
    const offset = latestRect.top - containerRect.top - headerHeight;
    // Only scroll if the latest message is not already at the right position (tolerance 2px)
    if (Math.abs(offset) > 2) {
      container.scrollBy({ top: offset, behavior: 'smooth' });
    }
  }, [messages, headerHeight]);

  return (
    <div className="flex-1 max-w-full py-8 sm:py-10">
      <div className="w-full px-2 sm:px-4 sm:max-w-4xl mx-auto pt-8">
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