// Messages.tsx
import type { Message as TMessage } from "ai";
import { Message } from "./message";

import { useScrollToBottom } from "@/lib/hooks/use-scroll-to-bottom";
import { ScrollToBottomButton } from "./ui/scrollToBottomButton"; // Corrected path if it's in ./ui/
import { useState, useEffect, useCallback, useRef } from "react"; // Added useRef

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
  // useScrollToBottom typically returns refs for the container and an end-of-list element
  // Let's assume your useScrollToBottom provides the scrollable container ref as the first element.
  // If useScrollToBottom is ONLY for the endRef for auto-scrolling, we need a separate ref for the scrollable container.
  // Based on your current code, containerRef is from useScrollToBottom. Let's assume it's the scrollable div.
  const [scrollContainerRefFromHook, endRef] = useScrollToBottom();
  
  // If scrollContainerRefFromHook is not meant for the scrollable div itself, create a new one:
  const actualScrollContainerRef = useRef<HTMLDivElement>(null);
  // Then use actualScrollContainerRef in the JSX and below. For now, I'll assume scrollContainerRefFromHook IS the scrollable div.
  // If you find that scrollContainerRefFromHook is something else (e.g. the messages wrapper *inside* the scrollable div),
  // then you need to ensure the ref used for scroll detection is on the `overflow-y-auto` element.
  // For clarity, I will rename it to `scrollableContainerRef` to represent the div that has `overflow-y-auto`.
  // If `useScrollToBottom`'s first ref is indeed for this, then `const scrollableContainerRef = scrollContainerRefFromHook;`
  // If not, assign it directly: `const scrollableContainerRef = useRef<HTMLDivElement>(null);` and attach it to the scrolling div.
  // Your current code seems to map `containerRef` (renamed to `scrollableContainerRef` for clarity) to the scrolling div.
  const scrollableContainerRef = scrollContainerRefFromHook; 


  const [showScrollButton, setShowScrollButton] = useState(false);

  const checkIfAtBottom = useCallback(() => {
    const container = scrollableContainerRef.current;
    if (!container) return;

    // Reduce threshold for more immediate appearance.
    // 1px means any scroll up from the very bottom shows the button.
    // 5px gives a tiny bit of leeway but still feels immediate.
    const threshold = 5; // px; significantly reduced from 32px
    
    // Check if scrolled to the bottom
    // scrollTop is 0 at the top.
    // scrollHeight is total scrollable height.
    // clientHeight is visible height.
    // At bottom: scrollTop + clientHeight >= scrollHeight
    // We want to show button if NOT at bottom.
    const atBottom = container.scrollHeight - container.scrollTop - container.clientHeight <= threshold;
    
    setShowScrollButton(!atBottom);
  }, [scrollableContainerRef]);

  useEffect(() => {
    const container = scrollableContainerRef.current;
    if (!container) return;

    // Using { passive: true } is good for performance and generally recommended.
    // It shouldn't delay the event enough to be an issue for this.
    const handleScroll = () => {
      checkIfAtBottom();
    };
    container.addEventListener("scroll", handleScroll, { passive: true });

    // Initial check
    checkIfAtBottom();

    // Check on resize
    window.addEventListener("resize", checkIfAtBottom);

    return () => {
      container.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", checkIfAtBottom);
    };
  }, [scrollableContainerRef, checkIfAtBottom]); // Dependencies are correct

  return (
    <div className="relative flex-1">
      <div
        ref={scrollableContainerRef} // Ensure this ref is on the element with overflow-y-auto
        className="flex-1 overflow-y-auto max-w-full py-8 sm:py-10 scrollbar-thin pb-[120px] sm:pb-[80px]"
      >
        <div className="w-full px-2 sm:px-4 sm:max-w-4xl mx-auto pt-8">
          {messages.map((m, i) => (
            <Message
              key={m.id}
              isLatestMessage={i === messages.length - 1}
              isLoading={isLoading}
              message={m}
              status={status}
            />
          ))}
          <div ref={endRef} /> {/* This endRef is for the auto-scroll hook to target */}
        </div>
      </div>
      <ScrollToBottomButton
        isVisible={showScrollButton}
        onClick={() => {
          // Scroll the scrollableContainerRef to its bottom, where endRef is located.
          // endRef.current?.scrollIntoView should work if endRef is inside scrollableContainerRef.
          endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
          // As a fallback, if the above doesn't work reliably (e.g. if endRef is not a direct child or layout is complex):
          // scrollableContainerRef.current?.scrollTo({ top: scrollableContainerRef.current.scrollHeight, behavior: 'smooth' });
        }}
      />
    </div>
  );
};