// app/chat/page.tsx
"use client";

import { useUser } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import UserChat from "@/components/user-chat"; // Your big UserChat component
import { SpinnerIcon } from "@/components/icons";

export default function ChatPage() {
  const { isLoaded, isSignedIn } = useUser();

  // Protect this route. If the user isn't signed in, send them to the landing page.
  if (isLoaded && !isSignedIn) {
    redirect("/");
  }

  // Show a spinner while Clerk is loading the user state
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

  // If we're here, the user is loaded and signed in.
  // Render the full chat experience.
  return <UserChat />;
}