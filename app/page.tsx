"use client";

import dynamic from "next/dynamic";
import { redirect } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { SpinnerIcon } from "@/components/icons";

const Chat = dynamic(() => import("@/components/chats/chat"), { ssr: false });

export default function Page() {
  const { user, isLoaded } = useUser();

  // When Clerk is loaded, if the user is signed in,
  // redirect them immediately to the main chat interface.
  if (isLoaded && user) {
    redirect("/chat"); // Redirect to the page that has the sidebar
  }

  if (!isLoaded) {
    return (
      // 1. REMOVE `animate-spin` from the container div
      <div className="flex items-center justify-center min-h-screen w-full">
        {/* 2. ADD `animate-spin` to the SpinnerIcon component itself */}
        <SpinnerIcon size={48} className="text-zinc-400 animate-spin" />
      </div>
    );
  }

  return <Chat />;
}