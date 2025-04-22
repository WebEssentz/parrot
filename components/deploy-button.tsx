import Link from "next/link";

export const SignInButton = () => (
  <Link
    href="/signin"
    className="inline-flex items-center font-semibold gap-2 ml-2 border border-black dark:border-white text-black dark:text-white text-sm px-4 py-2 rounded-full bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
  >
    Sign in
  </Link>
);

export const SignUpButton = () => (
  <Link
    href="/signup"
    className="inline-flex items-center gap-2 ml-1 font-semibold bg-black text-white text-sm px-4 py-2 rounded-full hover:bg-zinc-900 dark:bg-white dark:text-black dark:hover:bg-zinc-100 transition-colors"
  >
    Sign up
  </Link>
);