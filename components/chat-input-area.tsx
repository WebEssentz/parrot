// FILE: components/chat-input-area.tsx

"use client";

import { AnimatePresence } from "framer-motion";
import { PredictivePrompts } from "./ui/suggestions/predictive-prompts";
import { Textarea as CustomTextareaWrapper } from "./textarea";
import { useOnClickOutside } from "@/hooks/use-on-click-outside";
import { useRef } from "react";

interface ChatInputAreaProps {
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  predictivePrompts: string[];
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
}

export function ChatInputArea({
  handleSubmit,
  predictivePrompts,
  input,
  setInput,
  isPredicting,
  uiIsLoading,
  dynamicSuggestedPrompts,
  isPredictiveVisible,
  setIsPredictiveVisible,
  ...rest
}: ChatInputAreaProps) {
  const inputAreaRef = useRef<HTMLDivElement>(null);

  useOnClickOutside(inputAreaRef, () => setIsPredictiveVisible(false));

  return (
    <div ref={inputAreaRef} className="relative w-full">
      <form onSubmit={handleSubmit} className="w-full">
        <CustomTextareaWrapper
          setInput={setInput}
          input={input}
          isLoading={uiIsLoading}
          suggestedPrompts={dynamicSuggestedPrompts}
          onFocus={() => setIsPredictiveVisible(true)}
          {...rest}
        />
      </form>
      <AnimatePresence>
        {isPredictiveVisible && predictivePrompts.length > 0 && (
          <PredictivePrompts
            prompts={predictivePrompts}
            currentUserInput={input}
            onSelect={(prompt) => {
              setInput(prompt);
            }}
            // --- THIS IS THE FIX ---
            // Add the required onDismiss prop. This allows the child component
            // to tell the parent to hide the prompts when the user presses Escape.
            onDismiss={() => setIsPredictiveVisible(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}