"use client";

import { defaultModel } from "@/ai/providers";
import { SEARCH_MODE } from "@/components/ui/textarea";
import { useChat } from "@ai-sdk/react";
import { useEffect, useState } from "react";
import { Textarea } from "./textarea"; // Assuming textarea.tsx is correct
import { ProjectOverview } from "./project-overview";
import { Messages } from "./messages"; // Assuming messages.tsx has the max-w and py adjustments
import { Header } from "./header";
import React from "react";
import { toast } from "sonner";

// --- Typewriter Effect Helper ---
// Stores the interval ID globally within the module scope or use a ref in the component
let typewriterInterval: NodeJS.Timeout | null = null;

function startTypewriterEffect(title: string, speed: number = 50) { // speed in ms
  // Clear any existing typewriter effect
  if (typewriterInterval) {
    clearInterval(typewriterInterval);
    typewriterInterval = null;
  }

  let index = 0;
  // Initial partial title might be useful (e.g., show "Generating...")
  // document.title = "Generating..."; // Optional: Initial state

  typewriterInterval = setInterval(() => {
    if (index < title.length) {
      index++;
      document.title = title.substring(0, index); // Update title progressively
    } else {
      clearInterval(typewriterInterval!); // Clear interval when done
      typewriterInterval = null;
       document.title = title; // Ensure final title is set correctly
       // Optional: Add a blinking cursor effect for a moment
       // setTimeout(() => { document.title = title.endsWith('_') ? title.slice(0, -1) : title; }, 500);
    }
  }, speed);
}
// --- End Typewriter Helper ---



// Helper function to generate title
async function generateAndSetTitle(firstUserMessageContent: string) {
  try {
    const response = await fetch('/api/chat', { // Assuming same endpoint
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'generateTitle',
        // Send just the first message content for title generation context
        messages: [{ role: 'user', content: firstUserMessageContent }],
        // selectedModel: defaultModel // Optional: can specify model if needed
      }),
    });

    if (!response.ok) {
      throw new Error(`Title generation failed: ${response.statusText}`);
    }

    const data = await response.json();
    if (data.title) {
      document.title = data.title; // Update browser tab title
      console.log("Chat title updated to:", data.title);
    }
  } catch (error) {
    console.error("Error generating title:", error);
    // Optionally set a default title on error or just leave it
    // document.title = "Chat";
  }
}

export default function Chat() {
  const [selectedModel, setSelectedModel] = useState<string>(defaultModel);
  const titleGeneratedRef = React.useRef(false); // Ref to track if title was generated for this session

  // UseChat with onFinish to reset model after POST completes (no race condition)
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit: baseHandleSubmit,
    status,
    stop,
    setMessages, // Needed if we manually add messages
    reload, // Example hook return value
    append, // Example hook return value
    status: chatIsLoading, // Rename to avoid conflict
  } = useChat({
    api: '/api/chat', // Explicitly define API endpoint
    maxSteps: 5,
    body: { selectedModel },
    initialMessages: [], // Start with no messages
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

  
  // Effect to generate title after the FIRST user message is submitted
  // We trigger based on the length becoming 1 (only the user message exists initially)
  // before the assistant response comes back.
  useEffect(() => {
      // Check if exactly one message exists (the user's first message)
      // and if the title hasn't been generated yet for this session.
      if (messages.length === 1 && messages[0].role === 'user' && !titleGeneratedRef.current) {
          const firstUserMessageContent = messages[0].content;
          console.log("First user message detected, generating title...");
          titleGeneratedRef.current = true; // Mark as attempting/generated
          generateAndSetTitle(firstUserMessageContent); // Fire and forget title generation
      }

      // Reset title generation flag if messages are cleared (new chat)
      if (messages.length === 0 && titleGeneratedRef.current) {
          titleGeneratedRef.current = false;
          document.title = "Parrot AI"; // Reset to default title
          console.log("Chat cleared, title generation reset.");
      }

  }, [messages]); // Dependency array includes messages



  // Always POST with the current selectedModel, then immediately reset to default if SEARCH_MODE
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); 
     const currentInput = input; // Capture input before clearing
       const modelForThisRequest = selectedModel; // Capture model before potential reset

       // Append the user message immediately for better UX
       append({ role: 'user', content: currentInput });

       // **Important:** We no longer call baseHandleSubmit directly from form onSubmit
       // `append` handles sending the message with the current hook state's body.
       // The `body: { selectedModel }` in `useChat` options ensures the correct model is sent.

       // Reset model immediately if it was SEARCH_MODE
       if (modelForThisRequest === SEARCH_MODE) {
         console.log("Search mode detected, resetting model selection post-submit.");
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