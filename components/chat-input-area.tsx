"use client";

import { AnimatePresence } from "framer-motion";
import { PredictivePrompts } from "./ui/suggestions/predictive-prompts";
import { Textarea as CustomTextareaWrapper } from "./textarea";
import { useOnClickOutside } from "@/hooks/use-on-click-outside";
import { useRef } from "react";
import { StagedFile } from "@/components/chats/user-chat"; // Import StagedFile type

interface ChatInputAreaProps {
  onSendMessage: (message: string) => Promise<void>; // Updated signature
  onFileStaged: (files: StagedFile[]) => void; // New prop for staging files
  stagedFiles: StagedFile[]; // Pass staged files from parent
  setStagedFiles: React.Dispatch<React.SetStateAction<StagedFile[]>>; // Pass setter for staged files
  predictivePrompts: string[];
  isPerceivedStreaming: boolean;
  input: string;
  setInput: (value: string) => void;
  handleInputChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  isPredicting: boolean;
  uiIsLoading: boolean;
  status: string;
  stop: () => void;
  hasSentMessage: boolean;
  isDesktop: boolean;
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  dynamicSuggestedPrompts: string[];
  isPredictiveVisible: boolean;
  setIsPredictiveVisible: (visible: boolean) => void;
  disabled?: boolean;
  offlineState?: 'online' | 'reconnecting' | 'offline';
  user: any;
  chatId: string | null;
}

export function ChatInputArea({
  onSendMessage,
  onFileStaged, // Destructure new prop
  stagedFiles, // Destructure new prop
  setStagedFiles, // Destructure new prop
  predictivePrompts,
  input,
  setInput,
  isPredicting,
  uiIsLoading,
  dynamicSuggestedPrompts,
  isPredictiveVisible,
  setIsPredictiveVisible,
  isPerceivedStreaming,
  hasSentMessage,
  ...rest
}: ChatInputAreaProps) {
  const inputAreaRef = useRef<HTMLDivElement>(null);
  useOnClickOutside(inputAreaRef, () => setIsPredictiveVisible(false));

  return (
    <div ref={inputAreaRef} className="relative w-full">
      <CustomTextareaWrapper
        setInput={setInput}
        input={input}
        isLoading={uiIsLoading}
        suggestedPrompts={dynamicSuggestedPrompts}
        onFocus={() => setIsPredictiveVisible(true)}
        onSendMessage={onSendMessage}
        onFileStaged={onFileStaged} // Pass onFileStaged down
        stagedFiles={stagedFiles} // Pass stagedFiles down
        setStagedFiles={setStagedFiles} // Pass setStagedFiles down
        isPerceivedStreaming={isPerceivedStreaming}
        hasSentMessage={hasSentMessage}
        {...rest}
      />
      <AnimatePresence>
        {isPredictiveVisible && !hasSentMessage && predictivePrompts.length > 0 && (
          <PredictivePrompts
            prompts={predictivePrompts}
            currentUserInput={input}
            onSelect={(prompt) => {
              setInput(prompt);
              setIsPredictiveVisible(false);
            }}
            onDismiss={() => setIsPredictiveVisible(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
