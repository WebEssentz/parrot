"use client";

 import { defaultModel } from "@/ai/providers";
import { SEARCH_MODE } from "@/components/ui/textarea";
import { useChat } from "@ai-sdk/react";
import { useState } from "react";
import { Textarea } from "./textarea"; // Assuming textarea.tsx is correct
import { ProjectOverview } from "./project-overview";
import { Messages } from "./messages"; // Assuming messages.tsx has the max-w and py adjustments
import { Header } from "./header";
import { toast } from "sonner";

export default function Chat() {
  const [selectedModel, setSelectedModel] = useState<string>(defaultModel);

  // UseChat with onFinish to reset model after POST completes (no race condition)
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit: baseHandleSubmit,
    status,
    stop
  } = useChat({
    maxSteps: 5,
    body: { selectedModel },
    onFinish: () => {
      if (selectedModel === SEARCH_MODE) {
        setSelectedModel(defaultModel);
      }
    },
    onError: (error) => {
      toast.error(
        error.message.length > 0
          ? error.message
          : "An error occurred, please try again later.",
        { position: "top-center", richColors: true },
      );
    },
  });


  // Always POST with the current selectedModel, then immediately reset to default if SEARCH_MODE
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    const modelForThisPost = selectedModel;
    baseHandleSubmit(e);
    if (modelForThisPost === SEARCH_MODE) {
      setSelectedModel(defaultModel);
    }
  };

  const isLoading = status === "streaming" || status === "submitted";

  // Estimate height needed for the input area for padding-bottom on scroll content
  // Adjust this based on your Textarea height + container padding + disclaimer height
  // Example: 4rem (textarea) + 1.5rem (container p) + 1rem (disclaimer) + buffer = ~7rem
  const inputAreaPaddingBottomClass = "pb-28 sm:pb-32"; // Start with this, adjust if needed

  return (
    // Main container: Full height, flex column. Relative for fixed children.
    <div className="relative flex flex-col h-dvh w-full max-w-full bg-background dark:bg-background">
      <Header />

      {/* Middle scrolling content area */}
      {/* ADD PADDING BOTTOM: Account for the fixed input area */}
      <div className={`flex-1 overflow-y-auto w-full ${inputAreaPaddingBottomClass} pt-8 sm:pt-12`}>
        {messages.length === 0 ? (
          // Center ProjectOverview when no messages
          <div className="flex h-full items-center justify-center">
            <div className="max-w-xl w-full px-4">
                <ProjectOverview />
            </div>
          </div>
        ) : (
          // Messages list container (styling inside Messages.tsx)
          <Messages messages={messages} isLoading={isLoading} status={status} />
        )}
      </div>

      {/* Input form area + Disclaimer: FIXED at the bottom */}
      <div className="fixed bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-background via-background to-transparent dark:from-background dark:via-background">
         {/* Inner container for padding and centering */}
         {/* Add padding-bottom here to create space *below* the textarea */}
         <div className="w-full px-2 sm:px-4 pt-3 pb-4 sm:pb-5"> {/* Added pt-3, pb-4/5 */}
             {/* Form remains centered */}
            <form
                onSubmit={handleSubmit}
                // Use appropriate max-width for your design
                className="w-full max-w-2xl mx-auto bg-background" // e.g., max-w-2xl, 3xl, or 4xl
            >
                <Textarea
                    selectedModel={selectedModel}
                    setSelectedModel={setSelectedModel}
                    handleInputChange={handleInputChange}
                    input={input}
                    isLoading={isLoading}
                    status={status}
                    stop={stop}
                />
            </form>
         </div>
      </div>
    </div>
  );
}