"use client";

import { motion } from 'framer-motion';
import React, { useState, useEffect } from 'react';

// A more dynamic placeholder for the Avurna visualizer.
// This simulates the different states of the conversation.
const FlowVisualizer = () => {
  const [state, setState] = useState<'listening' | 'speaking'>('listening');
  const barCount = 5;

  // This is just for demonstration. We'll hook this up to the real agent state later.
  useEffect(() => {
    const interval = setInterval(() => {
      setState(currentState => (currentState === 'listening' ? 'speaking' : 'listening'));
    }, 2000); // Switch between states every 2 seconds
    return () => clearInterval(interval);
  }, []);
  
  const barVariants = {
    listening: (i: number) => ({
      height: ['40%', '20%', '60%', '30%', '50%'][i % 5],
      transition: {
        duration: 0.8,
        repeat: Infinity,
        repeatType: 'mirror',
        ease: 'easeInOut',
        delay: i * 0.1,
      },
    }),
    speaking: (i: number) => ({
      height: ['80%', '50%', '100%', '70%', '90%'][i % 5],
      transition: {
        duration: 0.4,
        repeat: Infinity,
        repeatType: 'mirror',
        ease: 'easeInOut',
        delay: i * 0.05,
      },
    }),
  };

  return (
    <div className="w-48 h-48 flex items-center justify-center gap-2">
      {Array.from({ length: barCount }).map((_, i) => (
        <motion.div
          key={i}
          custom={i}
          variants={barVariants}
          animate={state}
          className="w-4 bg-gray-400 dark:bg-gray-600 rounded-full"
          style={{ originY: 0.5 }}
        />
      ))}
    </div>
  );
};


interface FlowOverlayProps {
    onClose: () => void;
}

export const FlowOverlay: React.FC<FlowOverlayProps> = ({ onClose }) => {
    return (
        <motion.div
            key="flow-overlay"
            // UPDATED: Replaced semi-transparent blur with solid colors
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white dark:bg-[#1C1C1C]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
        >
            <div className="flex-grow flex items-center justify-center">
                <FlowVisualizer />
            </div>

            <div className="w-full pb-10">
                <motion.button
                    onClick={onClose}
                    // UPDATED: New button styles for better visibility & cursor
                    className="mx-auto block px-6 py-2 bg-gray-200 text-black dark:bg-[#333333] dark:text-white rounded-full cursor-pointer"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    End Flow
                </motion.button>
            </div>
        </motion.div>
    );
};