// textarea.tsx
"use client";

import { Textarea as ShadcnTextarea, ReasonButton, SearchButton, AttachButton, SEARCH_MODE } from "@/components/ui/textarea";
import { defaultModel } from "@/ai/providers";
import { ArrowUp } from "lucide-react";
import { PauseIcon } from "./icons";
import React from "react";

interface InputProps {
  input: string;
  handleInputChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  setInput: (value: string) => void;
  isLoading: boolean;
  status: 'idle' | 'submitted' | 'streaming' | 'error' | string;
  stop: () => void;
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  hasSentMessage: boolean;
  isDesktop: boolean;
}

export const Textarea = ({ 
  input,
  handleInputChange,
  setInput,
  isLoading,
  status,
  stop,
  selectedModel,
  setSelectedModel,
  hasSentMessage,
  isDesktop,
}: InputProps) => {
  const [searchToggleIsOn, setSearchToggleIsOn] = React.useState(false);
  const [reasonToggleIsOn, setReasonToggleIsOn] = React.useState(false);

  const [staticPlaceholderAnimatesOut, setStaticPlaceholderAnimatesOut] = React.useState(false);
  const [suggestedPrompts, setSuggestedPrompts] = React.useState<string[]>([]);
  const [currentPromptIndex, setCurrentPromptIndex] = React.useState(0);
  const [showAnimatedSuggestions, setShowAnimatedSuggestions] = React.useState(false);
  
  // New state to track if Tab-to-accept should be active for suggestions
  const [isTabToAcceptEnabled, setIsTabToAcceptEnabled] = React.useState(true);


  const REASON_MODEL_ID = "qwen-qwq-32b";
  const featureActive = isDesktop && !hasSentMessage;

  React.useEffect(() => {
    if (featureActive) {
      const fetchPrompts = async () => {
        try {
          const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'getSuggestedPrompts' }),
          });
          if (!response.ok) throw new Error('Failed to fetch prompts');
          const data = await response.json();
          setSuggestedPrompts(data.prompts && data.prompts.length > 0 ? data.prompts : []);
        } catch (error) {
          console.error("Error fetching suggested prompts:", error);
          setSuggestedPrompts([]);
        }
      };
      fetchPrompts();
    } else {
      setSuggestedPrompts([]);
      setShowAnimatedSuggestions(false);
      setStaticPlaceholderAnimatesOut(false);
      setIsTabToAcceptEnabled(true); // Reset on feature becoming inactive
    }
  }, [featureActive]);

  React.useEffect(() => {
    let fadeOutTimer: NodeJS.Timeout | undefined;
    let showSuggestionsTimer: NodeJS.Timeout | undefined;

    // If the input is empty AND the feature is active AND we have prompts,
    // then we can consider showing suggestions and enabling Tab-to-accept.
    if (featureActive && !input && suggestedPrompts.length > 0) {
      setIsTabToAcceptEnabled(true); // Re-enable Tab-to-accept when input is cleared
      setStaticPlaceholderAnimatesOut(false);
      setShowAnimatedSuggestions(false);

      fadeOutTimer = setTimeout(() => {
        if (featureActive && !input) setStaticPlaceholderAnimatesOut(true);
      }, 1000);

      showSuggestionsTimer = setTimeout(() => {
        if (featureActive && !input) {
          setShowAnimatedSuggestions(true);
          setCurrentPromptIndex(0);
        }
      }, 1300);
    } else {
      // If input is not empty, or feature inactive, or no prompts
      setStaticPlaceholderAnimatesOut(false);
      setShowAnimatedSuggestions(false);
      // If there's input, disable Tab-to-accept for new suggestions.
      // It will be re-enabled when input is cleared (handled by the `!input` condition above).
      if (input) {
          setIsTabToAcceptEnabled(false);
      }
    }

    return () => {
      clearTimeout(fadeOutTimer);
      clearTimeout(showSuggestionsTimer);
    };
  }, [featureActive, input, suggestedPrompts.length]);


  React.useEffect(() => {
    let promptInterval: NodeJS.Timeout | undefined;
    // Only cycle prompts if Tab-to-accept is enabled (i.e., input is empty)
    if (showAnimatedSuggestions && suggestedPrompts.length > 0 && isTabToAcceptEnabled && featureActive) {
      promptInterval = setInterval(() => {
        setCurrentPromptIndex(prevIndex => (prevIndex + 1) % suggestedPrompts.length);
      }, 2000);
    }
    return () => clearInterval(promptInterval);
  }, [showAnimatedSuggestions, suggestedPrompts.length, isTabToAcceptEnabled, featureActive]); // Add isTabToAcceptEnabled

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Tab-to-accept logic:
    // - Feature must be active
    // - Animated suggestions must be showing
    // - There must be suggested prompts
    // - CRITICAL: Tab-to-accept must be enabled (which implies input is empty)
    // - Key pressed must be "Tab"
    if (featureActive && showAnimatedSuggestions && suggestedPrompts.length > 0 && isTabToAcceptEnabled && e.key === "Tab") {
      e.preventDefault();
      const currentDynamicPromptText = suggestedPrompts[currentPromptIndex];
      if (currentDynamicPromptText) {
        setInput(currentDynamicPromptText); // This will trigger the useEffect that depends on `input`
        setShowAnimatedSuggestions(false);  // Hide suggestions immediately
        setIsTabToAcceptEnabled(false);     // Disable Tab-to-accept until input is cleared
      }
      return; // Important: return to not process Enter key logic if Tab was handled
    }
    
    // If user starts typing (and Tab wasn't just pressed to accept a suggestion),
    // disable Tab-to-accept. This is also handled by the useEffect on `input`,
    // but can be set here for immediate effect upon typing.
    if (e.key !== "Tab" && input.length === 0 && e.key.length === 1) { // Heuristic for actual typing
        setIsTabToAcceptEnabled(false);
    }


    // Existing Enter key logic (only for desktop, as per original code)
    if (isDesktop && e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() && !isLoading) {
        const form = (e.target as HTMLElement).closest("form");
        if (form) form.requestSubmit();
      }
    }
  };
  
  const determineEffectiveModel = (currentSearchState: boolean, currentReasonState: boolean): string => {
    if (currentSearchState) return SEARCH_MODE;
    if (currentReasonState) return REASON_MODEL_ID;
    return defaultModel;
  };

  const handleSetSearchEnabled = (enabled: boolean) => {
    setSearchToggleIsOn(enabled);
    setSelectedModel(determineEffectiveModel(enabled, reasonToggleIsOn));
  };

  const handleSetReasonEnabled = (enabled: boolean) => {
    setReasonToggleIsOn(enabled);
    setSelectedModel(determineEffectiveModel(searchToggleIsOn, enabled));
  };

  // Show custom placeholder elements ONLY if input is empty
  const shouldShowCustomPlaceholderElements = featureActive && !input && suggestedPrompts.length > 0;
  const shadcnTextareaNativePlaceholder = shouldShowCustomPlaceholderElements ? "" : "Ask Atlas...";
  const currentDynamicPromptText = showAnimatedSuggestions && suggestedPrompts.length > 0 
    ? suggestedPrompts[currentPromptIndex] 
    : null;
  
  // Determine if the "TAB" badge should be visible
  // It should only be visible if suggestions are shown AND Tab-to-accept is currently enabled.
  const showTabBadge = showAnimatedSuggestions && isTabToAcceptEnabled;

  return (
    <div className="relative flex w-full items-end px-3 py-3">
      <div className="relative flex w-full flex-auto flex-col max-h-[320px] overflow-y-auto rounded-3xl border-2 border-zinc-200 dark:border-zinc-700 shadow-lg bg-transparent dark:bg-transparent">
        
        {shouldShowCustomPlaceholderElements && (
          <div 
              className="absolute top-0 left-0 right-0 flex items-center pointer-events-none pl-4 pr-4 pt-3 z-10"
              style={{ height: '40px' }}
          >
              <div
                  className={`text-zinc-500 dark:text-zinc-400 text-base absolute transition-all duration-300 ease-in-out ${
                      staticPlaceholderAnimatesOut ? 'opacity-0 -translate-y-3' : 'opacity-100 translate-y-0'
                  }`}
              >
                  Ask Atlas...
              </div>

              {currentDynamicPromptText && (
                   <div 
                      className={`flex items-center justify-between w-full transition-opacity duration-300 ease-in-out ${
                          showAnimatedSuggestions ? 'opacity-100' : 'opacity-0'
                      }`}
                    >
                      <span className="text-zinc-500 dark:text-zinc-400 text-md truncate">
                          {currentDynamicPromptText}
                      </span>
                      {/* Conditionally render TAB badge */}
                      {showTabBadge && (
                        <span 
                          className="ml-1.5 flex-shrink-0 text-[10px] leading-tight text-zinc-400 dark:text-zinc-500 border border-zinc-300 dark:border-zinc-600 rounded-sm px-1 py-[1px] bg-transparent"
                        >
                            TAB
                        </span>
                      )}
                   </div>
              )}
          </div>
        )}

        <ShadcnTextarea 
          className="resize-none bg-transparent dark:bg-transparent w-full rounded-3xl pr-12 pt-3 pb-4 text-base md:text-base font-normal min-h-[40px] max-h-52 placeholder:text-base md:placeholder:text-base placeholder:pl-1 flex-1 border-none shadow-none focus-visible:ring-0 focus-visible:border-none transition-[min-height] duration-200"
          value={input}
          autoFocus
          placeholder={shadcnTextareaNativePlaceholder}
          style={{ minHeight: 40, maxHeight: 208 }}
          onChange={(e) => {
            handleInputChange(e); // Call original handler
            // If user is typing, immediately disable Tab-to-accept
            // (useEffect on `input` will also catch this, but this is more immediate)
            if (e.target.value) {
                setIsTabToAcceptEnabled(false);
            } else {
                // If user clears the input, re-enable tab-to-accept
                // This will also be caught by the useEffect on `input`
                setIsTabToAcceptEnabled(true); 
            }
          }}
          disabled={isLoading}
          onKeyDown={handleKeyDown}
        />
        
        <div style={{paddingBottom: '48px'}} />
        
        <div className="bg-primary-surface-primary absolute start-3 end-0 bottom-3 z-20 flex items-center">
          <div className="w-full">
            <div
              data-testid="composer-footer-actions"
              className="flex items-center max-xs:gap-1 gap-2 overflow-x-auto [scrollbar-width:none]"
              style={{ marginRight: 98 }} 
            >
              <AttachButton onClick={() => console.log('Attach button clicked')} disabled={isLoading} />
              <SearchButton isSearchEnabled={searchToggleIsOn} setIsSearchEnabled={handleSetSearchEnabled} disabled={isLoading} />
              <ReasonButton isReasonEnabled={reasonToggleIsOn} setIsReasonEnabled={handleSetReasonEnabled} hideTextOnMobile disabled={isLoading} />
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
                    aria-label="Send" data-testid="composer-button-send" style={{ minWidth: 36, minHeight: 36, padding: 0 }}
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
                    title={status === "streaming" ? "Stop generating" : "Processing..."} style={{ minWidth: 40, minHeight: 40 }}
                  >
                    <PauseIcon size={28} className={`h-6 w-6 transition-colors duration-300 ${ isLoading ? 'text-zinc-400 dark:text-zinc-500' : 'text-white dark:text-black' }`} />
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