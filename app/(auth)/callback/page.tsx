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

  // Protect '/callback' route and handle onboarding logic
  useEffect(() => {
    // 1. Check if redirected from /sign-in or /sign-up (via query param or referrer)
    const urlParams = new URLSearchParams(window.location.search);
    const from = urlParams.get("from");
    if (from === "sign-in" || from === "sign-up") {
      // Allow, continue normal process
      return;
    }
    // 2. Check for pendingUser in localStorage
    const pendingUser = localStorage.getItem("pendingUser");
    if (pendingUser) {
      // Allow, continue normal process
      return;
    }
    // 3. Try to get email from localStorage or user (if loaded)
    let email = "";
    try {
      const pendingUserObj = pendingUser ? JSON.parse(pendingUser) : null;
      if (pendingUserObj && pendingUserObj.email) {
        email = pendingUserObj.email;
      }
    } catch {}
    if (!email && user && user.emailAddresses?.[0]?.emailAddress) {
      email = user.emailAddresses[0].emailAddress;
    }
    if (email) {
      // Check if user exists in DB
      fetch(`/api/users?email=${encodeURIComponent(email)}`)
        .then(res => res.json())
        .then(result => {
          if (result.exists) {
            router.replace("/sign-in");
          } else {
            router.replace("/sign-up");
          }
        })
        .catch(() => {
          router.replace("/");
        });
    } else {
      // No email, send to homepage
      router.replace("/");
    }
    // Block further processing
  }, [user, router]);

  useEffect(() => {
    // Cleanup retry timeout on unmount
    return () => {
      if (retryTimeout.current) clearTimeout(retryTimeout.current);
    };
  }, []);

  // Onboarding and sign-in logic (uses created/updated)
  useEffect(() => {
    async function handleCallback() {
      if (!isSignUpLoaded || !isUserLoaded) return;
      if (!user) return;
      if (!user.createdAt || !user.updatedAt) return;
      const created = new Date(user.createdAt).getTime();
      const updated = new Date(user.updatedAt).getTime();
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
        router.replace("/about-you");
      } catch (e) {
        setNetworkError(true);
        setIsRedirecting(false);
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