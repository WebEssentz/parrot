'use client'

import { cn } from "@/lib/utils";

// --- FIX: The AuthContainer is now just a centering element. The logo will be handled by the page. ---
export const AuthContainer = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-zinc-50 dark:bg-[#1C1C1C] p-4">
      {children}
    </div>
  );
};

// --- FIX: A completely rebuilt, professional-grade OAuth button with a premium dark mode palette ---
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
        w-full h-11 flex items-center justify-start
        px-4 rounded-md /* Slightly sharper corners */
        font-medium text-sm text-zinc-700 dark:text-zinc-200
        transition-colors duration-200 cursor-pointer
        bg-white dark:bg-[#27272A] /* Lighter charcoal for contrast */
        border border-zinc-300 dark:border-zinc-800 /* Subtle border for depth */
        hover:bg-zinc-100 dark:hover:bg-zinc-800 /* Clear hover state */
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-orange-500 dark:focus-visible:ring-offset-black
        relative
      `, className)}
    >
      {icon}
      <span className="absolute left-1/2 -translate-x-1/2">
        {label}
      </span>
    </button>
  );
};