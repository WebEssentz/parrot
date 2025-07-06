// src/components/suggested-prompts.tsx
"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Button } from "./ui/button";
import { memo, useState } from "react";
// Import all the icons you need
import {
  Edit3, Terminal, GitForkIcon, Globe, LinkIcon, Zap, MessageSquareHeart,
  Scale, Lightbulb, Map, HeartPulse, Coffee, Drama, Bot, FileCode, Brain, 
  Sun, Mic,
} from "lucide-react";

interface SuggestedPromptsProps {
  onPromptClick: (prompt: string) => void;
}

// --- 1. Re-structure your data into MODES ---
const PROMPT_MODES = {
  developer: {
    title: "Or, let's build something...",
    prompts: [
      { label: "GitHub Actions", action: "Draft a GitHub Actions workflow to run tests on every pull request.", icon: GitForkIcon, color: "text-blue-500" },
      { label: "Refactor Code", action: "Refactor this messy JavaScript function to be more readable and efficient.", icon: FileCode, color: "text-purple-400" },
      { label: "Scrape Hacker News", action: "Write a Python script to scrape the top 5 posts from Hacker News.", icon: Globe, color: "text-sky-400" },
      { label: "Debug SQL", action: "Debug this SQL query; it's running too slow.", icon: Scale, color: "text-orange-400" },
      { label: "Build a Game", action: "Build a simple snake game in JavaScript.", icon: Terminal, color: "text-violet-400" },
    ]
  },
  creative: {
    title: "Or, let's get creative...",
    prompts: [
      { label: "Sci-Fi Scene", action: "Write the opening scene of a sci-fi noir mystery.", icon: Drama, color: "text-indigo-400" },
      { label: "Brand Names", action: "Give me three compelling names for a new coffee brand.", icon: Coffee, color: "text-yellow-600 dark:text-yellow-500" },
      { label: "Marketing Tagline", action: "Brainstorm a marketing tagline for a new sustainable fashion line.", icon: Lightbulb, color: "text-amber-400" },
      { label: "Product Announcement", action: "Turn this list of features into an exciting product announcement.", icon: Mic, color: "text-pink-400" },
      { label: "Difficult Email", action: "Help me write a difficult email to a client about a project delay.", icon: Edit3, color: "text-purple-400" },
    ]
  },
  strategist: {
    title: "Or, let's make a plan...",
    prompts: [
      { label: "7-Day Itinerary", action: "I'm planning a trip to Japan. Create a 7-day itinerary for Tokyo and Kyoto.", icon: Map, color: "text-teal-400" },
      { label: "Explain a Concept", action: "Explain 'First Principles' thinking with a real-world example.", icon: Brain, color: "text-cyan-400" },
      { label: "Compare Investments", action: "Compare the pros and cons of investing in stocks vs. real estate in a table.", icon: Scale, color: "text-orange-400" },
      { label: "Analyze a URL", action: "Summarize the key arguments in this article: https://www.theverge.com/2024/1/25/24049387/google-search-ai-sge-results-quality", icon: LinkIcon, color: "text-amber-400" },
      { label: "Solve Probability", action: "Help me solve this probability problem: If I roll two dice, what are the odds of getting a sum of 8?", icon: Zap, color: "text-green-400" },
    ]
  },
  casual: {
    title: "Or, just for fun...",
    prompts: [
      { label: "Funny OOO", action: "Draft a funny, slightly sarcastic out-of-office email response.", icon: MessageSquareHeart, color: "text-rose-400" },
      { label: "Workout at Home", action: "Give me a workout routine I can do at home with no equipment.", icon: HeartPulse, color: "text-red-500" },
      { label: "Weekend Activities", action: "Give me some fun activities I can do this weekend.", icon: Sun, color: "text-yellow-400" },
      { label: "Rude Animals", action: "If animals could talk, which species would be the rudest?", icon: Bot, color: "text-slate-400" },
      { label: "Quick Dinner", action: "I'm starving. Suggest a quick and easy recipe for dinner.", icon: Coffee, color: "text-yellow-600 dark:text-yellow-500" },
    ]
  }
};

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function PureSuggestedPrompts({ onPromptClick }: SuggestedPromptsProps) {
  // --- 2. Set up state for the two modes on mount ---
  const [promptModes] = useState(() => {
    const modes = shuffleArray(Object.keys(PROMPT_MODES) as Array<keyof typeof PROMPT_MODES>);
    return {
      initialMode: PROMPT_MODES[modes[0]],
      secondaryMode: PROMPT_MODES[modes[1]],
    };
  });

  const [showSecondary, setShowSecondary] = useState(false);

  // --- 3. Render the new two-row structure ---
  return (
    <div className="flex flex-col items-center gap-3 w-full">

      {/* --- Initial Row + "More" Button --- */}
      <div className="flex flex-wrap gap-3 justify-center">
        {shuffleArray(promptModes.initialMode.prompts).slice(0, 4).map((prompt, index) => (
          <motion.div
            key={prompt.label}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * index, duration: 0.2 }}
          >
            {/* Your button component is unchanged */}
            <Button variant="outline" onClick={() => onPromptClick(prompt.action)} className="h-auto rounded-4xl cursor-pointer px-3 py-2.5 text-sm font-medium border border-zinc-200 dark:border-zinc-700/80 bg-transparent text-zinc-700 dark:text-zinc-300 dark:bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-600/10">
              <div className="flex items-center gap-2">
                <prompt.icon className={`size-4 ${prompt.color}`} />
                <span className="text-gray-700/80 dark:text-[#828282]">{prompt.label}</span>
              </div>
            </Button>
          </motion.div>
        ))}

        {/* The "More" button now only shows if the secondary row is hidden */}
        <AnimatePresence>
          {!showSecondary && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ delay: 0.2, duration: 0.2 }}
            >
              <Button variant="outline" onClick={() => setShowSecondary(true)} className="h-auto rounded-4xl cursor-pointer px-3 py-2.5 text-sm font-medium border border-zinc-200 dark:border-zinc-700/80 bg-transparent text-zinc-700 dark:text-zinc-300 dark:bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-600/10">
                <span className="text-gray-700/80 dark:text-[#828282]">More</span>
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* --- Conditionally Rendered Secondary Row --- */}
      <AnimatePresence>
        {showSecondary && (
          <motion.div
            className="flex flex-col items-center gap-3 w-full"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            <div className="relative w-full max-w-sm flex items-center my-2">
              <div className="flex-grow border-t border-zinc-700"></div>
              <span className="flex-shrink mx-4 text-xs text-zinc-500">
                {promptModes.secondaryMode.title}
              </span>
              <div className="flex-grow border-t border-zinc-700"></div>
            </div>
            <div className="flex flex-wrap gap-3 justify-center">
              {shuffleArray(promptModes.secondaryMode.prompts).slice(0, 4).map((prompt, index) => (
                <Button key={prompt.label} variant="outline" onClick={() => onPromptClick(prompt.action)} className="h-auto rounded-4xl cursor-pointer px-3 py-2.5 text-sm font-medium border border-zinc-200 dark:border-zinc-700/80 bg-transparent text-zinc-700 dark:text-zinc-300 dark:bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-600/10">
                  <div className="flex items-center gap-2">
                    <prompt.icon className={`size-4 ${prompt.color}`} />
                    <span className="text-gray-700/80 dark:text-[#828282]">{prompt.label}</span>
                  </div>
                </Button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export const SuggestedPrompts = memo(PureSuggestedPrompts, () => true);