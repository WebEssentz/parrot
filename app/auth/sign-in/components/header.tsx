"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import Link from "next/link";

export default function SignInHeader() {
  const [isMobile, setIsMobile] = useState(false);
  const { theme } = useTheme();
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  if (!isLoaded) return null;

  // Desktop: Avurna at top left, mobile: as before
  const avurnaClass = "tracking-tight text-2xl sm:text-3xl font-semibold text-center mt-8 mb-10 select-none transition-colors duration-200";
  const avurnaStyle = {
    fontFamily: 'Google Sans, "Helvetica Neue", sans-serif',
    letterSpacing: 'normal',
    lineHeight: '1.2',
    fontWeight: 300,
    fontSize: '1.5rem',
  };
  if (!isMobile) {
    return (
      <header style={{ position: 'fixed', top: 16, left: 0, right: 3, zIndex: 50, padding: '0.5rem 1.5rem', borderRadius: '1.5rem', marginTop: 0 }}>
        <span
          className={avurnaClass + ' ' + (theme === 'dark' ? 'text-white' : 'text-black')}
          style={avurnaStyle}
        >
          Avurna
        </span>
      </header>
    );
  }
  // Mobile: original layout
  return (
    <header className="w-full flex flex-col items-center mb-6" style={{ marginTop: 30 }}>
      <span className="flex flex-row items-center gap-2 home-links">
        <span
          className={avurnaClass + ' ' + (theme === 'dark' ? 'text-white' : 'text-black')}
          style={avurnaStyle}
        >
          Avurna
        </span>
      </span>
    </header>
  );
}