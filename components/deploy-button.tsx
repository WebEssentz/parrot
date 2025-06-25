"use client";

import Link from "next/link";
import { useMobile } from "../hooks/use-mobile";
import { useState } from "react";

// SignInButton removed for desktop, now handled in dropdown

export const SignUpButton = () => {
  const isMobile = useMobile();
  const [open, setOpen] = useState(false);

  if (isMobile) {
    return (
      <Link
        href="/sign-up"
        className="inline-flex items-center gap-2 ml-1 font-semibold bg-[#171717] text-white text-sm px-4 py-2 rounded-full hover:bg-zinc-900 dark:bg-white dark:text-[#171717] dark:hover:bg-zinc-100"
      >
        Login
      </Link>
    );
  }

  // Desktop: show only Sign up button
  return (
    <Link
      href="/sign-up"
      className="inline-flex items-center gap-2 ml-1 font-semibold bg-[#171717] text-white text-sm px-4 py-2 rounded-full hover:bg-zinc-900 dark:bg-white dark:text-[#171717] dark:hover:bg-zinc-100"
    >
      Sign up
    </Link>
  );
};