import type { Message as TMessage } from "ai";
import { Message } from "./message";
import { useScrollToBottom } from "@/lib/hooks/use-scroll-to-bottom";

export const Messages = ({
  messages,
  isLoading,
  status,
  mobileInputHeight = 72, // default mobile input height in px
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
      className="
        flex-1 overflow-y-auto max-w-full py-8
        scrollbar-thin
      "
      style={{
        WebkitOverflowScrolling: "touch",
        overflowX: "hidden",
        // Add a bit more bottom padding on mobile to move messages slightly up from the form
        paddingBottom: typeof window !== "undefined" && window.innerWidth < 640 ? `${mobileInputHeight + 48}px` : `${mobileInputHeight + 32}px`,
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
        <div ref={endRef} />
      </div>
    </div>
  );
};