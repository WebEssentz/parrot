"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { SpinnerIcon } from "../../../components/icons";
// import { toast } from "sonner";

export default function CallbackPage() {
  const router = useRouter();
  // Removed useSignUp as it's not directly used for the redirect logic here.
  const { isLoaded: isUserLoaded, user } = useUser();
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;
  const retryTimeout = useRef<NodeJS.Timeout | null>(null);
  const [networkError, setNetworkError] = useState(false);
  // isRedirecting state can be simplified as the page's purpose is redirection.

  // --- REMOVE THIS useEffect BLOCK ---
  // useEffect(() => {
  //   if (user && isUserLoaded) {
  //     router.replace("/");
  //   }
  // }, [user, isUserLoaded, router]);
  // --- END REMOVAL ---

  useEffect(() => {
    return () => {
      if (retryTimeout.current) clearTimeout(retryTimeout.current);
    };
  }, []);

  // --- ALSO REMOVE OR RECONSIDER THIS useEffect BLOCK ---
  // This toast and setIsRedirecting logic should ideally be triggered by Clerk's
  // internal success events or on the target page (e.g., the '/' route)
  // once the user session is fully active.
  // useEffect(() => {
  //   if (!isSignUpLoaded || !isUserLoaded) return;
  //   if (!user) return;
  //   setIsRedirecting(true); // This state is now less critical for the page's core function
  //   toast("Welcome!", {
  //     description: "You are being signed in...",
  //     duration: 3500,
  //   });
  //   router.replace("/"); // This is the problematic line if not removed above
  // }, [isSignUpLoaded, isUserLoaded, user, router]);
  // --- END REMOVAL/RECONSIDERATION ---

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white dark:bg-black">
      <div className="flex flex-row items-center justify-center gap-4">
        <div className="animate-spin">
          <SpinnerIcon size={32} className="text-black dark:text-white" />
        </div>
        <div className="flex flex-col">
          <h1 className="text-2xl font-semibold text-black dark:text-white">
            {networkError && retryCount >= maxRetries
              ? "Network Error"
              : "Preparing your account..."}
          </h1>
          <p className="text-base text-zinc-600 dark:text-zinc-400">
            {networkError && retryCount >= maxRetries
              ? `Failed after ${maxRetries} attempts. Please check your connection and try again.`
              : networkError
                ? `Network error. Retrying... (${retryCount}/${maxRetries})`
                : "Setting up your account, please wait…"
            }
          </p>
        </div>
      </div>
    </div>
  );
}