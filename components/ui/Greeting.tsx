// FILE: components/ui/Greeting.tsx

"use client";

import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion'; // Import framer-motion

// --- (No changes to the templates or random selection logic) ---
type RecentChat = { id: string; title: string; };

const GREETING_TEMPLATES = [
  "Ready when you are, {displayName}.",
  "The session is yours, {displayName}.",
  "Let the thinking begin, {displayName}.",
  "What problem can we solve together, {displayName}?",
  "A fresh canvas awaits, {displayName}.",
  "Hello, {displayName}. What's on your mind?",
  "Welcome back, {displayName}. Good to see you.",
];

const getRandomGreeting = () => {
    const availableMessages = [...GREETING_TEMPLATES];
    const hour = new Date().getHours();

    if (hour >= 18 || hour < 4) {
      availableMessages.push("Evening, {displayName}! Ready to dive in?");
      availableMessages.push("Good evening, {displayName}. What shall we explore?");
    }
    
    if (hour >= 12 && hour < 18) availableMessages.push("Good afternoon, {displayName}.");
    if (hour >= 4 && hour < 12) availableMessages.push("Good morning, {displayName}.");

    const randomIndex = Math.floor(Math.random() * availableMessages.length);
    return availableMessages[randomIndex];
};

// --- Animation Variants for a staggered fade-in effect ---
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2, // Time between children animating in
    },
  },
};

const itemVariants = {
  hidden: { y: 10, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.4,
    },
  },
};


export function Greeting() {
  const { user, isLoaded } = useUser();
  const router = useRouter();

  const [recentChat, setRecentChat] = useState<RecentChat | null>(null);
  const [randomGreeting, setRandomGreeting] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeGreeting = async () => {
      setRandomGreeting(getRandomGreeting());
      try {
        const response = await fetch('/api/chats/recent');
        if (response.ok) {
          const data = await response.json();
          setRecentChat(data);
        }
      } catch (error) {
        console.error("Could not fetch recent chat.", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (isLoaded && user) {
      initializeGreeting();
    } else if (!isLoaded) {
        setIsLoading(false);
    }
  }, [isLoaded, user]);

  const handleContinueChat = () => {
    if (recentChat) {
      router.push(`/chat/${recentChat.id}`);
    }
  };

  const displayName = user?.firstName || user?.username || "User";

  if (isLoading) {
    return <div className="h-16 w-80 bg-zinc-200 dark:bg-zinc-800 animate-pulse rounded-lg" />; 
  }

  // --- RENDER LOGIC with ANIMATION ---

  if (recentChat) {
    return (
      <motion.div
        className="w-full flex flex-col items-center text-center"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.h1 variants={itemVariants} className="font-heading text-2xl sm:text-3xl font-medium text-zinc-900 dark:text-zinc-200">
          Welcome back,{' '}
          <span className="bg-gradient-to-r from-[#F59E0B] to-[#EF4444] bg-clip-text text-transparent">
            {displayName}
          </span>
        </motion.h1>

        {/* --- HERE ARE THE STYLING FIXES --- */}
        <motion.p variants={itemVariants} className="mt-4 text-base text-zinc-500 dark:text-zinc-400">
          Shall we continue our discussion on{' '}
          <button 
            onClick={handleContinueChat}
            className="font-medium text-zinc-800 dark:text-zinc-200 hover:underline focus:outline-none focus:ring-1 focus:ring-orange-500 rounded-sm transition-all"
          >
            {recentChat.title}?
          </button>          
        </motion.p>
      </motion.div>
    );
  }

  const parts = randomGreeting.split('{displayName}');
  const partBeforeName = parts[0];
  const partAfterName = parts[1] || "";
  
  return (
    <div className="w-full flex flex-col items-center">
      <h1 className="font-heading text-2xl sm:text-3xl font-medium tracking-tight text-zinc-900 dark:text-zinc-200 text-center select-none">
        {partBeforeName}
        <span className="bg-gradient-to-r from-[#F59E0B] to-[#EF4444] bg-clip-text text-transparent">
          {displayName}
        </span>
        {partAfterName}
      </h1>
    </div>
  );
}