// components/ChatHistoryList.tsx
"use client"

import { ChatHistoryItem } from "./ChatHistoryItem";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useChats } from "@/hooks/use-chats";

export const ChatHistoryList = () => {
  const params = useParams();
  const router = useRouter();
  const { chats, isLoading, isError } = useChats();
  const activeChatId = Array.isArray(params.id) ? params.id[0] : params.id;

  const handleChatClick = (id: string) => {
    router.push(`/chat/${id}`);
  };

  if (isLoading) { /* ... no change ... */ }
  if (isError) { /* ... no change ... */ }
  if (!Array.isArray(chats) || chats.length === 0) { return null; }

  return (
    // The component container no longer needs its own top margin.
    // The parent `sidebar.tsx` will handle that.
    <div className="flex flex-col">
      {/* --- THE REFINED SECTION HEADER --- */}
      {/* This is now much more subtle and professional. */}
      <div className="px-4 py-1 mb-1">
        <span className="text-sm font-semibold tracking-wide text-zinc-900/40 dark:text-zinc-600/90">
          Chats
        </span>
      </div>
      
      {/* The actual list of chats */}
      <div className="flex flex-col space-y-1 px-2">
        {chats.map((chat) => (
          <ChatHistoryItem
            key={chat.id}
            chat={chat}
            isActive={chat.id === activeChatId}
            onClick={() => handleChatClick(chat.id)}
          />
        ))}
      </div>
    </div>
  );
};