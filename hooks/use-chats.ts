import useSWR from 'swr';
import { useUser } from '@clerk/nextjs';

export type ChatSummary = {
  id: string;
  title: string;
  isOptimistic?: boolean;
};

const fetcher = (url: string) => fetch(url).then(res => res.json());

export function useChats() {
  const { user, isLoaded } = useUser();
  const swrKey = isLoaded && user ? '/api/chats' : null;

  const { data, error, isLoading, mutate } = useSWR<ChatSummary[]>(swrKey, fetcher, {
    revalidateOnFocus: false,
  });
  
  // --- NEW FUNCTION for targeted title updates ---
  const updateChatTitle = (chatId: string, newTitle: string) => {
    // Optimistically update the local cache immediately
    mutate((currentChats = []) => 
      currentChats.map(chat => 
        chat.id === chatId ? { ...chat, title: newTitle, isOptimistic: false } : chat
      ),
      false // Don't revalidate yet, we'll do that after the PUT
    );
  };


  return {
    chats: data,
    isLoading: !isLoaded || isLoading,
    isError: error,
    mutateChats: mutate,
    // --- EXPOSE THE NEW FUNCTION ---
    updateChatTitle,
  };
}