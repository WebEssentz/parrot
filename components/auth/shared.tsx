'use client'

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { BrandLogo } from "./logo";

export const AuthContainer = ({ children }: { children: React.ReactNode }) => {
  return (
    // Clean, simple background for both light and dark mode
    <div className="min-h-screen w-full flex items-center justify-center bg-white dark:bg-zinc-900 p-4">
      <BrandLogo />
      {/* --- FIX: Reduced the max-width and width to make the content block smaller --- */}
      <div className="w-full max-w-md mx-auto lg:mx-0 lg:max-w-none lg:w-2/5 lg:pl-16">
        {children}
      </div>
    </div>
  );
};

export const OAuthButton = ({
  icon,
  label,
  onClick,
  className = ""
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  className?: string;
}) => {
  return (
    <button
      onClick={onClick}
      className={cn(`
        w-full h-12 flex items-center justify-start gap-3 /* Changed to justify-start */
        px-4 rounded-lg
        font-medium text-sm text-zinc-800 dark:text-zinc-200
        transition-colors duration-200
        border border-zinc-200 dark:border-zinc-700
        bg-white dark:bg-zinc-900
        hover:bg-zinc-100 dark:hover:bg-zinc-800
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-orange-500 dark:focus-visible:ring-offset-zinc-900
        relative /* Added relative positioning */
      `, className)}
    >
      {icon}
      <span className="absolute left-1/2 -translate-x-1/2"> {/* Added absolute positioning for centering */}
        {label}
      </span>
    </button>
  );
};