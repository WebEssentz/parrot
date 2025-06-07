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
      <div className="flex items-center justify-center min-h-screen w-full animate-spin">
        <SpinnerIcon size={48} className="text-zinc-400" />
      </div>
    );
  }

  return showUserChat ? <UserChat /> : <Chat />;
}