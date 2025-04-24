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
  mobileInputHeight?: number;
}) => {
  const [containerRef, endRef] = useScrollToBottom();

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto max-w-full py-8 scrollbar-thin pb-[120px] sm:pb-[80px]"
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
        <div ref={endRef} />
      </div>
    </div>
  );
};