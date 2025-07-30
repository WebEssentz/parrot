// components/ui/thinking-indicator.tsx

import { motion } from 'framer-motion';

const dotVariants = {
  initial: {
    y: '0%',
  },
  animate: {
    y: '-100%',
  },
};

const containerVariants = {
  animate: {
    transition: {
      staggerChildren: 0.15,
    },
  },
};

export const ThinkingIndicator = () => {
  return (
    // This is the key: A large container that pushes everything else up.
    // 'min-h-[85dvh]' means it takes up at least 85% of the dynamic viewport height.
    <div className="min-h-[85dvh] flex items-start justify-center pt-10 w-full">
      <div className="flex items-center justify-center gap-2 p-4 rounded-lg">
        {/* Animated Dots Container */}
        <motion.div
          className="flex h-4 w-4 items-end justify-center gap-0.5"
          variants={containerVariants}
          initial="initial"
          animate="animate"
        >
          <motion.span
            className="h-1/2 w-1 rounded-full bg-zinc-500"
            variants={dotVariants}
            transition={{
              duration: 0.5,
              repeat: Infinity,
              repeatType: 'reverse',
              ease: 'easeInOut',
            }}
          />
          <motion.span
            className="h-full w-1 rounded-full bg-zinc-400"
            variants={dotVariants}
            transition={{
              duration: 0.5,
              repeat: Infinity,
              repeatType: 'reverse',
              ease: 'easeInOut',
            }}
          />
        </motion.div>
        <span className="text-zinc-500 dark:text-zinc-400">Thinking...</span>
      </div>
    </div>
  );
};