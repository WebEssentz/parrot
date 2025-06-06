// components/auth/logo.tsx
'use client'

import { motion } from "framer-motion";
import { useTheme } from "next-themes";

export const BrandLogo = () => {
  const { theme } = useTheme();

  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="fixed top-5 left-6 sm:top-5 sm:left-6 flex items-center gap-2 sm:gap-3 z-50"
    >
      <div className="relative w-6 h-6 sm:w-8 sm:h-8">
        {/* Replace with your actual logo SVG */}
        <motion.svg
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
          whileHover={{ scale: 1.05 }}
        >
          <motion.path
            d="M20 4L36 32H4L20 4Z"
            fill={theme === 'dark' ? '#fff' : '#000'}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
          />
        </motion.svg>
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