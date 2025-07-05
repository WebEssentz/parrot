// app/chat/[[...id]]/page.tsx

"use client";

import React from "react";
import useSWR from 'swr';
import UserChat from "@/components/user-chat";
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
      <div className="flex items-center justify-center min-h-screen w-full animate-spin">
        <SpinnerIcon size={48} className="text-zinc-400" />
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
  // Pass the chatData (which will be `null` for a new chat, or the object for an existing one).
  // The key ensures the component correctly resets if you navigate from one chat to another.
  return <UserChat key={chatId} initialChat={chatData} />;
}