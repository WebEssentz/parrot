// src/app/chat.tsx (or wherever your main Chat component is)
"use client";

import { defaultModel } from "@/ai/providers";
import { SEARCH_MODE } from "@/components/ui/textarea"; // Make sure this matches the export from components/ui/textarea
import { useChat } from "@ai-sdk/react";
import { useEffect, useState } from "react";
import { Textarea } from "./textarea"; // This should be your main Textarea wrapper
import { ProjectOverview } from "./project-overview";
import { Messages } from "./messages"; 
import { Header } from "./header";
import React from "react";
import { toast } from "sonner";

// ... (generateAndSetTitle function remains the same)
async function generateAndSetTitle(firstUserMessageContent: string) {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'generateTitle',
        messages: [{ role: 'user', content: firstUserMessageContent }],
      }),
    });
    if (!response.ok) throw new Error(`Title generation failed: ${response.statusText}`);
    const data = await response.json();
    if (data.title) {
      document.title = data.title;
      console.log("Chat title updated to:", data.title);
    }
  } catch (error) {
    console.error("Error generating title:", error);
  }
}


export default function Chat() {
  const [selectedModel, setSelectedModel] = useState<string>(defaultModel);
  const titleGeneratedRef = React.useRef(false);

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit: originalHandleSubmit, // Renamed to avoid conflict in this scope
    status,
    stop,
    setMessages,
    reload,
    append,
  } = useChat({
    api: '/api/chat',
    maxSteps: 5,
    body: { selectedModel },
    initialMessages: [],
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

  useEffect(() => {
      if (messages.length === 1 && messages[0].role === 'user' && !titleGeneratedRef.current) {
          const firstUserMessageContent = messages[0].content;
          titleGeneratedRef.current = true; 
          generateAndSetTitle(firstUserMessageContent);
      }
      if (messages.length === 0 && titleGeneratedRef.current) {
          titleGeneratedRef.current = false;
          document.title = "Parrot AI";
      }
  }, [messages]);

  // Custom handleSubmit for the form
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); // Prevent default form submission

    // Call the original handleSubmit from useChat with the current event
    // This is important for useChat to handle the submission process correctly
    originalHandleSubmit(e); 

    // If you were manually appending and clearing input, ensure it's compatible
    // with how useChat's handleSubmit works or let useChat handle it.
    // For instance, useChat usually handles input clearing.
    // If you need to clear it manually or append here, make sure it does not conflict.
    // append({ role: 'user', content: input }); // useChat likely does this
    // handleInputChange({ target: { value: '' } } as any); // useChat likely does this
    
    // Reset model if it was SEARCH_MODE after useChat has processed the submission
    // The onFinish callback in useChat is a better place for this.
    // if (selectedModel === SEARCH_MODE) {
    //   setSelectedModel(defaultModel);
    // }
  };


  const isLoading = status === "streaming" || status === "submitted";
  const inputAreaPaddingBottomClass = "pb-28 sm:pb-32 md:pb-36"; // Increased padding for taller input

  return (
    <div className="relative flex flex-col h-dvh w-full max-w-full bg-background dark:bg-background">
      <Header />

      <div className={`flex-1 overflow-y-auto w-full ${inputAreaPaddingBottomClass} pt-8 sm:pt-12`}>
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="max-w-xl w-full px-4">
              <ProjectOverview />
            </div>
          </div>
        ) : (
          <Messages messages={messages} isLoading={isLoading} status={status} />
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-background via-background to-transparent dark:from-background dark:via-background">
        <div className="w-full px-2 sm:px-4 pt-2 pb-3 sm:pb-4"> {/* Adjusted padding */}
          <form
            onSubmit={handleSubmit} // Use the custom handleSubmit
            className="w-full max-w-3xl mx-auto" // Increased max-width for a wider sleek look
            // Remove bg-background from here if Textarea wrapper handles its own background
            // style={{ background: 'transparent' }} // Or make it transparent
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