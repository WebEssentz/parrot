"use client";

import dynamic from "next/dynamic";
import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { SpinnerIcon } from "@/components/icons";

const UserChat = dynamic(() => import("@/components/user-chat"), { ssr: false });
const Chat = dynamic(() => import("@/components/chat"), { ssr: false });

export default function Page() {
  const { user, isLoaded } = useUser();
  const [showUserChat, setShowUserChat] = useState(false);

  useEffect(() => {
    if (isLoaded && user) {
      setShowUserChat(true);
    } else {
      setShowUserChat(false);
    }
  }, [isLoaded, user]);

  if (!isLoaded) {
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

  return showUserChat ? <UserChat /> : <Chat />;
}