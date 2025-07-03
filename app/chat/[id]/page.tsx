// app/chat/[id]/page.tsx

"use client";

import { useEffect, useState } from "react";
import React from "react";
import UserChat from "@/components/user-chat"; // We will reuse our main chat component
import { SpinnerIcon } from "@/components/icons";

// This page component receives `params` which contains the dynamic route segments.
export default function ChatPage({ params }: { params: { id: string } }) {
  // State to hold the chat data we fetch from the DB
  const [chatData, setChatData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

// In client components, params is always a plain object
  const { id: chatId } = params;

  useEffect(() => {
    const fetchChat = async () => {
      if (!chatId) return;
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/chats/${chatId}`);
        if (!response.ok) {
          throw new Error('Failed to load chat. It may not exist or you may not have permission.');
        }
        const data = await response.json();
        setChatData(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchChat();
  }, [chatId]); // The dependency is just the ID string.

  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center min-h-screen w-full animate-spin"
        style={{
          overscrollBehavior: 'none',
          overflow: 'hidden',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        <style>{`
          html, body, #__next {
            overflow: hidden !important;
            overscroll-behavior: none !important;
          }
          .hide-scrollbar::-webkit-scrollbar {
            display: none !important;
          }
        `}</style>
        <SpinnerIcon size={48} className="text-zinc-400 hide-scrollbar" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center text-red-500">
        <p>{error}</p>
      </div>
    );
  }

  // Once data is loaded, pass it to the UserChat component
  // We'll need to update UserChat to accept this data as a prop.
  return <UserChat key={chatId} initialChat={chatData} />;
}