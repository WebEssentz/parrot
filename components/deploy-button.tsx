"use client";

import Link from "next/link";
import { useMobile } from "../hooks/use-mobile";

export const SignInButton = () => {
  const isMobile = useMobile();
  if (isMobile) return null;
  return (
    <Link
      href="/signin"
      className="inline-flex items-center font-semibold gap-2 ml-2 border border-gray-300 dark:border-gray-700 text-black dark:text-white text-sm px-4 py-2 rounded-full bg-transparent hover:bg-gray-100 dark:hover:bg-zinc-900"
    >
      Sign in
    </Link>
  );
};

export const SignUpButton = () => {
  const isMobile = useMobile();
  return (
    <Link
      href="/signup"
      className="inline-flex items-center gap-2 ml-1 font-semibold bg-black text-white text-sm px-4 py-2 rounded-full hover:bg-zinc-900 dark:bg-white dark:text-black dark:hover:bg-zinc-100"
    >
      {isMobile ? "Login" : "Sign up"}
    </Link>
  );
};