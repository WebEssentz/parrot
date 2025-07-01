// hooks/use-chats.ts

import useSWR from 'swr';
import { useUser } from '@clerk/nextjs';

type ChatSummary = {
  id: string;
  title: string;
};

const fetcher = (url: string) => fetch(url).then(res => res.json());

export function useChats() {
  const { user, isLoaded } = useUser();
  const swrKey = isLoaded && user ? '/api/chats' : null;

  const { data, error, isLoading, mutate } = useSWR<ChatSummary[]>(swrKey, fetcher, {
    revalidateOnFocus: false,
  });

  // ==========================================================
  // --- THIS IS THE NEW FUNCTION FOR OPTIMISTIC UPDATES ---
  // ==========================================================
  const createChat = async (): Promise<ChatSummary> => {
    try {
      // 1. Call the API to create the chat in the database.
      const res = await fetch('/api/chats', {
        method: 'POST',
      });

      if (!res.ok) {
        throw new Error('Failed to create chat');
      }

      const newChat = await res.json();
      
      // 2. IMPORTANT: Tell SWR to re-fetch the list.
      // This will update the sidebar automatically.
      mutate();

      // 3. Return the new chat object so we can navigate to it.
      return newChat;

    } catch (e) {
      console.error("Failed in createChat:", e);
      // Re-throw the error so the calling component can handle it if needed
      throw e;
    }
  };

  return {
    chats: data,
    isLoading: !isLoaded || isLoading,
    isError: error,
    createChat, // <-- Expose the new function
  };
}