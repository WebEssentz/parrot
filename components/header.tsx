
import Link from "next/link";
import { SignUpButton } from "./deploy-button";
import { ThemeToggle } from "./theme-toggle";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { BrandLogo } from "./auth/logo";

export const Header = () => {
  const [showBorder, setShowBorder] = useState(false);
  const [isMobileOrTablet, setIsMobileOrTablet] = useState(false);
  const { theme } = useTheme();
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const check = () => setIsMobileOrTablet(window.innerWidth < 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    const onScroll = () => {
      setShowBorder(window.scrollY > 2);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Wait until page is fully loaded (client-side hydration complete)
  useEffect(() => {
    setIsLoaded(true);
  }, []);

  if (!isLoaded) return null;

  return (
    <div
      className={
      `fixed right-0 left-0 w-full top-0 bg-[#F7F7F8] dark:bg-[#1C1C1C] z-50` +
        (showBorder ? " border-b border-zinc-200 dark:border-zinc-800" : " border-b-0")
      }
      style={{ boxShadow: showBorder ? '0 2px 8px 0 rgba(0,0,0,0.03)' : 'none' }}
    >
      <div className="flex justify-between items-center p-4 py-2">
        <div className="flex flex-row items-center gap-2 shrink-0 ">
          <span className="jsx-e3e12cc6f9ad5a71 flex flex-row items-center gap-2 home-links">
            <Link href="/" className="-mt-3 text-xl font-base tracking-tight text-black dark:text-white">
              Avurna
            </Link>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <SignUpButton />
        </div>
      </div>
    </div>
  );
};
