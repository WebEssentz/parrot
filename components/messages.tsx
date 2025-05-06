// Messages.tsx
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
  mobileInputHeight?: number; // Keep if used elsewhere
}) => {
  const [containerRef, endRef] = useScrollToBottom();

  return (
    <div
      ref={containerRef}
      // Increased vertical padding slightly, adjust pb-[value] if input area overlaps too much
      className="flex-1 overflow-y-auto max-w-full py-8 sm:py-10 scrollbar-thin pb-[120px] sm:pb-[80px]"
    >
      {/* Increased max-width from sm:max-w-3xl (or 4xl) to sm:max-w-4xl or 5xl */}
      {/* Let's try 4xl first, adjust to 5xl if you want even wider */}
      <div className="w-full px-2 sm:px-4 sm:max-w-4xl mx-auto pt-8"> {/* Adjust max-width here */}
        {messages.map((m, i) => (
          <Message
            key={m.id} // Use message id for key
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