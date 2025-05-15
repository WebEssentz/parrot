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

  const REASON_MODEL = "qwen-qwq-32b";

  const [searchToggle, setSearchToggle] = React.useState(false);
  const [reasonToggle, setReasonToggle] = React.useState(false);

  React.useEffect(() => {
    // This effect ensures that if the parent sets a specific model,
    // the corresponding toggle lights up. It does NOT turn toggles off
    // to respect the user's persisted choice ("only user unlits").
    if (selectedModel === REASON_MODEL) {
      if (!reasonToggle) {
        setReasonToggle(true);
      }
      // REMOVED: if (searchToggle) setSearchToggle(false);
      // This removal ensures that if selectedModel becomes REASON_MODEL,
      // the searchToggle (if previously on) remains on, preserving its lit state.
    } else if (selectedModel === SEARCH_MODE) {
      if (!searchToggle) {
        setSearchToggle(true);
      }
    }
    // If selectedModel is defaultModel or any other unhandled value,
    // the toggles (searchToggle, reasonToggle) maintain their current state (persist).
  }, [selectedModel]); // Only re-run if the selectedModel prop from parent changes.

  const handleSetSearchEnabled = (enabled: boolean) => {
    setSearchToggle(enabled);
    if (enabled) {
      setSelectedModel(SEARCH_MODE);
    } else {
      if (reasonToggle) {
        setSelectedModel(REASON_MODEL);
      } else {
        setSelectedModel(defaultModel);
      }
    }
  };

  const handleSetReasonEnabled = (enabled: boolean) => {
    setReasonToggle(enabled);
    if (enabled) {
      if (searchToggle) {
        setSelectedModel(SEARCH_MODE); // "search + reason" mode
      } else {
        setSelectedModel(REASON_MODEL);
      }
    } else {
      if (searchToggle) {
        setSelectedModel(SEARCH_MODE); // "search only" mode
      } else {
        setSelectedModel(defaultModel);
      }
    }
  };

  return (
    <div className="relative flex w-full items-end px-3 py-3">
      <div className="relative flex w-full flex-auto flex-col max-h-[320px] overflow-y-auto rounded-3xl border-2 border-zinc-200 dark:border-zinc-700 shadow-lg bg-transparent dark:bg-transparent">
        <ShadcnTextarea
          className="resize-none bg-transparent dark:bg-transparent w-full rounded-3xl pr-12 pt-3 pb-4 text-base md:text-base font-normal min-h-[40px] max-h-52 placeholder:text-base md:placeholder:text-base placeholder:pl-1 flex-1 border-none shadow-none focus-visible:ring-0 focus-visible:border-none transition-[min-height] duration-200"
          value={input}
          autoFocus
          placeholder={"Ask Atlas..."}
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
          <div className="justify-content-end relative ms-2 flex w-full flex-auto flex-col">
            <div className="flex-auto"></div>
          </div>
          <div style={{ height: 48 }}></div>
        </div>
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
            <div className="absolute end-3 bottom-0 flex items-center gap-2">
              <div className="ms-auto flex items-center gap-1.5">
                {status !== "streaming" && status !== "submitted" && (
                  <button
                    type="submit"
                    disabled={isLoading || !input.trim()}
                    className={`rounded-full flex items-center justify-center transition-colors duration-300 ${
                      isLoading || !input.trim()
                        ? 'bg-zinc-300 dark:bg-white dark:opacity-60 text-zinc-400 dark:text-zinc-500 cursor-not-allowed'
                        : 'dark:bg-white dark:text-black bg-black hover:bg-zinc-800 text-white cursor-pointer'
                    }`}
                    aria-label="Send"
                    data-testid="composer-button-send"
                    style={{ minWidth: 36, minHeight: 36, padding: 0 }}
                  >
                    <ArrowUp className="h-5 w-5 transition-colors duration-300 mx-auto my-auto" />
                  </button>
                )}
                {(status === "streaming" || status === "submitted") && (
                  <button
                    type="button"
                    onClick={status === "streaming" ? stop : undefined}
                    disabled={status === "submitted"}
                    className={`rounded-full flex items-center justify-center transition-colors duration-300 ${
                      status === "submitted"
                      ? 'bg-zinc-300 dark:bg-white dark:opacity-60 text-zinc-400 dark:text-zinc-500 cursor-not-allowed'
                      : 'bg-black dark:bg-white hover:bg-zinc-800 text-white dark:text-black cursor-pointer'
                    }`}
                    title={status === "streaming" ? "Stop generating" : "Processing..."}
                    style={{ minWidth: 40, minHeight: 40 }}
                  >
                    <PauseIcon size={28} className={`h-6 w-6 transition-colors duration-300 ${
                       status === "submitted" ? 'text-zinc-400 dark:text-zinc-500' : 'text-white dark:text-black'
                    }`} />
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