"use client";

import { Textarea as ShadcnTextarea, AttachButton } from "@/components/ui/textarea";
import { ArrowUp, ArrowRight, AudioLines } from "lucide-react";
import { PauseIcon, SpinnerIcon } from "./icons";
<<<<<<< HEAD
import React from "react";
import { useMobile } from "../hooks/use-mobile";
=======
import React from "react"
import { Room, RoomEvent } from 'livekit-client';
>>>>>>> avurna-clean
import { useUser } from "@clerk/nextjs";
import { motion, AnimatePresence } from "framer-motion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { FlowOverlay } from './FlowOverlay';
<<<<<<< HEAD
=======
import { v4 as uuidv4 } from 'uuid';
>>>>>>> avurna-clean

// --- PROPS INTERFACE (Unchanged) ---
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
<<<<<<< HEAD
=======
  user: { id: string } | null | undefined;
>>>>>>> avurna-clean
}

export const Textarea = ({
  input,
  handleInputChange,
  setInput,
  isLoading,
  status,
  stop,
  onFocus,
  hasSentMessage,
  isDesktop,
  disabled = false,
  offlineState = 'online',
<<<<<<< HEAD
  suggestedPrompts
=======
  suggestedPrompts,
  user
>>>>>>> avurna-clean
}: InputProps) => {
  const { isSignedIn } = useUser();

  // --- STATE AND HANDLERS (Unchanged) ---
  const [staticPlaceholderAnimatesOut, setStaticPlaceholderAnimatesOut] = React.useState(false);
  const [currentPromptIndex, setCurrentPromptIndex] = React.useState(0);
  const [previousPromptIndex, setPreviousPromptIndex] = React.useState<number | null>(null);
  const [showAnimatedSuggestions, setShowAnimatedSuggestions] = React.useState(false);
  const [isTabToAcceptEnabled, setIsTabToAcceptEnabled] = React.useState(true);
  const [promptVisible, setPromptVisible] = React.useState(false);
  const [isVoiceIconHovered, setIsVoiceIconHovered] = React.useState(false);
  const [isFlowActive, setIsFlowActive] = React.useState(false);
<<<<<<< HEAD
=======
  const [flowSession, setFlowSession] = React.useState<{ room: Room; roomName: string; } | null>(null);
>>>>>>> avurna-clean

  const featureActive = isDesktop && !hasSentMessage && !isSignedIn;

  React.useEffect(() => {
    let fadeOutTimer: NodeJS.Timeout | undefined;
    let showSuggestionsTimer: NodeJS.Timeout | undefined;
    if (featureActive && !input && suggestedPrompts.length > 0) {
      setIsTabToAcceptEnabled(true);
      setStaticPlaceholderAnimatesOut(false);
      setShowAnimatedSuggestions(false);
      setPromptVisible(false);
      fadeOutTimer = setTimeout(() => { if (featureActive && !input) setStaticPlaceholderAnimatesOut(true); }, 700);
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
    return () => { clearTimeout(fadeOutTimer); clearTimeout(showSuggestionsTimer); };
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

<<<<<<< HEAD
  const handleVoiceClick = () => {
    console.log("Activating Flow...");
    setIsFlowActive(true);
=======
  const handleVoiceClick = async () => {
    console.log("Activating Flow...");
    setIsFlowActive(true); 

    try {
      // 1. Call the Vercel serverless function (this part is fine)
      const response = await fetch('/api/flow/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identity: user?.id || `user-${uuidv4()}` }),
      });

      if (!response.ok) {
        throw new Error(`Failed to start flow session: ${response.statusText}`);
      }

      const data = await response.json();
      const { user_token, livekit_url, agent_token, room_name } = data;

      // 2. Create and connect to the LiveKit room
      const room = new Room();

      room.on(RoomEvent.Disconnected, () => {
        console.log("Disconnected from LiveKit room");
        setIsFlowActive(false);
        setFlowSession(null);
      });
      
      // Connect to LiveKit BEFORE triggering the agent
      await room.connect(livekit_url, user_token);
      await room.localParticipant.setMicrophoneEnabled(true);

      // Now that we are fully connected, store the session details
      setFlowSession({ room, roomName: room_name });

      // --- KEY FIX: Make the agent trigger fire-and-forget ---
      // We wrap ONLY this fetch call in its own try/catch. If it fails due to a
      // timeout, we'll log a warning but we WON'T crash the UI.
      console.log("Triggering agent to join room...");
      try {
        const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL;
        if (!agentUrl) {
          throw new Error("Agent URL is not configured in environment variables.");
        }

        await fetch(`${agentUrl}/join-room`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            room_name: room_name,
            agent_token: agent_token
          }),
        });
        
        console.log("Agent trigger request sent successfully.");
      } catch (agentError) {
        // This is now a non-fatal error. We just log it.
        console.warn("Agent trigger fetch failed. This can happen on slow startups and is often non-critical.", agentError);
      }
      // --- END OF THE FIX ---

    } catch (error) {
      // This main catch block will now only handle critical errors,
      // like failing to get a token or connect to LiveKit.
      console.error("Critical error during Flow activation:", error);
      setIsFlowActive(false);
      // Ensure we clean up if a session object was partially created
      if (flowSession?.room) {
        await flowSession.room.disconnect();
      }
    }
  };

  const handleCloseFlow = async () => { // --- KEY CHANGE: Make this function async
    if (flowSession?.room) {
      // --- KEY CHANGE: Explicitly disable audio before disconnecting ---
      // This ensures the user's mic is off even if the disconnect is slow.
      await flowSession.room.localParticipant.setMicrophoneEnabled(false);
      
      // This will trigger the 'Disconnected' event we set up earlier
      await flowSession.room.disconnect();
    } else {
      // Fallback for safety
      setIsFlowActive(false);
    }
>>>>>>> avurna-clean
  };

  const shouldShowCustomPlaceholderElements = featureActive && !input && suggestedPrompts.length > 0;
  const shadcnTextareaNativePlaceholder = shouldShowCustomPlaceholderElements ? "" : "Ask Avurna...";
  const activePromptText = (showAnimatedSuggestions && suggestedPrompts.length > 0) ? suggestedPrompts[currentPromptIndex] : null;
  const showTabBadge = showAnimatedSuggestions && isTabToAcceptEnabled && promptVisible;
  const hasInput = input.trim().length > 0;
  const textareaStyle = React.useMemo(() => ({ minHeight: 56, maxHeight: 150 }), []);

  // --- JSX RENDER ---
  return (
    <>
      <TooltipProvider delayDuration={100}>
        <motion.div
          // --- NEW: Animate the entire input bar out ---
          animate={{ opacity: isFlowActive ? 0 : 1, y: isFlowActive ? 10 : 0 }}
          transition={{ duration: 0.3 }}
          className="relative flex w-full items-end px-3 py-3"
        >
          <div className="relative flex w-full flex-auto flex-col max-h-[320px] overflow-y-auto rounded-[1.8rem] border-[1px] border-zinc-500/40 dark:border-transparent dark:shadow-black/20 bg-[#ffffff] dark:bg-[#2a2a2a] focus-within:ring-1 focus-within:ring-primary/10 transition-shadow">

            {/* Placeholder logic is untouched */}
            {shouldShowCustomPlaceholderElements && (
              <div
                className="absolute top-0 left-0 right-0 h-full flex items-center pointer-events-none pl-4 pr-4 pt-2 z-10 overflow-hidden"
                style={{ height: '40px' }}
              >
                <div
                  className={`text-zinc-500 dark:text-zinc-400 text-base absolute w-full transition-all duration-300 ease-in-out ${staticPlaceholderAnimatesOut ? 'opacity-0 -translate-y-3' : 'opacity-100 translate-y-0'
                    }`}
                >
                  Ask Avurna...
                </div>
                {showAnimatedSuggestions && activePromptText && (
                  <div
                    key={currentPromptIndex}
                    className={`text-zinc-500 dark:text-zinc-400 text-md absolute inset-x-0 w-full flex items-center justify-between transition-all duration-300 ease-in-out ${promptVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-3'
                      }`}
                    style={{ marginLeft: '12px' }}
                  >
                    <span className="truncate">{activePromptText}</span>
                    {showTabBadge && (
                      <span
                        className="ml-1.5 flex-shrink-0 text-[10px] leading-tight text-primary dark:text-white border border-zinc-300 dark:border-zinc-600 rounded-sm px-1 py-[1px] bg-transparent"
                        style={{ marginRight: '30px' }}
                      >
                        TAB
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Textarea remains unchanged */}
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

            {/* Spacer div remains unchanged */}
            <div style={{ paddingBottom: '44px' }} />

            {/* --- THIS IS THE FINAL, CORRECTED LOGIC --- */}
<<<<<<< HEAD
            <div className="absolute start-0 end-0 bottom-0 z-20 flex items-center px-3 pb-3">
=======
            <div className="absolute start-0 -ml-2 end-0 bottom-0 z-20 flex items-center px-3 pb-3">
>>>>>>> avurna-clean
              {/* Attach Button is on the left */}
              <AttachButton onClick={() => console.log('Attach button clicked')} disabled={isSignedIn ? false : isLoading} />

              {/* This spacer will push the dynamic button to the far right */}
              <div className="flex-grow" />

              {/* Container for the single dynamic button on the right */}
              <div className="flex items-center">
                {/* Show loading/stop button if applicable */}
                {(isLoading || status === "streaming" || status === "submitted") ? (
                  <motion.div
                    key="loading-stop"
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                  >
                    {isLoading && status !== "streaming" && status !== "submitted" && (
                      <div className="rounded-full flex items-center justify-center bg-zinc-300 dark:bg-white dark:opacity-60" style={{ width: 36, height: 36 }}>
                        <SpinnerIcon className="h-5 w-5 animate-spin text-zinc-600 dark:text-zinc-400" />
                      </div>
                    )}
                    {(status === "streaming" || status === "submitted") && (
                      <button type="button" onClick={stop} className="rounded-full flex items-center justify-center bg-black dark:bg-white" style={{ width: 40, height: 40 }}>
                        <PauseIcon size={28} className="h-6 w-6 text-white dark:text-black" />
                      </button>
                    )}
                  </motion.div>
                ) : (
                  // The SINGLE, PERSISTENT button that swaps icons
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <motion.button
                        type={hasInput ? "submit" : "button"}
                        onClick={hasInput ? undefined : handleVoiceClick}
                        disabled={disabled}
                        className="rounded-full flex items-center justify-center bg-black dark:bg-white text-white dark:text-black cursor-pointer"
                        style={{ width: 36, height: 36 }}
                        aria-label={hasInput ? "Send" : "Activate Flow"}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        transition={{ type: "spring", stiffness: 500, damping: 15 }}
                      >
                        <AnimatePresence mode="wait" initial={false}>
                          <motion.span
                            key={hasInput ? "send" : "voice"}
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            transition={{ duration: 0.15 }}
                          >
                            {hasInput
                              ? (hasSentMessage ? <ArrowUp size={20} /> : <ArrowRight size={20} />)
                              : <AudioLines size={20} />
                            }
                          </motion.span>
                        </AnimatePresence>
                      </motion.button>
                    </TooltipTrigger>
<<<<<<< HEAD
                    {/* ADD THIS PART RIGHT AFTER */}
=======
>>>>>>> avurna-clean
                    <TooltipContent side="top" align="center">
                      <p>{hasInput ? "Send" : "Activate Flow"}</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </TooltipProvider>
      <AnimatePresence>
<<<<<<< HEAD
        {isFlowActive && <FlowOverlay onClose={() => setIsFlowActive(false)} />}
      </AnimatePresence>
=======
        {isFlowActive && <FlowOverlay onClose={handleCloseFlow} session={flowSession} user={user} />}
    </AnimatePresence>
>>>>>>> avurna-clean
    </>
  );
};