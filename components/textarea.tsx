import { Textarea as ShadcnTextarea, ReasonButton, SearchButton, AttachButton, SEARCH_MODE } from "@/components/ui/textarea";
import { defaultModel } from "@/ai/providers";
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



export const Textarea = ({
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

  // --- New state for independent toggles, but sync with selectedModel ---
  // Use the same SEARCH_MODE and REASON_MODEL as in ui/textarea.tsx
  const REASON_MODEL = "deepseek-r1-distill-llama-70b";
  // Model selection logic:
  // - defaultModel: nothing selected
  // - SEARCH_MODE: search or search+reason (always SEARCH_MODE when search is enabled)
  // - REASON_MODEL: only reason
  // Both toggles can be on independently, and can be toggled off independently
  const [searchToggle, setSearchToggle] = React.useState(false);
  const [reasonToggle, setReasonToggle] = React.useState(false);

  // Sync toggles with selectedModel, but do NOT auto-unlit after message send
  // Only user actions change toggle state
  // If parent sets model to REASON_MODEL after SEARCH_MODE, and both toggles were on, keep both toggles lit
  const prevToggles = React.useRef<{search: boolean, reason: boolean}>({search: false, reason: false});
  React.useEffect(() => {
    if (selectedModel === defaultModel) {
      setSearchToggle(false);
      setReasonToggle(false);
    } else if (selectedModel === REASON_MODEL) {
      // If both toggles were previously on, keep both lit
      if (prevToggles.current.search && prevToggles.current.reason) {
        setSearchToggle(true);
        setReasonToggle(true);
      }
      // Otherwise, do not change toggles (user controls them)
    }
    // Always update prevToggles after each effect run
    prevToggles.current = {search: searchToggle, reason: reasonToggle};
  }, [selectedModel]);

  // Handlers: allow both toggles to be on, and toggled off independently
  const handleSetSearchEnabled = (enabled: boolean) => {
    if (enabled) {
      if (reasonToggle) {
        setSearchToggle(true);
        // Both on now
        // If reason is already on, both should be on
        setSelectedModel(SEARCH_MODE);
      } else {
        setSearchToggle(true);
        setSelectedModel(SEARCH_MODE);
      }
    } else {
      if (reasonToggle) {
        setSearchToggle(false);
        setSelectedModel(REASON_MODEL);
      } else {
        setSearchToggle(false);
        setSelectedModel(defaultModel);
      }
    }
  };
  const handleSetReasonEnabled = (enabled: boolean) => {
    if (enabled) {
      if (searchToggle) {
        setReasonToggle(true);
        // Both on now
        // If search is already on, both should be on
        setSelectedModel(SEARCH_MODE);
      } else {
        setReasonToggle(true);
        setSelectedModel(REASON_MODEL);
      }
    } else {
      if (searchToggle) {
        setReasonToggle(false);
        setSelectedModel(SEARCH_MODE);
      } else {
        setReasonToggle(false);
        setSelectedModel(defaultModel);
      }
    }
  };

  return (
    <div className="relative flex w-full items-end px-3 py-3">
      <div className="relative flex w-full flex-auto flex-col max-h-[320px] overflow-y-auto rounded-3xl border-2 border-zinc-200 dark:border-zinc-700 shadow-lg bg-transparent dark:bg-transparent -mt-3">
        {/* Textarea fills container, no scroll on textarea itself */}
        <ShadcnTextarea
          className="resize-none bg-transparent dark:bg-transparent w-full rounded-3xl pr-12 pt-3 pb-4 text-base md:text-base font-normal min-h-[40px] max-h-52 placeholder:text-base md:placeholder:text-base placeholder:pl-1 flex-1 border-none shadow-none focus-visible:ring-0 focus-visible:border-none transition-[min-height] duration-200"
          value={input}
          autoFocus
          placeholder={"Ask Atlas..."}
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
            <SearchButton isSearchEnabled={searchToggle} setIsSearchEnabled={handleSetSearchEnabled} />
            <ReasonButton isReasonEnabled={reasonToggle} setIsReasonEnabled={handleSetReasonEnabled} hideTextOnMobile />
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
                      : 'dark:bg-white dark:text-[#171717] bg-[#171717] hover:bg-zinc-800 text-white cursor-pointer'
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
                  className="rounded-full flex items-center justify-center bg-[#171717] dark:bg-white hover:bg-zinc-800 disabled:bg-zinc-300 disabled:cursor-not-allowed transition-colors"
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