
import Link from "next/link";
import { SignInButton, SignUpButton } from "./deploy-button";
import { ThemeToggle } from "./theme-toggle";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

export const Header = () => {
  const [showBorder, setShowBorder] = useState(false);
  const [isMobileOrTablet, setIsMobileOrTablet] = useState(false);
  const { theme } = useTheme();
  const [isLoaded, setIsLoaded] = useState(false);

  // Set header text color CSS variable for light/dark mode
  useEffect(() => {
    const setParrotHeaderColor = () => {
      const isDark = document.documentElement.classList.contains('dark') || window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.style.setProperty('--parrot-header-color', isDark ? '#bdbdbd' : '#5d5d5d');
    };
    setParrotHeaderColor();
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', setParrotHeaderColor);
    const observer = new MutationObserver(setParrotHeaderColor);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => {
      window.matchMedia('(prefers-color-scheme: dark)').removeEventListener('change', setParrotHeaderColor);
      observer.disconnect();
    };
  }, []);

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
        `fixed right-0 left-0 w-full top-0 bg-white dark:bg-zinc-950 z-50` +
        (showBorder ? " border-b-4 border-zinc-200 dark:border-zinc-800" : " border-b-0")
      }
      style={{ boxShadow: showBorder ? '0 2px 8px 0 rgba(0,0,0,0.03)' : 'none' }}
    >
      <div className="flex justify-between items-center p-4">
        <div className="flex flex-row items-center gap-2 shrink-0 ">
          <span className="jsx-e3e12cc6f9ad5a71 flex flex-row items-center gap-2 home-links">
            {isMobileOrTablet ? (
              <Link
                className="text-zinc-800 dark:text-zinc-100 -translate-y-[.5px]"
                rel="noopener"
                target="_blank"
                href="https://vercel.com/"
              >
                <svg
                  data-testid="geist-icon"
                  height={18}
                  strokeLinejoin="round"
                  viewBox="0 0 16 16"
                  width={18}
                  style={{ color: "currentcolor" }}
                >
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M8 1L16 15H0L8 1Z"
                    fill="currentColor"
                  />
                </svg>
              </Link>
            ) : (
              <span
                className="text-[20px] font-leading select-none -mt-2 font-medium"
                style={{
                  color: `${theme == "dark" ? "white" : "black"}`,
                  lineHeight: '22px',
                  fontFamily: 'Google Sans, \"Helvetica Neue\", sans-serif',
                  letterSpacing: 'normal',
                }}
              >
                Parrot
              </span>

            )}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <SignInButton />
          <SignUpButton />
        </div>
      </div>
    </div>
  );
};
