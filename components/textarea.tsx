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
  const [previousPromptIndex, setPreviousPromptIndex] = React.useState<number | null>(null); // To manage initial animation direction
  const [showAnimatedSuggestions, setShowAnimatedSuggestions] = React.useState(false); // Controls visibility of the suggestion area
  const [isTabToAcceptEnabled, setIsTabToAcceptEnabled] = React.useState(true);
  const [promptVisible, setPromptVisible] = React.useState(false); // Controls animation of individual prompts

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
      setIsTabToAcceptEnabled(true);
      setPromptVisible(false);
      setPreviousPromptIndex(null);
    }
  }, [featureActive]);

  React.useEffect(() => {
    let fadeOutTimer: NodeJS.Timeout | undefined;
    let showSuggestionsTimer: NodeJS.Timeout | undefined;

    if (featureActive && !input && suggestedPrompts.length > 0) {
      setIsTabToAcceptEnabled(true);
      setStaticPlaceholderAnimatesOut(false);
      setShowAnimatedSuggestions(false); 
      setPromptVisible(false);         

      fadeOutTimer = setTimeout(() => {
        if (featureActive && !input) setStaticPlaceholderAnimatesOut(true);
      }, 700); 

      showSuggestionsTimer = setTimeout(() => {
        if (featureActive && !input) {
          setShowAnimatedSuggestions(true); 
          setCurrentPromptIndex(0);
          setPreviousPromptIndex(null); 
          // Delay making the first prompt visible slightly to allow "Ask Atlas" to clear
          setTimeout(() => setPromptVisible(true), 50); // Small delay
        }
      }, 1000); // Start suggestions slightly after "Ask Atlas" is gone (700ms + 300ms animation)
    } else {
      setStaticPlaceholderAnimatesOut(false);
      setShowAnimatedSuggestions(false);
      setPromptVisible(false);
      if (input) setIsTabToAcceptEnabled(false);
    }

    return () => {
      clearTimeout(fadeOutTimer);
      clearTimeout(showSuggestionsTimer);
    };
  }, [featureActive, input, suggestedPrompts.length]);

  React.useEffect(() => {
    let promptInterval: NodeJS.Timeout | undefined;

    if (showAnimatedSuggestions && suggestedPrompts.length > 0 && isTabToAcceptEnabled && featureActive) {
      promptInterval = setInterval(() => {
        setPromptVisible(false); // Current prompt fades out

        setTimeout(() => { // After fade-out duration
          setPreviousPromptIndex(currentPromptIndex); 
          setCurrentPromptIndex(prevIndex => (prevIndex + 1) % suggestedPrompts.length);
          // New prompt becomes visible (fades in)
          setTimeout(() => setPromptVisible(true), 50); // Small delay for state update
        }, 300); // CSS transition duration
      }, 2000 + 300); // 2s display + 300ms transition out
    }
    return () => clearInterval(promptInterval);
  }, [showAnimatedSuggestions, suggestedPrompts.length, isTabToAcceptEnabled, featureActive, currentPromptIndex]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (featureActive && showAnimatedSuggestions && suggestedPrompts.length > 0 && isTabToAcceptEnabled && e.key === "Tab") {
      e.preventDefault();
      const currentDynamicPromptText = suggestedPrompts[currentPromptIndex];
      if (currentDynamicPromptText) {
        setInput(currentDynamicPromptText); 
        setShowAnimatedSuggestions(false); 
        setIsTabToAcceptEnabled(false);   
        setPromptVisible(false);
      }
      return; 
    }
    
    if (e.key !== "Tab" && input.length === 0 && e.key.length === 1) {
        setIsTabToAcceptEnabled(false);
    }

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

  const shouldShowCustomPlaceholderElements = featureActive && !input && suggestedPrompts.length > 0;
  const shadcnTextareaNativePlaceholder = shouldShowCustomPlaceholderElements ? "" : "Ask Atlas...";
  
  const activePromptText = (showAnimatedSuggestions && suggestedPrompts.length > 0)
    ? suggestedPrompts[currentPromptIndex]
    : null;
  
  const showTabBadge = showAnimatedSuggestions && isTabToAcceptEnabled && promptVisible;

  return (
    <div className="relative flex w-full items-end px-3 py-3">
      <div className="relative flex w-full flex-auto flex-col max-h-[320px] overflow-y-auto rounded-3xl border-2 border-zinc-200 dark:border-zinc-700 shadow-lg bg-transparent dark:bg-transparent">
        
        {shouldShowCustomPlaceholderElements && (
          // Main container for custom placeholders. It sets the bounds and base alignment.
          <div 
              className="absolute top-0 left-0 right-0 h-full flex items-center pointer-events-none pl-4 pr-4 pt-3 z-10 overflow-hidden"
              // Using h-full and pt-3 from parent, items-center will vertically align content within the top part of the textarea.
              // height: '40px' with pt-3 would also work.
              style={{ 
                  height: '40px' // Explicit height matching textarea's min-height
              }}
          >
              {/* 1. Static "Ask Atlas..." Text */}
              <div
                  className={`text-zinc-500 dark:text-zinc-400 text-base absolute w-full transition-all duration-300 ease-in-out ${
                      staticPlaceholderAnimatesOut ? 'opacity-0 -translate-y-3' : 'opacity-100 translate-y-0'
                  }`}
                  // This text is absolute, positioned at the top-left of its parent (the main placeholder container).
                  // The parent's pl-4 and pt-3 will apply to its content box.
                  // `w-full` is important if we want it to occupy the same horizontal space as suggestions might.
              >
                  Ask Atlas...
              </div>

              {/* 2. Animating Suggested Prompt - This should also be absolute and overlay "Ask Atlas..." when active */}
              {showAnimatedSuggestions && activePromptText && (
                   <div 
                      key={currentPromptIndex}
                      className={`text-zinc-500 dark:text-zinc-400 text-md absolute inset-x-0 w-full flex items-center justify-between transition-all duration-300 ease-in-out ${
                        promptVisible 
                            ? 'opacity-100 translate-y-0' 
                            : (previousPromptIndex !== null 
                                ? 'opacity-0 -translate-y-3' 
                                : 'opacity-0 translate-y-3') 
                      }`}
                      style={{ marginLeft: '15px' }}
                    >
                      <span className="truncate">
                          {activePromptText}
                      </span>
                      {showTabBadge && (
                        <span 
                          className="ml-1.5 flex-shrink-0 text-[10px] leading-tight text-zinc-400 dark:text-zinc-500 border border-zinc-300 dark:border-zinc-600 rounded-sm px-1 py-[1px] bg-transparent"
                          style={{ marginRight: '32px' }}
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
            handleInputChange(e);
            if (e.target.value) {
                setIsTabToAcceptEnabled(false);
                setPromptVisible(false);
            } else {
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

