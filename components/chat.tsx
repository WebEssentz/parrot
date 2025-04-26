"use client";

import { defaultModel, modelID } from "@/ai/providers";
import { useChat } from "@ai-sdk/react";
import { useState } from "react";
import { Textarea } from "./textarea";
import { ProjectOverview } from "./project-overview";
import { Messages } from "./messages";
import { Header } from "./header";
import { toast } from "sonner";

export default function Chat() {
  const [selectedModel, setSelectedModel] = useState<modelID>(defaultModel);
  const { messages, input, handleInputChange, handleSubmit, status, stop } =
    useChat({
      maxSteps: 5,
      body: {
        selectedModel,
      },
      onError: (error) => {
        toast.error(
          error.message.length > 0
            ? error.message
            : "An error occured, please try again later.",
          { position: "top-center", richColors: true },
        );
      },
    });

  const isLoading = status === "streaming" || status === "submitted";

  return (
    <>
      <div className="h-dvh flex flex-col justify-center w-full max-w-full mx-auto pt-10 px-0 sm:px-0 box-border">
        <Header />
        {messages.length === 0 ? (
          <div className="max-w-xl mx-auto w-full">
            <ProjectOverview />
          </div>
        ) : (
          <Messages messages={messages} isLoading={isLoading} status={status} />
        )}
        {/* Mobile: input below messages, scrolls with content */}
        <div className="block sm:hidden w-full max-w-xl mx-auto px-4 pb-4">
          <form onSubmit={handleSubmit} className="pb-8 bg-background dark:bg-background w-full max-w-xl mx-auto px-4 sm:px-0 fixed bottom-0 left-0 right-0 sm:static sm:bottom-auto sm:left-auto sm:right-auto">
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
        {/* Desktop: input fixed at bottom */}
        <form
          onSubmit={handleSubmit}
          className="hidden sm:block pb-8 bg-background dark:bg-background w-full max-w-2xl mx-auto px-0 fixed bottom-0 left-0 right-0 sm:static sm:bottom-auto sm:left-auto sm:right-auto"
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
      {/* Bottom-centered disclaimer overlay */}
      <div className="fixed left-0 right-0 bottom-2 z-50 flex justify-center pointer-events-none select-none">
        <div className="text-xs text-zinc-500 dark:text-zinc-400 text-center dark:bg-background/80px-3 py-1">
          Parrot is powered by AI. Double check response.
        </div>
      </div>
    </>
  );
}
