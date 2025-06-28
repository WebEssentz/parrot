// src/components/suggested-prompts.tsx

"use client";

import { motion } from "framer-motion";
import { Button } from "./ui/button";
import { memo } from "react";
import {
  Edit3,      
  Terminal,
  GitForkIcon,
  Globe,
  LinkIcon,
} from "lucide-react";

interface SuggestedPromptsProps {
  sendMessage: (input: string) => void;
}

// --- Data for the prompts: Short labels, powerful actions, and vibrant icons ---
// --- Data for the prompts: Short labels, powerful actions, and vibrant icons ---
const suggestedActions = [
  {
    label: "GitHub Actions",
    // This remains the hero prompt. It's ambitious, specific, and showcases the core developer power.
    action: "Improve the performance of `utils.js` in the `facebook/react` repo.",
    icon: GitForkIcon, 
    color: "text-blue-500",
  },
  {
    label: "Web Search",
    // THE NEW PROMPT: A multi-step, culturally relevant task that feels like magic.
    // It requires her to 1) search for the #1 song, then 2) find and render its music video.
    // This perfectly aligns with her "vibe-checking," "music curator" persona.
    action: "Show me the music video for the current #1 song on the Billboard Hot 100.",
    icon: Globe,
    color: "text-sky-400",
  },
  {
    label: "Creative Writing",
    // This remains a strong showcase of her high-EQ, creative side.
    action: "Write the opening scene of a sci-fi noir mystery.",
    icon: Edit3,
    color: "text-purple-400",
  },
  {
    label: "URL Analysis",
    // THE NEW PROMPT: This is no longer a question, but a direct command to use her vision.
    // It's a "show, don't tell" demonstration of extracting specific media from a live website.
    action: "Show me images of the latest iPhone from apple.com.",
    icon: LinkIcon,
    color: "text-amber-400",
  },
  {
    label: "Code",
    // This remains a fun, impressive, and self-contained coding challenge.
    action: "Build a simple snake game in JavaScript.",
    icon: Terminal,
    color: "text-violet-400",
  },
];

function PureSuggestedPrompts({ sendMessage }: SuggestedPromptsProps) {
  return (
    // --- Layout Fix: Flexbox that wraps, aligned left like ChatGPT ---
    <div
      data-testid="suggested-actions"
      className="flex flex-wrap gap-3 justify-start ml-10"
    >
      {suggestedActions.map((suggestedAction, index) => {
        const IconComponent = suggestedAction.icon;
        
        return (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * index, duration: 0.2 }}
            key={suggestedAction.label}
          >
            <Button
              variant="outline"
              onClick={() => sendMessage(suggestedAction.action)}
              // --- CRITICAL STYLE OVERHAUL FOR PROFESSIONAL BUTTONS ---
              className="
                h-auto rounded-4xl
                cursor-pointer 
                px-3 py-2.5 
                text-sm font-medium
                border shadow-sm
                border-zinc-200 dark:border-zinc-700/80
                bg-white text-zinc-700 dark:text-zinc-300 dark:bg-transparent
                hover:bg-zinc-100 dark:hover:bg-zinc-600/10           
              "
            >
              {/* Icon and Text are now aligned side-by-side */}
              <div className="flex items-center gap-2">
                <IconComponent className={`size-4 ${suggestedAction.color}`} />
                <span className="text-gray-700/80 dark:text-[#828282]">
                  {suggestedAction.label}
                </span>
              </div>
            </Button>
          </motion.div>
        );
      })}
    </div>
  );
}

export const SuggestedPrompts = memo(PureSuggestedPrompts, () => true);