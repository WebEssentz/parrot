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

  useEffect(() => {
    // Cleanup retry timeout on unmount
    return () => {
      if (retryTimeout.current) clearTimeout(retryTimeout.current);
    };
  }, []);

  useEffect(() => {
    async function handleCallback() {
      console.log('[CallbackPage] useEffect fired', { isSignUpLoaded, isUserLoaded, user });
      if (!isSignUpLoaded || !isUserLoaded) {
        console.log('[CallbackPage] Clerk not loaded', { isSignUpLoaded, isUserLoaded });
        return;
      }
      if (!user) {
        console.log('[CallbackPage] User missing', { user });
        return;
      }

      if (!user.createdAt || !user.updatedAt) {
        console.log('[CallbackPage] Missing createdAt or updatedAt', { createdAt: user.createdAt, updatedAt: user.updatedAt });
        return;
      }

      const created = new Date(user.createdAt).getTime();
      const updated = new Date(user.updatedAt).getTime();

      /**
       * WIP: It is possible that the user may try to signup and already exist on the db.
       * We want to push them to sign in page alerting them, that this user already exist, sign in instead.
       * Else we want to continue with the signup.
       * 
       * WIP2: So we want to check if the user is redirected from the signin page, and if they do not have an account already in our db.
       * If they do not have an account, we push them to the signup page, telling them this user doesn't exist, sign up to continue.
       * ELSE WE SIGN THEM IN AND PUSH THE TO THIS ROUTE /
      */


      // 1. If not a new user, treat as sign-in: send to home page
      if (Math.abs(created - updated) > 2000) {
        toast("Welcome back!", {
          description: "You are being signed in...",
          duration: 3500,
        });
        router.replace("/");
        return;
      }

      // 2. Store basic user info in localStorage for onboarding
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
        setNetworkError(false);
        setIsRedirecting(true);
        console.log('[CallbackPage] pendingUser set in localStorage', userData);
        // Redirect to onboarding
        router.replace("/about-you");
        console.log('[CallbackPage] router.replace to /about-you called');
      } catch (e) {
        setNetworkError(true);
        setIsRedirecting(false);
        console.error('[CallbackPage] Failed to set localStorage', e);
        if (retryCount < maxRetries) {
          toast("Network error", {
            description: `Retrying... (${retryCount + 1}/${maxRetries})`,
            duration: 3000,
          });
          retryTimeout.current = setTimeout(() => {
            setRetryCount((c) => c + 1);
          }, 1500);
        } else {
          toast("Network error", {
            description: `Failed after ${maxRetries} attempts. Please check your connection and try again.`,
            duration: 6000,
          });
        }
      }
    }
    handleCallback();
    // Only rerun on user, isSignUpLoaded, isUserLoaded, retryCount
  }, [isSignUpLoaded, isUserLoaded, user, router, retryCount]);

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
          <span className="text-base text-zinc-600 dark:text-zinc-200 pl-44">
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