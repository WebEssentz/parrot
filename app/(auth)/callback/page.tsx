"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { SpinnerIcon } from "../../../components/icons";
// import { toast } from "sonner"; // Keeping toast commented as per your original code

export default function CallbackPage() {
  const router = useRouter();
  const { isLoaded: isUserLoaded, user } = useUser();
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;
  const retryTimeout = useRef<NodeJS.Timeout | null>(null);
  const [networkError, setNetworkError] = useState(false);

  // This useEffect is your cleanup crew, Onyerikam!
  // It makes sure any pending timeouts are cleared if the component unmounts.
  useEffect(() => {
    return () => {
      if (retryTimeout.current) clearTimeout(retryTimeout.current);
    };
  }, []);

  // This is the main event, Onyerikam! Your redirection logic, reborn and ready.
  // We're watching 'isUserLoaded' and 'user' like a hawk.
  useEffect(() => {
    if (isUserLoaded && user) {
      // ✨ Success! The user session is fully loaded and ready to roll.
      // Time to send them to the main app.
      router.replace("/");
      // If you want a "Welcome!" toast, it's often smoother to trigger it
      // on the '/' page after the redirect, so it's definitely seen.
    } else if (isUserLoaded && !user && retryCount < maxRetries) {
      // 🤔 Okay, Onyerikam, Clerk says it's loaded, but no user found yet.
      // This could be a transient network hiccup or a slight delay.
      // Let's give it another shot with some exponential backoff.
      setNetworkError(true); // Show that network error message
      setRetryCount((prev) => prev + 1); // Increment the retry count
      retryTimeout.current = setTimeout(() => {
        setNetworkError(false); // Reset the error message for the next attempt
        // No explicit re-fetch needed for Clerk's useUser, it's smart enough to re-evaluate.
      }, 2000 * (retryCount + 1)); // The delay gets longer with each retry, like a good suspense novel.
    } else if (isUserLoaded && !user && retryCount >= maxRetries) {
      // 🚨 Uh oh, Onyerikam, we've hit our retry limit and still no user.
      // It's time to display that persistent network error message.
      setNetworkError(true);
    }
  }, [isUserLoaded, user, router, retryCount]); // These are the dependencies that make this effect re-run.

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