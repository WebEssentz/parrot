"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSignUp, useUser } from "@clerk/nextjs";
import { SpinnerIcon } from "../../../components/icons";

export default function CallbackPage() {
  const router = useRouter();
  const { isLoaded: isSignUpLoaded, signUp } = useSignUp();
  const { isLoaded: isUserLoaded, user } = useUser();

  useEffect(() => {
    console.log('[CallbackPage] useEffect fired', { isSignUpLoaded, isUserLoaded, user });
    // Only run if Clerk is loaded and user is present
    if (!isSignUpLoaded || !isUserLoaded || !user) {
      console.log('[CallbackPage] Clerk not loaded or user missing', { isSignUpLoaded, isUserLoaded, user });
      return;
    }

    // Only run for sign up (not sign in)
    // Clerk sets user.createdAt and user.updatedAt to the same value on first sign up
    // If they differ by more than 2 seconds, it's a returning user (sign in)
    if (!user.createdAt || !user.updatedAt) {
      console.log('[CallbackPage] Missing createdAt or updatedAt', { createdAt: user.createdAt, updatedAt: user.updatedAt });
      return;
    }
    const created = new Date(user.createdAt).getTime();
    const updated = new Date(user.updatedAt).getTime();
    
    // WIP:
    // 1. Ok so new logic, If the user is not a new user we push them to sign page, telling them to signin their account already exist. We use sonner for this toast.
    // 2. Also we add a retry logic for network error. In case the user network went off when they tried signing up. We retry, also we show the user about the error and the retry logic attempts. Make 3 attempts to try again.
    
    if (Math.abs(created - updated) > 2000) {
      // Not a new sign up
      console.log('[CallbackPage] Not a new sign up, skipping onboarding redirect', { createdAt: user.createdAt, updatedAt: user.updatedAt });
      return;
    }

    // Store basic user info in localStorage for onboarding
    const userData = {
      id: user.id,
      email: user.emailAddresses?.[0]?.emailAddress || "",
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      imageUrl: user.imageUrl || "",
      username: user.username || "",
    };
    try {
      localStorage.setItem("pendingUser", JSON.stringify(userData));
      console.log('[CallbackPage] pendingUser set in localStorage', userData);
    } catch (e) {
      console.error('[CallbackPage] Failed to set localStorage', e);
    }

    // Redirect to onboarding
    try {
      router.replace("/about-you");
      console.log('[CallbackPage] router.replace to /about-you called');
    } catch (e) {
      console.error('[CallbackPage] router.replace failed', e);
    }
  }, [isSignUpLoaded, isUserLoaded, user, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen w-full bg-white dark:bg-black">
      <div className="flex flex-col items-center">
        <div className="flex items-center justify-center mb-2">
          <span className="animate-spin mr-3">
            <SpinnerIcon size={32} className="text-black dark:text-white" />
          </span>
          <span className="text-2xl font-semibold text-black dark:text-white">Redirecting...</span>
        </div>
        <div className="w-full flex justify-start">
          <span className="text-base text-zinc-600 dark:text-zinc-200 pl-44">You are being redirected, please wait…</span>
        </div>
      </div>
    </div>
  );
}