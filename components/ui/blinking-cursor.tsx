// src/components/ui/blinking-cursor.tsx

"use client";
import { motion } from "framer-motion";

export const BlinkingCursor = () => {
  return (
    <motion.div
      className="ml-1 h-4 w-0.5 bg-zinc-300"
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 1, 0] }}
      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
    />
  );
};