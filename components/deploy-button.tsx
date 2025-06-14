"use client";

import Link from "next/link";
import { useMobile } from "../hooks/use-mobile";

export const SignInButton = () => {
  const isMobile = useMobile();
  if (isMobile) return null;
  return (
    <Link
      href="/sign-in"
      className="inline-flex items-center font-semibold gap-2 ml-2 border border-gray-300 dark:border-gray-700 text-black dark:text-white text-sm px-4 py-2 rounded-full bg-transparent hover:bg-gray-100 dark:hover:bg-zinc-900"
    >
      Log in
    </Link>
  );
};

export const SignUpButton = () => {
  const isMobile = useMobile();
  return (
    <Link
      href="/sign-up"
      className="inline-flex items-center gap-2 ml-1 font-semibold bg-[#171717] text-white text-sm px-4 py-2 rounded-full hover:bg-zinc-900 dark:bg-white dark:text-[#171717] dark:hover:bg-zinc-100"
    >
      {isMobile ? "Login" : "Sign up"}
    </Link>
  );
};