// components/ChatHistoryItem.tsx

import { Trash2, Edit3 } from "lucide-react";
import clsx from "clsx";

interface ChatHistoryItemProps {
  chat: {
    id: string;
    title: string;
  };
  isActive: boolean;
  onClick: () => void;
}

export const ChatHistoryItem = ({
  chat,
  isActive,
  onClick,
}: ChatHistoryItemProps) => {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "group w-full h-10 flex items-center justify-start px-3 rounded-lg relative",
        "text-left text-sm truncate cursor-pointer",
        
        // --- THE HIERARCHY FIX ---
        {
          // ACTIVE state: Has a solid background and heavier font. It's clearly the focus.
          "bg-zinc-200/80 dark:bg-zinc-700/20 text-zinc-900 dark:text-zinc-100 font-medium": isActive,
          
          // INACTIVE state: Just text. A background ONLY appears on hover.
          "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/70 dark:hover:bg-zinc-700/30": !isActive,
        }
      )}
    >
      <span className="flex-grow truncate pr-12"> 
        {chat.title}
      </span>

      {/* --- HOVER ACTIONS --- */}
      {/* This gradient logic is already good, but now it blends with a transparent background by default. */}
      <div
        className={clsx(
          "absolute right-0 top-0 h-full flex items-center pr-2",
          "bg-gradient-to-l from-10% pl-6",
          // The gradient must now match the background state exactly
          {
            "from-zinc-200/80 dark:from-zinc-800/80": isActive,
            // When inactive, it's transparent, but on hover it gets the hover color.
            "from-transparent group-hover:from-zinc-200/70 dark:from-transparent dark:group-hover:from-zinc-800/70": !isActive,
          },
          // Control visibility
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