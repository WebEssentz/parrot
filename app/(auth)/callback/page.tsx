"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSignUp, useUser } from "@clerk/nextjs";
import { SpinnerIcon } from "../../../components/icons";
import { toast } from "sonner";

export default function CallbackPage() {
  const router = useRouter();
  const { isLoaded: isSignUpLoaded, signUp } = useSignUp();
  const { isLoaded: isUserLoaded, user } = useUser();
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;
  const retryTimeout = useRef<NodeJS.Timeout | null>(null);
  const [networkError, setNetworkError] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  // --- All your hooks and logic are correct, no changes needed here ---
  useEffect(() => {
    if (user && isUserLoaded) {
      router.replace("/");
    }
  }, [user, isUserLoaded, router]);

  useEffect(() => {
    return () => {
      if (retryTimeout.current) clearTimeout(retryTimeout.current);
    };
  }, []);

  useEffect(() => {
    if (!isSignUpLoaded || !isUserLoaded) return;
    if (!user) return;
    setIsRedirecting(true);
    toast("Welcome!", {
      description: "You are being signed in...",
      duration: 3500,
    });
    router.replace("/");
  }, [isSignUpLoaded, isUserLoaded, user, router]);
  // --- End of hooks ---

  return (
    // THIS IS THE FIX:
    // Use `position: fixed` to create a true full-screen overlay.
    // `inset-0` is shorthand for `top: 0; right: 0; bottom: 0; left: 0;`.
    // This takes the element out of the normal document flow and sizes it
    // relative to the viewport, which reliably removes scrollbars.
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white dark:bg-black">
      
      {/* The inner content remains the same. It will now be perfectly centered within the fixed container. */}
      <div className="flex flex-row items-center justify-center gap-4">
        
        {/* Item 1: The Spinner */}
        <div className="animate-spin">
          <SpinnerIcon size={32} className="text-black dark:text-white" />
        </div>
        
        {/* Item 2: A vertical block for the two lines of text */}
        <div className="flex flex-col">
          <h1 className="text-2xl font-semibold text-black dark:text-white">
            {networkError && retryCount >= maxRetries
              ? "Network Error"
              : isRedirecting
                ? "Redirecting..."
                : "Preparing your account..."}
          </h1>
          <p className="text-base text-zinc-600 dark:text-zinc-400">
            {networkError && retryCount >= maxRetries
              ? `Failed after ${maxRetries} attempts. Please check your connection and try again.`
              : networkError
                ? `Network error. Retrying... (${retryCount}/${maxRetries})`
                : isRedirecting
                  ? "You are being redirected, please wait…"
                  : "Setting up your account, please wait…"
            }
          </p>
        </div>
      </div>
    </div>
  );
}