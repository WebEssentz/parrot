// FILE: hooks/use-chats.ts

"use client"

import { useUser } from "@clerk/nextjs"
import useSWRInfinite from "swr/infinite"

export type ChatSummary = {
  id: string
  title: string
  isOptimistic?: boolean
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

const PAGE_LIMIT = 20

// Global state to prevent revalidation during rename operations
let isRenamingInProgress = false

export const setRenamingState = (state: boolean) => {
  isRenamingInProgress = state
}

export const getRenamingState = () => isRenamingInProgress

export function useChats() {
  const { user, isLoaded } = useUser()

  const getKey = (pageIndex: number, previousPageData: any) => {
    // NEVER return null for existing data - just don't fetch new pages during rename
    if (previousPageData && !previousPageData.nextPage) return null
    if (!isLoaded || !user) return null

    if (pageIndex === 0) return `/api/chats?page=1&limit=${PAGE_LIMIT}`
    return `/api/chats?page=${previousPageData.nextPage}&limit=${PAGE_LIMIT}`
  }

  const {
    data,
    error,
    isLoading: SWRIsLoading,
    size,
    setSize,
    mutate,
  } = useSWRInfinite(getKey, fetcher, {
    // Keep the data during rename operations
    revalidateOnFocus: false,
    revalidateFirstPage: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
    revalidateOnMount: true,
    refreshInterval: 0,
    dedupingInterval: 60000,
    revalidateAll: false,
    // Keep the cache during operations
    keepPreviousData: true,
  })

  // Enhanced updateChatTitle function with optimistic updates
  const updateChatTitle = (chatId: string, newTitle: string, isOptimistic = false) => {
    mutate(
      (currentPagesData) => {
        // Ensure we have data to work with
        if (!currentPagesData || !Array.isArray(currentPagesData)) {
          return currentPagesData
        }

        return currentPagesData.map((page) => {
          if (!page || !page.chats || !Array.isArray(page.chats)) {
            return page
          }

          return {
            ...page,
            chats: page.chats.map((chat: ChatSummary) =>
              chat.id === chatId ? { ...chat, title: newTitle, isOptimistic } : chat,
            ),
          }
        })
      },
      { revalidate: false },
    )
  }

  // Function to delete a chat with optimistic updates
  const deleteChat = (chatId: string) => {
    mutate(
      (currentPagesData) => {
        if (!currentPagesData || !Array.isArray(currentPagesData)) {
          return currentPagesData
        }

        return currentPagesData.map((page) => {
          if (!page || !page.chats || !Array.isArray(page.chats)) {
            return page
          }

          return {
            ...page,
            chats: page.chats.filter((chat: ChatSummary) => chat.id !== chatId),
          }
        })
      },
      { revalidate: false },
    )
  }

  // Function to manually revalidate when needed (not during rename)
  const revalidateChats = () => {
    if (!isRenamingInProgress) {
      mutate()
    }
  }

  // Safer setSize that respects rename state
  const safeSetSize = (newSize: number) => {
    if (!isRenamingInProgress) {
      setSize(newSize)
    }
  }

  const chats: ChatSummary[] = data ? [].concat(...data.map((page) => page.chats || [])) : []
  const isLoading = SWRIsLoading && !data && !error
  const isLoadingMore = SWRIsLoading && (data?.length ?? 0) > 0 && !isRenamingInProgress
  const hasMore = data ? data[data.length - 1]?.nextPage !== null : false

  return {
    chats,
    isLoading,
    isError: error,
    mutateChats: mutate,
    revalidateChats,
    updateChatTitle,
    deleteChat,
    isLoadingMore,
    hasMore,
    size,
    setSize: safeSetSize,
  }
}
