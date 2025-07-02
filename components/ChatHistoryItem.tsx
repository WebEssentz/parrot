"use client";

import { Trash2, Edit3 } from "lucide-react";
import clsx from "clsx";
import { useEffect, useState, useRef } from "react";

// --- THE TYPEWRITER EFFECT HOOK ---
// This hook is now simpler. It just types out the text it's given.
// The logic for *when* to type will be in the component.
const useTypewriter = (text: string, speed: number = 30) => {
  const [displayText, setDisplayText] = useState("");

  useEffect(() => {
    let i = 0;
    // We start with an empty string to ensure the typing animation begins.
    setDisplayText(""); 

    const typingInterval = setInterval(() => {
      if (i < text.length) {
        setDisplayText(prev => prev + text.charAt(i));
        i++;
      } else {
        clearInterval(typingInterval);
      }
    }, speed);

    return () => clearInterval(typingInterval);
  }, [text, speed]); // Re-run whenever the target text changes.

  return displayText;
};


interface ChatHistoryItemProps {
  chat: {
    id: string;
    title: string;
    isOptimistic?: boolean; 
  };
  isActive: boolean;
  onClick: () => void;
}

export const ChatHistoryItem = ({
  chat,
  isActive,
  onClick,
}: ChatHistoryItemProps) => {
  // --- THIS IS THE FIX ---
  // 1. A ref to store the title that was last rendered.
  const prevTitleRef = useRef<string | null>(null);
  
  // 2. State to control whether the typewriter effect should run.
  const [shouldAnimate, setShouldAnimate] = useState(false);

  useEffect(() => {
    const previousTitle = prevTitleRef.current;
    const currentTitle = chat.title;

    // 3. Condition to trigger the animation:
    // - The title must have changed from the previous render.
    // - The previous title must have been "New Chat".
    // - The new title cannot be "New Chat".
    if (
      currentTitle !== previousTitle &&
      previousTitle === 'New Chat' &&
      currentTitle !== 'New Chat'
    ) {
      setShouldAnimate(true);
    } else {
      // For all other cases (e.g., initial load, no change), don't animate.
      setShouldAnimate(false);
    }

    // 4. Update the ref to the current title for the next render cycle.
    prevTitleRef.current = currentTitle;
  }, [chat.title]); // This effect runs only when the chat title prop changes.

  // 5. Use the hook conditionally.
  const typedTitle = useTypewriter(chat.title);

  // 6. Decide which title to display.
  // - If it's active, show the full title instantly.
  // - If it should animate, show the `typedTitle`.
  // - Otherwise, show the full title instantly.
  const finalTitle = isActive ? chat.title : shouldAnimate ? typedTitle : chat.title;

  return (
    <button
      onClick={onClick}
      className={clsx(
        "group w-full h-10 flex items-center justify-start px-3 rounded-lg relative",
        "text-left text-sm truncate cursor-pointer",
        {
          "bg-zinc-200/80 dark:bg-zinc-700/20 text-zinc-900 dark:text-zinc-100 font-medium": isActive,
          "text-zinc-600 dark:text-zinc-300/70 hover:bg-zinc-200/70 dark:hover:bg-zinc-700/30": !isActive,
        }
      )}
    >
      <span className="flex-grow truncate pr-12"> 
        {finalTitle}
      </span>

      {/* --- HOVER ACTIONS (Unchanged) --- */}
      <div
        className={clsx(
          "absolute right-0 top-0 h-full flex items-center pr-2",
          "bg-gradient-to-l from-10% pl-6",
          {
            "from-zinc-200/80 dark:from-zinc-800/80": isActive,
            "from-transparent group-hover:from-zinc-200/70 dark:from-transparent dark:group-hover:from-zinc-800/70": !isActive,
          },
          "opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        )}
      >
        <div 
          className="flex items-center" 
          onClick={(e) => e.stopPropagation()}
        >
          <button className="p-1 rounded hover:text-zinc-900 dark:hover:text-white"><Edit3 size={14}/></button>
          <button className="p-1 rounded hover:text-red-500"><Trash2 size={14}/></button>
        </div>
      </div>
    </button>
  );
};