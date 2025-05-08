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
}: {
  messages: TMessage[];
  isLoading: boolean;
  status: "error" | "submitted" | "streaming" | "ready";
  endRef: React.RefObject<HTMLDivElement>;
}) => {

  // Ref for the latest message
  const latestMsgRef = useRef<HTMLDivElement>(null);
  const [spacerHeight, setSpacerHeight] = useState(0);

  useLayoutEffect(() => {
    if (!latestMsgRef.current || !endRef.current) return;
    const latestRect = latestMsgRef.current.getBoundingClientRect();
    const endRect = endRef.current.getBoundingClientRect();
    // Calculate the space needed to push the latest message to the bottom
    const space = endRect.bottom - latestRect.bottom;
    setSpacerHeight(space > 0 ? space : 0);
  }, [messages, endRef]);

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