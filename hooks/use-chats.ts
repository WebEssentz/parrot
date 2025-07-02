import { useUser } from '@clerk/nextjs';
import useSWRInfinite from 'swr/infinite';

export type ChatSummary = {
  id: string;
  title: string;
  isOptimistic?: boolean;
};

const fetcher = (url: string) => fetch(url).then(res => res.json());
const PAGE_LIMIT = 20; // Number of chats to fetch per page

export function useChats() {
  const { user, isLoaded } = useUser();

  // getKey tells useSWRInfinite how to generate the API URL for each page.
  const getKey = (pageIndex: number, previousPageData: any) => {
    // If the previous page had no more data, we've reached the end.
    if (previousPageData && !previousPageData.nextPage) return null;

    // If there's no user, don't fetch anything.
    if (!isLoaded || !user) return null;
    
    // For the first page, pageIndex is 0.
    if (pageIndex === 0) return `/api/chats?page=1&limit=${PAGE_LIMIT}`;

    // For subsequent pages, use the `nextPage` cursor from the previous response.
    return `/api/chats?page=${previousPageData.nextPage}&limit=${PAGE_LIMIT}`;
  };

  const { 
    data,    // `data` is now an array of pages: [ {chats: [...]}, {chats: [...]} ]
    error, 
    isLoading: SWRIsLoading, 
    size,    // The number of pages to fetch
    setSize, // Function to set the number of pages
    mutate   // The mutate function for this SWR key
  } = useSWRInfinite(getKey, fetcher, {
    revalidateOnFocus: false,
    revalidateFirstPage: false, // Prevents re-fetching the first page on focus
  });

  // --- PRESERVED AND ADAPTED LOGIC ---
  
  // Your updateChatTitle function, now adapted for the paginated data structure.
  const updateChatTitle = (chatId: string, newTitle: string) => {
    // The `mutate` function for useSWRInfinite works with an array of pages.
    // We need to map through the pages and then map through the chats within each page.
    mutate((currentPagesData = []) => {
      return currentPagesData.map(page => ({
        ...page, // Keep the nextPage cursor and other page data
        chats: page.chats.map((chat: ChatSummary) => 
          chat.id === chatId 
            ? { ...chat, title: newTitle, isOptimistic: false } 
            : chat
        ),
      }));
    }, false); // `false` prevents an immediate revalidation, preserving the optimistic update.
  };
  
  // --- FLATTENING AND STATE CALCULATION ---

  // Flatten the array of pages into a single, flat array of chats for the UI.
  const chats: ChatSummary[] = data ? [].concat(...data.map(page => page.chats)) : [];
  
  // The initial load is when the first page is being fetched.
  const isLoading = SWRIsLoading && !data && !error;
  
  // We are "loading more" if SWR is validating and we have pages.
  const isLoadingMore = SWRIsLoading && (data?.length ?? 0) > 0;
  
  // We have more pages to load if the last fetched page had a `nextPage` cursor.
  const hasMore = data ? data[data.length - 1]?.nextPage !== null : false;

  return {
    // Original return values, now powered by useSWRInfinite
    chats: chats,
    isLoading: isLoading,
    isError: error,
    mutateChats: mutate,
    updateChatTitle, // Your critical function is preserved

    // New return values for infinite scrolling
    isLoadingMore,
    hasMore,
    size,
    setSize,
  };
}