import NextLink from "next/link";
import React, { useEffect, useState } from "react";
import { useMobile } from "../hooks/use-mobile";

export const ProjectOverview = () => {
  const [isTablet, setIsTablet] = useState(false);
  const isMobile = useMobile();
  useEffect(() => {
    const check = () => setIsTablet(window.innerWidth >= 640 && window.innerWidth < 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Enterprise: Only push down on mobile (not tablet)
  // useMobile returns true for <768px, so we want <640px for mobile only
  // We'll use isMobile && !isTablet
  const pushDown = isMobile && !isTablet;

  return (
    <div
      className={`flex flex-col items-center justify-end ${isTablet ? 'pb-64' : 'pb-44'} sm:pb-0`}
      style={pushDown ? { marginTop: '25vh' } : undefined}
    >
      <h1 className="w-full text-2xl sm:text-3xl text-primary flex flex-col items-center tracking-tight text-center">
        {/* Wrapper for the first line to make "Hi, I'm Atlas" a single flex item */}
        <div className="flex items-baseline"> {/* Aligns "Hi, I'm" and "Atlas" along their text baseline */}
          Hi, I'm  {/* Use non-breaking space for proper spacing */}
          <span className="font-bold bg-gradient-to-r from-red-500 via-purple-500 to-blue-500 text-transparent bg-clip-text">
            Atlas
          </span>
        </div>

        {/* Second line - sub-headline */}
        {/* Overriding inherited font size to be smaller, adjusting color, and adding margin */}
        <span className="text-zinc-500 dark:text-gray">
          What brings you here today?
        </span>
      </h1>
    </div>
  );
};

// Link component (remains unchanged)
const Link = ({
  children,
  href,
}: {
  children: React.ReactNode;
  href: string;
}) => {
  return (
    <NextLink
      target="_blank"
      className="text-blue-500 hover:text-blue-600 transition-colors duration-75"
      href={href}
    >
      {children}
    </NextLink>
  );
};