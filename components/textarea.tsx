"use client";

import { Textarea as ShadcnTextarea, AttachButton } from "@/components/ui/textarea";
import { defaultModel } from "@/ai/providers"; 
import { ArrowUp, ArrowRight } from "lucide-react";
import { PauseIcon, SpinnerIcon } from "./icons"; 
import React from "react";
import { useMobile } from "../hooks/use-mobile";
import { useUser } from "@clerk/nextjs";

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
  disabled?: boolean;
  suggestedPrompts: string[];
  offlineState?: 'online' | 'reconnecting' | 'offline';
  onFocus?: () => void;
}

export const Textarea = ({
  input,
  handleInputChange,
  setInput,
  isLoading,
  status,
  stop,
  selectedModel,
  onFocus,
  setSelectedModel,
  hasSentMessage,
  isDesktop,
  disabled = false,
  offlineState = 'online',
  suggestedPrompts
}: InputProps) => {
  const { isSignedIn } = useUser();
  // Use the useMobile hook to detect mobile (not tablet)
  const isMobileOnly = useMobile();
  // const [searchToggleIsOn, setSearchToggleIsOn] = React.useState(false);
  // const [reasonToggleIsOn, setReasonToggleIsOn] = React.useState(false);

  const [staticPlaceholderAnimatesOut, setStaticPlaceholderAnimatesOut] = React.useState(false);
  const [currentPromptIndex, setCurrentPromptIndex] = React.useState(0);
  const [previousPromptIndex, setPreviousPromptIndex] = React.useState<number | null>(null);
  const [showAnimatedSuggestions, setShowAnimatedSuggestions] = React.useState(false);
  const [isTabToAcceptEnabled, setIsTabToAcceptEnabled] = React.useState(true);
  const [promptVisible, setPromptVisible] = React.useState(false);
  // --- NEW: STATE FOR COMMAND PALETTE ---
  const [isPaletteOpen, setIsPaletteOpen] = React.useState(false);
  const inputRef = React.useRef<HTMLTextAreaElement>(null); // NEW: Ref for the textarea

  const REASON_MODEL_ID = isSignedIn ? "gemini-2.5-flash" : "gemini-2.5-flash-lite-preview-06-17";
  // Remove suggested prompts for signed-in users
  const featureActive = isDesktop && !hasSentMessage && !isSignedIn;

  // React.useEffect(() => {
  //   if (featureActive) {
  //     const fetchPrompts = async () => {
  //       try {
  //         const response = await fetch('/api/chat', {
  //           method: 'POST',
  //           headers: { 'Content-Type': 'application/json' },
  //           body: JSON.stringify({ action: 'getSuggestedPrompts' }),
  //         });
  //         if (!response.ok) throw new Error('Failed to fetch prompts');
  //         const data = await response.json();
  //         setSuggestedPrompts(data.prompts && data.prompts.length > 0 ? data.prompts : []);
  //       } catch (error) {
  //         console.error("Error fetching suggested prompts:", error);
  //         setSuggestedPrompts([]);
  //       }
  //     };
  //     fetchPrompts();
  //   } else {
  //     setSuggestedPrompts([]);
  //     setShowAnimatedSuggestions(false);
  //     setStaticPlaceholderAnimatesOut(false);
  //     setIsTabToAcceptEnabled(true);
  //     setPromptVisible(false);
  //     setPreviousPromptIndex(null);
  //   }
  // }, [featureActive]);

  React.useEffect(() => {
    let fadeOutTimer: NodeJS.Timeout | undefined;
    let showSuggestionsTimer: NodeJS.Timeout | undefined;

    if (featureActive && !input && suggestedPrompts && suggestedPrompts.length > 0) {
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
          setTimeout(() => setPromptVisible(true), 50);
        }
      }, 1000); 
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
  }, [featureActive, input, suggestedPrompts]);

  React.useEffect(() => {
    let promptInterval: NodeJS.Timeout | undefined;

    if (showAnimatedSuggestions && suggestedPrompts.length > 0 && isTabToAcceptEnabled && featureActive) {
      promptInterval = setInterval(() => {
        setPromptVisible(false); 

        setTimeout(() => { 
          setPreviousPromptIndex(currentPromptIndex); 
          setCurrentPromptIndex(prevIndex => (prevIndex + 1) % suggestedPrompts.length);
          setTimeout(() => setPromptVisible(true), 50); 
        }, 300); 
      }, 2000 + 300); 
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

  // REMOVED: Tools, Reason, and Search logic

  const shouldShowCustomPlaceholderElements = featureActive && !input && suggestedPrompts.length > 0;
  const shadcnTextareaNativePlaceholder = shouldShowCustomPlaceholderElements ? "" : "Ask Avurna...";
  
  const activePromptText = (showAnimatedSuggestions && suggestedPrompts.length > 0)
    ? suggestedPrompts[currentPromptIndex]
    : null;
  
  const showTabBadge = showAnimatedSuggestions && isTabToAcceptEnabled && promptVisible;

  // Memoize textareaStyle to prevent unnecessary re-renders of the child if this component updates.
  const textareaStyle = React.useMemo(() => ({ 
    minHeight: 56, // Increased min-height slightly to better contain buttons
    maxHeight: 150 // Corresponds to max-h-64
  }), []);

  return (
    <div className="relative flex w-full items-end px-3 py-3 ">
      <div className="relative flex w-full flex-auto flex-col max-h-[320px] overflow-y-auto rounded-[1.8rem] border-[1px] border-zinc-500/40 dark:border-transparent dark:shadow-black/20 bg-[#F7F7F8] dark:bg-[#2a2a2a] focus-within:ring-1 focus-within:ring-primary/10 transition-shadow">
        {shouldShowCustomPlaceholderElements && (
          <div 
              className="absolute top-0 left-0 right-0 h-full flex items-center pointer-events-none pl-4 pr-4 pt-2 z-10 overflow-hidden"
              style={{ height: '40px' }} // Matches minHeight of textarea
          >
              <div
                  className={`text-zinc-500 dark:text-zinc-400 text-base absolute w-full transition-all duration-300 ease-in-out ${
                    staticPlaceholderAnimatesOut ? 'opacity-0 -translate-y-3' : 'opacity-100 translate-y-0'
                  }`}
              >
                  Ask Avurna...
              </div>
              {showAnimatedSuggestions && activePromptText && (
                   <div 
                      key={currentPromptIndex} // Key helps React correctly animate transitions
                      className={`text-zinc-500 dark:text-zinc-400 text-md absolute inset-x-0 w-full flex items-center justify-between transition-all duration-300 ease-in-out ${
                        promptVisible 
                            ? 'opacity-100 translate-y-0' 
                            : (previousPromptIndex !== null 
                                ? 'opacity-0 -translate-y-3' // Animate out upwards
                                : 'opacity-0 -translate-y-3') // Initial animate in from upwards
                      }`}
                      style={{ marginLeft: '12px' }}
                    >
                      <span className="truncate">
                          {activePromptText}
                      </span>
                      {showTabBadge && (
                        <span 
                          className="ml-1.5 flex-shrink-0 text-[10px] leading-tight text-zinc-400 dark:text-zinc-500 border border-zinc-300 dark:border-zinc-600 rounded-sm px-1 py-[1px] bg-transparent"
                          style={{ marginRight: '30px' }} // Space from the edge
                        >
                          TAB
                        </span>
                      )}
                   </div>
              )}
          </div>
        )}

        <div className="relative">
          <ShadcnTextarea 
            className="resize-none bg-transparent w-full rounded-3xl pr-12 pt-3 pb-4 text-base md:text-base font-normal placeholder:text-base md:placeholder:text-base placeholder:pl-1 border-none shadow-none focus-visible:ring-0 focus-visible:border-none"
            value={input}
            autoFocus
            onFocus={onFocus}
            placeholder={
              offlineState === 'offline'
                ? "You’re offline. Please reconnect to continue."
                : offlineState === 'reconnecting'
                  ? "Reconnecting..."
                  : shadcnTextareaNativePlaceholder
            }
            disabled={disabled}
            style={textareaStyle}
            onChange={(e) => {
              handleInputChange(e);
              if (e.target.value) {
                  setIsTabToAcceptEnabled(false);
                  setPromptVisible(false);
              } else {
                  if (featureActive) setIsTabToAcceptEnabled(true);
              }
            }}
            onKeyDown={handleKeyDown}
            {...(disabled && offlineState !== 'online' ? { 'aria-disabled': true } : {})}
          />
        </div>

        {/* This div acts as a spacer for the absolutely positioned buttons */}
        <div style={{paddingBottom: '44px'}} /> 

        <div className="bg-primary-surface-primary absolute start-0 end-0 bottom-3 z-20 flex items-center">
          <div className="w-full">
            <div
              data-testid="composer-footer-actions"
              className="flex items-center max-xs:gap-1 gap-2 overflow-x-auto [scrollbar-width:none]"
              style={{ marginLeft: 4, marginRight: 98 }} // Shift left, keep space for send/stop
            >
              <AttachButton onClick={() => console.log('Attach button clicked')} disabled={isSignedIn ? false : isLoading} />
            </div>
            <div className="absolute end-3 bottom-0 flex items-center gap-2">
              <div className="ms-auto flex items-center gap-1.5">
                {/* Show Submit/Loading button for all other states */}
                {status !== "streaming" && status !== "submitted" && (
                  <button
                    type="submit"
                    // Disable if loading, no input, or explicitly disabled
                    disabled={isLoading || !input.trim() || disabled}
                    className={`rounded-3xl flex items-center justify-center ${
                      isLoading || !input.trim() || disabled
                        ? 'bg-zinc-300 dark:bg-white dark:opacity-60 text-zinc-400 dark:text-zinc-500 cursor-not-allowed'
                        : 'dark:bg-white bg-black hover:bg-zinc-800 text-white dark:text-black cursor-pointer'
                    }`}
                    aria-label="Send" style={{ minWidth: 36, minHeight: 36, padding: 0 }}
                  >
                    {isLoading ? (
                      // Show spinner when isLoading is true
                      <SpinnerIcon className="h-5 w-5 animate-spin text-zinc-600 dark:text-zinc-400" />
                    ) : hasSentMessage ? (
                      <ArrowUp className="h-5 w-5 text-white dark:text-black" />
                    ) : (
                      <ArrowRight className="h-5 w-5 text-white dark:text-black" />
                    )}
                  </button>
                )}
                {(status === "streaming" || status === "submitted") && (
                  <button
                    type="button"
                    onClick={stop}
                    disabled={false}
                    className={`rounded-3xl flex items-center justify-center bg-black dark:bg-white hover:bg-zinc-800 text-white dark:text-black cursor-pointer`}
                    title={status === "streaming" ? "Stop generating" : "Processing..."}
                    style={{ minWidth: 40, minHeight: 40, cursor: 'pointer' }}
                  >
                    <PauseIcon size={28} className="h-6 w-6 text-white dark:text-black" />
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