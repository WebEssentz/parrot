// hooks/use-live-suggested-prompts.ts
"use client";

import { useState, useEffect, useRef, useCallback } from 'react';

// A standard, reliable shuffle algorithm (Fisher-Yates)
function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

const PROMPT_REFRESH_INTERVAL_MS = 15000; // Refresh the set of 5 prompts every 15 seconds

export function useLiveSuggestedPrompts() {
  const [prompts, setPrompts] = useState<string[]>([]);
  const promptDeck = useRef<string[]>([]);
  const nextDeck = useRef<string[] | null>(null);
  const isFetchingNextDeck = useRef(false);

  // This helper function is perfect. No changes needed.
  const fetchNewDeck = useCallback(async (): Promise<string[]> => {
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'getSuggestedPrompts' }),
      });
      if (!response.ok) throw new Error('Failed to fetch prompts');
      const data = await response.json();
      const allPrompts = Object.values(data.promptGroups).flat() as string[];
      return shuffleArray(allPrompts);
    } catch (error) {
      console.error("Error fetching new prompts:", error);
      return shuffleArray([
        "Help me write a story", "Build a simple snake game", "What's a good movie?",
        "Explain API integration", "Suggest a recipe for dinner", "Optimize my workflow"
      ]);
    }
  }, []);

  // This cycling function is also perfect. No changes needed.
  const cyclePrompts = useCallback(async () => {
    if (promptDeck.current.length <= 5 && !isFetchingNextDeck.current && !nextDeck.current) {
      isFetchingNextDeck.current = true;
      console.log("Preloading next deck...");
      fetchNewDeck().then(deck => {
        nextDeck.current = deck;
        isFetchingNextDeck.current = false;
        console.log("Next deck preloaded.");
      });
    }

    if (promptDeck.current.length === 0) {
      if (nextDeck.current) {
        console.log("Swapping to preloaded deck.");
        promptDeck.current = nextDeck.current;
        nextDeck.current = null;
      } else {
        console.log("Deck empty, fetching new one immediately.");
        promptDeck.current = await fetchNewDeck();
      }
    }

    const promptsToDisplay = promptDeck.current.slice(0, 5);
    promptDeck.current = promptDeck.current.slice(5);
    setPrompts(promptsToDisplay);
  }, [fetchNewDeck]);


  // --- THE CRITICAL FIX IS IN THIS useEffect ---
  useEffect(() => {
    if (typeof window === "undefined") return;

    // This function handles the very first load.
    const initialLoad = async () => {
      const initialDeck = await fetchNewDeck();
      
      // 1. Deal the first hand.
      const initialPrompts = initialDeck.slice(0, 5);
      
      // 2. Set the ref to the REMAINING deck.
      promptDeck.current = initialDeck.slice(5);

      // 3. Set the UI state.
      setPrompts(initialPrompts);
    };

    // Run the initial load once on mount.
    initialLoad();

    // Now, set up the interval to call cyclePrompts for all SUBSEQUENT refreshes.
    const intervalId = setInterval(cyclePrompts, PROMPT_REFRESH_INTERVAL_MS);
    
    // Cleanup function is correct.
    return () => clearInterval(intervalId);

  }, [cyclePrompts, fetchNewDeck]); // Dependencies are correct.

  return prompts;
}