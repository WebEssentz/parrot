"use client";

import { useState, useEffect, useCallback } from 'react';

// Key for storing the remaining shuffled prompts in localStorage
const LOCAL_STORAGE_KEY_SHUFFLED_PROMPTS = 'avurna_shuffled_prompts';

// A standard, reliable shuffle algorithm (Fisher-Yates)
function shuffleArray(array: any[]) {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]]; // Swap elements
  }
  return newArray;
}

export function useSuggestedPrompts() {
  const [prompts, setPrompts] = useState<string[]>([]);

  // We wrap the logic in useCallback to ensure it has a stable identity,
  // though with an empty dependency array it's not strictly necessary, it's good practice.
  const initializePrompts = useCallback(async () => {
    // This hook should only run on the client
    if (typeof window === "undefined") {
      return;
    }

    try {
      let shuffledPrompts: string[] | null = JSON.parse(
        localStorage.getItem(LOCAL_STORAGE_KEY_SHUFFLED_PROMPTS) || 'null'
      );

      // Condition to reset: If storage is empty OR the list has run out.
      if (!shuffledPrompts || shuffledPrompts.length === 0) {
        console.log("No valid prompts in storage. Fetching and shuffling a new deck...");

        // 1. Fetch the full grouped list from the server.
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'getSuggestedPrompts' }),
        });
        if (!response.ok) throw new Error('Failed to fetch prompts');
        
        const data = await response.json();
        const allPrompts = Object.values(data.promptGroups).flat() as string[];

        // 2. Shuffle the entire deck of 50 prompts.
        shuffledPrompts = shuffleArray(allPrompts);
      }

      // 3. Deal the top 5 prompts from the deck.
      const promptsToDisplay = shuffledPrompts.slice(0, 5);
      
      // 4. Create the new deck with the dealt cards removed.
      const remainingPrompts = shuffledPrompts.slice(5);

      // 5. Update the UI with the prompts we just dealt.
      setPrompts(promptsToDisplay);
      
      // 6. Save the new, smaller deck back to localStorage for the next visit.
      localStorage.setItem(LOCAL_STORAGE_KEY_SHUFFLED_PROMPTS, JSON.stringify(remainingPrompts));

    } catch (error) {
      console.error("Error with suggested prompts:", error);
      // Fallback in case of any errors
      setPrompts([
        "Help me write a story",
        "Build a simple snake game in JavaScript",
        "What are some fun activities to do this weekend?",
        "Explain how API integration works.",
        "Generate an image of a futuristic cityscape",
      ]);
    }
  }, []); // Empty dependency array ensures this runs once on mount.

  useEffect(() => {
    initializePrompts();
  }, [initializePrompts]);

  return prompts;
}