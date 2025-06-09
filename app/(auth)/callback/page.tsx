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

  // After sign-in or sign-up, always redirect to home (or dashboard if you want)
  useEffect(() => {
    // If Clerk user is loaded, redirect to home
    if (user && isUserLoaded) {
      router.replace("/"); // or "/dashboard" if you want
    }
  }, [user, isUserLoaded, router]);

  useEffect(() => {
    // Cleanup retry timeout on unmount
    return () => {
      if (retryTimeout.current) clearTimeout(retryTimeout.current);
    };
  }, []);

  // Onboarding and sign-in logic: just redirect to home if user is loaded
  useEffect(() => {
    if (!isSignUpLoaded || !isUserLoaded) return;
    if (!user) return;
    setIsRedirecting(true);
    toast("Welcome!", {
      description: "You are being signed in...",
      duration: 3500,
    });
    router.replace("/"); // or "/dashboard" if you want
  }, [isSignUpLoaded, isUserLoaded, user, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen w-full bg-white dark:bg-black">
      <div className="flex flex-col items-center">
        <div className="flex items-center justify-center mb-2">
          <span className="animate-spin mr-3">
            <SpinnerIcon size={32} className="text-black dark:text-white" />
          </span>
          <span className="text-2xl font-semibold text-black dark:text-white">
            {networkError && retryCount >= maxRetries
              ? "Network Error"
              : isRedirecting
                ? "Redirecting..."
                : "Preparing your account..."}
          </span>
        </div>
        <div className="w-full flex justify-start">
          <span className="text-base text-zinc-600 dark:text-zinc-200 pl-38">
            {networkError && retryCount >= maxRetries
              ? `Failed after ${maxRetries} attempts. Please check your connection and try again.`
              : networkError
                ? `Network error. Retrying... (${retryCount}/${maxRetries})`
                : isRedirecting
                  ? "You are being redirected, please wait…"
                  : "Setting up your account, please wait…"
            }
          </span>
        </div>
      </div>
    </div>
  );
}