import type { Message as TMessage } from "ai";
import { Message } from "./message";
import { useScrollToBottom } from "@/lib/hooks/use-scroll-to-bottom";

export const Messages = ({
  messages,
  isLoading,
  status,
}: {
  messages: TMessage[];
  isLoading: boolean;
  status: "error" | "submitted" | "streaming" | "ready";
}) => {
  const [containerRef, endRef] = useScrollToBottom();
  return (
    <div
      className="flex-1 max-w-full py-8"
      ref={containerRef}
      style={{
        overflowY: typeof window !== 'undefined' && window.innerWidth < 640 ? 'visible' : 'auto',
        WebkitOverflowScrolling: 'touch',
        overflowX: 'hidden',
        scrollbarWidth: typeof window !== 'undefined' && window.innerWidth < 640 ? 'none' : 'thin',
      }}
    >
      <div className="max-w-xl mx-auto pt-8">
        {messages.map((m, i) => (
          <Message
            key={i}
            isLatestMessage={i === messages.length - 1}
            isLoading={isLoading}
            message={m}
            status={status}
          />
        ))}
        <div className="h-1" ref={endRef} />
      </div>
    </div>
  );
};
