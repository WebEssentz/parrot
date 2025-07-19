"use client";

import React from "react";
import useSWR from 'swr';
import UserChat from "@/components/chats/user-chat";
import { SpinnerIcon } from "@/components/icons";

const fetcher = (url: string) => fetch(url).then(res => {
  if (!res.ok) {
    throw new Error('Failed to load chat. It may not exist or you may not have permission.');
  }
  return res.json();
});

// This page now handles both `/chat` and `/chat/[id]`
export default function UnifiedChatPage({ params }: { params: { id?: string[] } }) {
  // The ID is now the first element of the optional array, or undefined
  const chatId = params.id?.[0];

  const { data: chatData, error, isLoading } = useSWR(
    chatId ? `/api/chats/${chatId}` : null, // Only fetch if chatId exists
    fetcher,
    { revalidateOnFocus: false }
  );

  // Show a loading spinner ONLY if we are expecting to load an existing chat.
  if (isLoading && chatId) {
    return (
      <div className="flex items-center justify-center min-h-screen w-full">
        <SpinnerIcon size={48} className="text-zinc-400 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center text-red-500">
        <p>{error.message}</p>
      </div>
    );
  }

  // If there's no ID, or if data is loaded, render the chat component.
  return (
    // This container MUST fill the screen for UserChat to expand correctly.
    <main className="h-dvh w-full"> 
      <UserChat key={chatId} initialChat={chatData} />
    </main>
  );
}