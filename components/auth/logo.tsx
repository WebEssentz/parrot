// FILE: // components/auth/logo.tsx (CORRECTED)

'use client'

import { motion } from "framer-motion";
import Link from "next/link";

export const BrandLogo = () => {
  return (
    <Link href="/" className="absolute top-6 left-6 z-50">
        <motion.div 
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center gap-2"
        >
          <div className="w-7 h-7">
            {/* Using your brand gradient for the logo background */}
            <div className="w-full h-full rounded-md flex items-center justify-center bg-gradient-to-r from-[#F59E0B] to-[#EF4444]">
                <img
                src="/favicon.ico"
                alt="Avurna Logo"
                className="w-4 h-4"
                />
            </div>
          </div>
          <span className="font-heading text-lg font-medium text-zinc-900 dark:text-white">
            Avurna
          </span>
        </motion.div>
    </Link>
  );
};