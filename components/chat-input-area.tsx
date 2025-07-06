// src/components/chat-input-area.tsx
"use client";

import { AnimatePresence } from "framer-motion";
import { PredictivePrompts } from "./predictive-prompts";
import { Textarea as CustomTextareaWrapper } from "./textarea";
// --- 1. Import the hook and useRef ---
import { useOnClickOutside } from "@/hooks/use-on-click-outside";
import { useRef } from "react";

// --- 2. Update the props interface ---
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
  // --- New Props for visibility ---
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
  // --- Destructure new props ---
  isPredictiveVisible,
  setIsPredictiveVisible,
  ...rest
}: ChatInputAreaProps) {
  // --- 3. Create a ref for the entire area ---
  const inputAreaRef = useRef<HTMLDivElement>(null);

  // --- 4. Use the hook to set visibility to false on outside click ---
  useOnClickOutside(inputAreaRef, () => setIsPredictiveVisible(false));

  return (
    // --- 5. Apply the ref to the root element ---
    <div ref={inputAreaRef} className="relative w-full">
      <form onSubmit={handleSubmit} className="w-full">
        <CustomTextareaWrapper
          setInput={setInput}
          input={input}
          isLoading={uiIsLoading}
          suggestedPrompts={dynamicSuggestedPrompts}
          // --- 6. Add onFocus handler to re-show prompts ---
          onFocus={() => setIsPredictiveVisible(true)}
          {...rest}
        />
      </form>
      <AnimatePresence>
        {/* --- 7. Use the new visibility state in the condition --- */}
        {isPredictiveVisible && predictivePrompts.length > 0 && (
          <PredictivePrompts
            prompts={predictivePrompts}
            currentUserInput={input}
            onSelect={(prompt) => {
              setInput(prompt);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}