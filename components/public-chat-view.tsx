// FILE: components/public-chat-view.tsx

"use client";

import { Messages } from "./messages";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from 'date-fns';
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

// Define the shape of the chat data for type safety and clarity.
interface PublicChatData {
  id: string;
  title: string;
  messages: any[]; // Assuming 'any' for now, but should be a specific Message type
  updatedAt: string;
  user: {
    username: string | null;
    profilePic: string | null;
  };
}

export const PublicChatView = ({ chat }: { chat: PublicChatData }) => {
  // Determine author name and initial for fallbacks
  const authorName = chat.user.username || 'Anonymous';
  const authorInitial = authorName.charAt(0).toUpperCase();

  return (
    // A deep, dark background for a premium, focused feel.
    <div className="bg-white dark:bg-[#121212] min-h-screen text-zinc-800 dark:text-zinc-200">
      
      {/* --- Ultra-Minimalist Header --- */}
      {/* The header is now extremely subtle, aligning with the content width. */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/80 dark:bg-[#121212]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14">
            
            {/* Brand Name: Clean, simple text. No extra icons. */}
            <Link href="/" className="group">
              <span className="font-semibold text-zinc-900 dark:text-white group-hover:text-black dark:group-hover:text-zinc-200 transition-colors">
                Avurna
              </span>
            </Link>

            {/* Sleek Call to Action Button */}
            {/* This "ghost" style button is subtle and modern. */}
            <Button asChild variant="ghost" size="sm" className="rounded-full h-8 px-3 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-zinc-100">
              <Link href="/chat">
                New Chat
                <ArrowUpRight className="w-4 h-4 ml-1.5" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* --- Main Content Area --- */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <article>

          {/* --- Article Header: Title & Refined Byline --- */}
          <header className="mb-12">
            {/* The main title remains strong and centered. */}
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-center text-zinc-900 dark:text-zinc-50 mb-5">
              {chat.title}
            </h1>

            {/* Author Byline: Now more compact and visually balanced. */}
            <div className="flex items-center justify-center gap-2.5">
              <Avatar className="w-7 h-7">
                <AvatarImage src={chat.user.profilePic ?? undefined} alt={authorName} />
                <AvatarFallback className="text-xs">{authorInitial}</AvatarFallback>
              </Avatar>
              <div className="text-sm">
                {/* 'Anonymous' text is now font-medium, not semibold, for better blending. */}
                <span className="font-medium text-zinc-800 dark:text-zinc-200">{authorName}</span>
                <span className="text-zinc-500 dark:text-zinc-500 mx-1.5">·</span>
                <span className="text-zinc-500 dark:text-zinc-500">
                  {formatDistanceToNow(new Date(chat.updatedAt), { addSuffix: true })}
                </span>
              </div>
            </div>
          </header>
          
          {/* --- Chat Messages --- */}
          {/* Using Tailwind's prose for beautiful, automatic typography styling. */}
          <div className="prose prose-zinc dark:prose-invert prose-lg max-w-none">
             <Messages messages={chat.messages} isLoading={false} status="ready"/>
          </div>
        </article>
      </main>
    </div>
  );
};