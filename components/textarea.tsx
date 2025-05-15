"use client";

// Assuming Textarea as ShadcnTextarea, ReasonButton, SearchButton, AttachButton, SEARCH_MODE are imported from the correct path
// e.g. import { Textarea as ShadcnTextarea, ReasonButton, SearchButton, AttachButton, SEARCH_MODE } from "@/components/ui/textarea";
import { Textarea as ShadcnTextarea, ReasonButton, SearchButton, AttachButton, SEARCH_MODE } from "@/components/ui/textarea";
import { defaultModel } from "@/ai/providers";
import { ArrowUp } from "lucide-react";
import { PauseIcon } from "./icons"; // Assuming this is local ./icons
import React from "react";

interface InputProps {
  input: string;
  handleInputChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  isLoading: boolean; // This is `uiIsLoading` from chat.tsx
  status: 'idle' | 'submitted' | 'streaming' | 'error' | string;
  stop: () => void;
  selectedModel: string;
  setSelectedModel: (model: string) => void;
}

// This component is used as <CustomTextarea ... /> in chat.tsx
export const Textarea = ({ 
  input,
  handleInputChange,
  isLoading, // This prop receives `uiIsLoading` from chat.tsx
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

  // Ensure REASON_MODEL is defined consistently if used, e.g., from a shared constants file or here
  const REASON_MODEL = "qwen-qwq-32b"; 

  const [searchToggle, setSearchToggle] = React.useState(false);
  const [reasonToggle, setReasonToggle] = React.useState(false);

  React.useEffect(() => {
    // This effect ensures that if the parent `selectedModel` changes,
    // the corresponding toggle button's visual state is updated.
    if (selectedModel === REASON_MODEL) {
      if (!reasonToggle) setReasonToggle(true);
      // if (searchToggle) setSearchToggle(false); // Decide if modes are exclusive visually
    } else if (selectedModel === SEARCH_MODE) {
      if (!searchToggle) setSearchToggle(true);
      // if (reasonToggle) setReasonToggle(false); // Decide if modes are exclusive visually
    } else { // defaultModel or other
      if (searchToggle) setSearchToggle(false);
      if (reasonToggle) setReasonToggle(false);
    }
  }, [selectedModel]); // Only depends on selectedModel from parent

  const handleSetSearchEnabled = (enabled: boolean) => {
    // This function is called by SearchButton onClick
    // It updates the local toggle state AND calls setSelectedModel (prop from chat.tsx)
    setSearchToggle(enabled);
    if (enabled) {
      setSelectedModel(SEARCH_MODE);
      if (reasonToggle) setReasonToggle(false); // If search is on, reason is off
    } else {
      // If search is being turned off, revert to default or reason if it was on
      // This logic might need adjustment based on desired interaction for combined modes
      setSelectedModel(reasonToggle ? REASON_MODEL : defaultModel);
    }
  };

  const handleSetReasonEnabled = (enabled: boolean) => {
    setReasonToggle(enabled);
    if (enabled) {
      setSelectedModel(REASON_MODEL);
      if (searchToggle) setSearchToggle(false); // If reason is on, search is off
    } else {
      setSelectedModel(searchToggle ? SEARCH_MODE : defaultModel);
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
          disabled={isLoading} // Disable textarea itself when loading
          onKeyDown={(e) => {
            if (isMobileOrTablet) return;
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (input.trim() && !isLoading) {
                const form = (e.target as HTMLElement).closest("form");
                if (form) form.requestSubmit();
              }
            }
          }}
        />

        <div style={{paddingBottom: '48px'}}> {/* Placeholder for buttons area height */}
          {/* This empty div might be for layout spacing; ensure it's intentional */}
        </div>

        <div className="bg-primary-surface-primary absolute start-3 end-0 bottom-3 z-2 flex items-center">
          <div className="w-full">
            <div
              data-testid="composer-footer-actions"
              className="flex items-center max-xs:gap-1 gap-2 overflow-x-auto [scrollbar-width:none]"
              style={{ marginRight: 98 }} 
            >
              <AttachButton 
                onClick={() => console.log('Attach button clicked')} 
                disabled={isLoading} // Disable AttachButton when loading
              />
              <SearchButton 
                isSearchEnabled={searchToggle} 
                setIsSearchEnabled={handleSetSearchEnabled} 
                disabled={isLoading} // Disable SearchButton when loading
              />
              <ReasonButton 
                isReasonEnabled={reasonToggle} 
                setIsReasonEnabled={handleSetReasonEnabled} 
                hideTextOnMobile 
                disabled={isLoading} // Disable ReasonButton when loading
              />
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
                    onClick={status === "streaming" ? stop : undefined} // Stop only if actively streaming
                    disabled={status === "submitted" && !isLoading} // Disable if submitted but not actively loading (e.g. waiting for stream start)
                                                                // Or simply rely on isLoading which covers both 'submitted' and 'streaming'
                    className={`rounded-full flex items-center justify-center transition-colors duration-300 ${
                      (status === "submitted" && !isLoading) || isLoading // Broader condition for disabled appearance for stop button
                      ? 'bg-zinc-300 dark:bg-white dark:opacity-60 text-zinc-400 dark:text-zinc-500 cursor-not-allowed'
                      : 'bg-black dark:bg-white hover:bg-zinc-800 text-white dark:text-black cursor-pointer'
                    }`}
                    title={status === "streaming" ? "Stop generating" : "Processing..."}
                    style={{ minWidth: 40, minHeight: 40 }}
                  >
                    <PauseIcon size={28} className={`h-6 w-6 transition-colors duration-300 ${
                       (status === "submitted" && !isLoading) || isLoading ? 'text-zinc-400 dark:text-zinc-500' : 'text-white dark:text-black'
                    }`} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};