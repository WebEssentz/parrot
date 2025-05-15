"use client";

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
  selectedModel: string; // This is the "active operation mode" from chat.tsx (defaultModel after onFinish)
  setSelectedModel: (model: string) => void; // This updates chat.tsx's "active operation mode"
}

export const Textarea = ({ 
  input,
  handleInputChange,
  isLoading,
  status,
  stop,
  selectedModel, // Used to know if an operation just finished (became defaultModel)
  setSelectedModel,
}: InputProps) => {
  const [isMobileOrTablet, setIsMobileOrTablet] = React.useState(false);
  React.useEffect(() => {
    const check = () => setIsMobileOrTablet(window.innerWidth < 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const REASON_MODEL_ID = "qwen-qwq-32b";

  // Local visual toggles for the buttons. These are the source of truth for button appearance.
  // They persist until the user clicks them off.
  const [searchToggleIsOn, setSearchToggleIsOn] = React.useState(false);
  const [reasonToggleIsOn, setReasonToggleIsOn] = React.useState(false);

  // This effect runs when the actual "selectedModel" for the operation (from chat.tsx)
  // gets reset to defaultModel (e.g., after onFinish).
  // If we want the toggles to turn off when the operation mode resets, we can do it here.
  // BUT, the requirement is "leave it selected ... until user clicks to unlit".
  // So, this useEffect is NOT needed to change searchToggleIsOn/reasonToggleIsOn based on selectedModel prop.
  // The toggles change ONLY on user click.

  const determineEffectiveModel = (currentSearchState: boolean, currentReasonState: boolean): string => {
    if (currentSearchState) { // If search is on, it's the primary mode for the API call
      return SEARCH_MODE;
    }
    if (currentReasonState) { // If search is off, but reason is on
      return REASON_MODEL_ID;
    }
    return defaultModel; // Both are off
  };

  const handleSetSearchEnabled = (enabled: boolean) => {
    setSearchToggleIsOn(enabled);
    // Update the effective model in chat.tsx based on the new state of BOTH toggles
    setSelectedModel(determineEffectiveModel(enabled, reasonToggleIsOn));
  };

  const handleSetReasonEnabled = (enabled: boolean) => {
    setReasonToggleIsOn(enabled);
    // Update the effective model in chat.tsx based on the new state of BOTH toggles
    setSelectedModel(determineEffectiveModel(searchToggleIsOn, enabled));
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
          disabled={isLoading}
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
        <div style={{paddingBottom: '48px'}}> 
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
                disabled={isLoading}
              />
              <SearchButton 
                isSearchEnabled={searchToggleIsOn} 
                setIsSearchEnabled={handleSetSearchEnabled} 
                disabled={isLoading}
              />
              <ReasonButton 
                isReasonEnabled={reasonToggleIsOn} 
                setIsReasonEnabled={handleSetReasonEnabled} // Corrected: should be setIsReasonEnabled
                hideTextOnMobile 
                disabled={isLoading}
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
                    onClick={status === "streaming" ? stop : undefined}
                    disabled={isLoading}
                    className={`rounded-full flex items-center justify-center transition-colors duration-300 ${
                      isLoading 
                      ? 'bg-zinc-300 dark:bg-white dark:opacity-60 text-zinc-400 dark:text-zinc-500 cursor-not-allowed'
                      : 'bg-black dark:bg-white hover:bg-zinc-800 text-white dark:text-black cursor-pointer'
                    }`}
                    title={status === "streaming" ? "Stop generating" : "Processing..."}
                    style={{ minWidth: 40, minHeight: 40 }}
                  >
                    <PauseIcon size={28} className={`h-6 w-6 transition-colors duration-300 ${
                       isLoading ? 'text-zinc-400 dark:text-zinc-500' : 'text-white dark:text-black'
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