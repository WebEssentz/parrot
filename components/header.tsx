import Link from "next/link";
import { SignInButton, SignUpButton } from "./deploy-button";
import { GroqIcon } from "./icons";
import { ThemeToggle } from "./theme-toggle";
import { useEffect, useState } from "react";

export const Header = () => {
  const [showBorder, setShowBorder] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setShowBorder(window.scrollY > 2);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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
            <div className="jsx-e3e12cc6f9ad5a71 w-4 text-lg text-center text-zinc-300 dark:text-zinc-600">
              <svg
                data-testid="geist-icon"
                height={16}
                strokeLinejoin="round"
                viewBox="0 0 16 16"
                width={16}
                style={{ color: "currentcolor" }}
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M4.01526 15.3939L4.3107 14.7046L10.3107 0.704556L10.6061 0.0151978L11.9849 0.606077L11.6894 1.29544L5.68942 15.2954L5.39398 15.9848L4.01526 15.3939Z"
                  fill="currentColor"
                />
              </svg>
            </div>
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
