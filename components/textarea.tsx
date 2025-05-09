import { Textarea as ShadcnTextarea, ReasonButton, SearchButton, AttachButton } from "@/components/ui/textarea";
import { ArrowUp } from "lucide-react";
import { PauseIcon } from "./icons";
import React from "react";

interface InputProps {
  input: string;
  handleInputChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  isLoading: boolean;
  status: 'idle' | 'submitted' | 'streaming' | 'error' | string;
  stop: () => void;
  selectedModel: string;
  setSelectedModel: (model: string) => void;
}

export const Textarea = ({ // Consider renaming this component if Textarea.tsx is also your UI definition
  input,
  handleInputChange,
  isLoading,
  status,
  stop,
  selectedModel,
  setSelectedModel,
}: InputProps) => {
  const [isMobileOrTablet, setIsMobileOrTablet] = React.useState(false);
  React.useEffect(() => {
    const check = () => setIsMobileOrTablet(window.innerWidth < 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // --- Sizing & Positioning Constants ---
  const buttonsVerticalOffset = "bottom-3"; // 12px from the bottom edge of the outer shell
  // Width for the send button area on the right (button 36px + gap)
  const sendButtonAreaWidthPx = 52;

  return (
    <div className="relative flex w-full items-end px-3 py-3">
      <div className="relative flex w-full flex-auto flex-col max-h-[320px] overflow-y-auto rounded-3xl border-2 border-zinc-200 dark:border-zinc-700 shadow-lg bg-transparent dark:bg-transparent">
        {/* Textarea fills container, no scroll on textarea itself */}
        <ShadcnTextarea
          className="resize-none bg-transparent dark:bg-transparent w-full rounded-3xl pr-12 pt-3 pb-4 text-base md:text-base font-normal min-h-[40px] max-h-52 placeholder:text-base md:placeholder:text-base placeholder:pl-1 flex-1 border-none shadow-none focus-visible:ring-0 focus-visible:border-none transition-[min-height] duration-200"
          value={input}
          autoFocus
          placeholder={"Ask Parrot..."}
          // maxLength removed to allow unlimited input
          style={{ minHeight: 40, maxHeight: 208 }}
          onChange={handleInputChange}
          onKeyDown={(e) => {
            if (isMobileOrTablet) return;
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (input.trim() && !isLoading) {
                // @ts-expect-error err
                const form = e.target.closest("form");
                if (form) form.requestSubmit();
              }
            }
          }}
        />

      <div>
        {/* Action bar */}
        <div className="justify-content-end relative ms-2 flex w-full flex-auto flex-col">
          <div className="flex-auto"></div>
        </div>
        <div style={{ height: 48 }}></div>
      </div>
      {/* Action bar overlays bottom */}
      <div className="bg-primary-surface-primary absolute start-3 end-0 bottom-3 z-2 flex items-center">
        <div className="w-full">
          <div
            data-testid="composer-footer-actions"
            className="flex items-center max-xs:gap-1 gap-2 overflow-x-auto [scrollbar-width:none]"
            style={{ marginRight: 98 }}
          >
            <AttachButton onClick={() => console.log('Attach button clicked')} />
            <SearchButton selectedModel={selectedModel} setSelectedModel={setSelectedModel} />
            <ReasonButton selectedModel={selectedModel} setSelectedModel={setSelectedModel} hideTextOnMobile />
          </div>
          {/* Send/Stop Button */}
          <div className="absolute end-3 bottom-0 flex items-center gap-2">
            <div className="ms-auto flex items-center gap-1.5">
              {status !== "streaming" && status !== "submitted" && (
                <button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className={`rounded-full flex items-center justify-center transition-colors duration-300 ${
                    isLoading || !input.trim()
                      ? 'bg-zinc-300 dark:bg-white dark:opacity-60 text-zinc-400 dark:text-zinc-500 cursor-not-allowed'
                      : 'dark:bg-white dark:text-black bg-black hover:bg-zinc-800 text-white'
                  }`}
                  aria-label="Send"
                  data-testid="composer-button-send"
                  style={{ minWidth: 36, minHeight: 36, padding: 0 }}
                >
                  <ArrowUp className="h-5 w-5 transition-colors duration-300 mx-auto my-auto" />
                </button>
              )}
              {status === "streaming" && (
                <button
                  type="button"
                  onClick={stop}
                  className="rounded-full flex items-center justify-center bg-black dark:bg-white hover:bg-zinc-800 disabled:bg-zinc-300 disabled:cursor-not-allowed transition-colors"
                  title="Stop generating"
                  style={{ minWidth: 40, minHeight: 40 }}
                >
                  <PauseIcon size={28} className="h-6 w-6 text-white dark:text-black cursor-pointer" />
                </button>
              )}
              {status === "submitted" && (
                <button
                  type="button"
                  disabled
                  className="rounded-full flex items-center justify-center bg-zinc-300 dark:bg-white dark:opacity-60 text-zinc-400 dark:text-zinc-500 transition-colors cursor-not-allowed"
                  style={{ minWidth: 40, minHeight: 40 }}
                >
                  <PauseIcon size={28} className="h-6 w-6 text-zinc-400 dark:text-zinc-500 cursor-not-allowed" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="absolute start-4 top-3 ms-[1px] flex items-center pb-px"></div>
      <div className="w-full"></div>
      </div>
      </div>
  );
};