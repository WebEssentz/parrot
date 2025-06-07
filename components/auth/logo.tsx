// components/auth/logo.tsx
'use client'

import { motion } from "framer-motion";
import { useTheme } from "next-themes";

export const BrandLogo = () => {
  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="fixed top-5 left-6 sm:top-5 sm:left-6 flex items-center gap-2 sm:gap-3 z-50"
    >
      <div className="relative w-6 h-6 sm:w-8 sm:h-8">
        <img
          src="/favicon-chat-sdk.dev.ico"
          alt="Avurna Logo"
          className="w-full h-full rounded"
          style={{ display: 'block' }}
        />
      </div>
      <motion.span 
        className="text-base sm:text-lg font-semibold hidden sm:block text-zinc-800 dark:text-white"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        style={{ marginTop: '-2px' }}
      >
        Avurna
      </motion.span>
    </motion.div>
  );
};