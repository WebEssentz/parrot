"use client";

import { FaGoogle, FaGithub } from "react-icons/fa";

const providers = [
  {
    name: "Google",
    Icon: FaGoogle,
    key: "google",
  },
  {
    name: "GitHub",
    Icon: FaGithub,
    key: "github",
  },
];

// Accept the isMobile prop
export default function SocialProviders({ isMobile }: { isMobile: boolean }) {
  return (
    <div className="w-full flex flex-col items-center mt-8">
      {isMobile ? (
        // Mobile Layout: Full-width buttons
        <div className="flex flex-col gap-4 w-full"> {/* Stack buttons vertically */}
          {providers.map(({ name, Icon, key }) => (
            <button
              key={key}
              className="w-full flex items-center justify-center px-6 py-3 rounded-full border border-zinc-300 dark:border-zinc-700 bg-transparent text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors duration-150 shadow-sm cursor-pointer"
              style={{ boxShadow: "0 1px 4px 0 rgba(0,0,0,0.04)" }}
              type="button"
              aria-label={`Continue with ${name}`}
            >
              {/* Icon on the left, with some margin to separate from text */}
              <Icon size={24} className="mr-3" />
              <span className="text-base font-medium tracking-wide">
                Continue with {name}
              </span>
            </button>
          ))}
        </div>
      ) : (
        // Desktop Layout: Existing icon-only style
        <div className="flex flex-row gap-6 justify-center">
          {providers.map(({ name, Icon, key }) => (
            <button
              key={key}
              className="flex flex-col items-center group focus:outline-none cursor-pointer"
              type="button"
              aria-label={`Sign in with ${name}`}
            >
              <span
                className="border border-zinc-300 dark:border-zinc-700 rounded-full p-3 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200 group-hover:bg-zinc-100 dark:group-hover:bg-zinc-800 transition-colors duration-150 shadow-sm"
                style={{ boxShadow: "0 1px 4px 0 rgba(0,0,0,0.04)" }}
              >
                <Icon size={28} />
              </span>
              <span className="text-xs mt-2 text-zinc-500 dark:text-zinc-400 font-medium tracking-wide">
                {name}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}