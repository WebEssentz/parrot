// Messages.tsx
import type { Message as TMessage } from "ai";
import { Message } from "./message";
import { useScrollToBottom } from "@/lib/hooks/use-scroll-to-bottom";

// Messages.tsx
export const Messages = ({
  messages,
  isLoading: isOverallLoading, // Renamed for clarity
  status: overallStatus,     // Renamed for clarity
}: {
  messages: TMessage[];
  isLoading: boolean;
  status: "error" | "submitted" | "streaming" | "ready";
  mobileInputHeight?: number;
}) => {
  const [containerRef, endRef] = useScrollToBottom();

  return (
    <div className="relative flex-1">
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto max-w-full py-8 sm:py-10 scrollbar-thin pb-[120px] sm:pb-[80px]"
      >
        <div className="w-full px-2 sm:px-4 sm:max-w-4xl mx-auto pt-8">
          {messages.map((m, i) => {
            const isLatest = i === messages.length - 1;
            let messageStatus: "error" | "submitted" | "streaming" | "ready" = "ready";
            let messageIsLoading = false;

            if (m.role === 'assistant' && isLatest) {
              messageStatus = overallStatus; // The last AI message reflects the overall stream status
              messageIsLoading = isOverallLoading || overallStatus === 'streaming' || overallStatus === 'submitted';
            } else if (m.role === 'user') {
              // User messages are generally 'ready' once displayed
              messageStatus = 'ready';
              messageIsLoading = false;
            }
            // Potentially handle m.error to set status to 'error'

            return (
              <Message
                key={m.id}
                isLatestMessage={isLatest}
                isLoading={messageIsLoading}
                message={m}
                status={messageStatus}
              />
            );
          })}
          <div ref={endRef} />
        </div>
      </div>
    </div>
  );
};