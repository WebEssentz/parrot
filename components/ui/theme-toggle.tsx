"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  // useEffect only runs on the client, so we can safely show the UI
  // after the component has mounted.
  useEffect(() => {
    setMounted(true);
  }, []);

  // Until the component is mounted, we can return null or a placeholder.
  // This prevents the hydration mismatch.
  if (!mounted) {
    return (
      <div
        aria-label="Toggle theme"
        className="p-2 rounded-full w-9 h-9 animate-pulse bg-zinc-200 dark:bg-zinc-800"
      />
    );
  }

  return (
    <button
      aria-label="Toggle theme"
      className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
    >
      {theme === "dark" ? (
        <Sun className="w-5 h-5" />
      ) : (
        <Moon className="w-5 h-5" />
      )}
    </button>
  );
}