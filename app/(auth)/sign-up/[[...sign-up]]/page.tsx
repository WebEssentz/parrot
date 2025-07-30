// FILE: app/(auth)/sign-up/[[...sign-up]]/page.tsx

'use client'

import { useSignUp } from "@clerk/nextjs";
import { OAuthStrategy } from "@clerk/types";
import { FcGoogle } from "react-icons/fc";
import { FaApple, FaDiscord } from "react-icons/fa";
import Link from "next/link";
import { AuthContainer, OAuthButton } from "@/components/auth/shared";
import { BrandLogo } from "@/components/auth/logo"; // Import BrandLogo
import { motion } from "framer-motion";

export default function SignUpPage() {
  const { signUp, isLoaded } = useSignUp();

  const signUpWith = (strategy: OAuthStrategy) => {
    if (!isLoaded) return;
    return signUp.authenticateWithRedirect({
      strategy,
      redirectUrl: "/callback",
      redirectUrlComplete: "/",
    });
  };

   const providers = [
    { name: "Google", icon: <FcGoogle size={22} />, strategy: "oauth_google" },
    { name: "Apple", icon: <FaApple size={22} />, strategy: "oauth_apple" },
    { name: "Discord", icon: <FaDiscord size={22} className="text-[#5865F2]" />, strategy: "oauth_discord" }
  ];

  return (
    <>
      {/* --- FIX: Added a fixed header for brand consistency --- */}
      <header className="fixed top-0 left-0 w-full p-4 md:p-6">
        <BrandLogo />
      </header>

      <AuthContainer>
        <div className="w-full max-w-xs flex flex-col items-center text-center space-y-6">
          
          {/* Header Text Block */}
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
              Your thoughts. Your flow.
            </h1>
            <h2 className="text-sm text-zinc-500 dark:text-zinc-400">
              Create your Avurna account
            </h2>
          </div>

          {/* OAuth Buttons */}
          <div className="w-full space-y-3 pt-2">
            {providers.map((provider, index) => (
               <motion.div
                  key={provider.strategy}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + index * 0.08, duration: 0.3, ease: "easeOut" }}
              >
                  <OAuthButton
                      icon={provider.icon}
                      label={`Continue with ${provider.name}`}
                      onClick={() => signUpWith(provider.strategy as OAuthStrategy)}
                  />
              </motion.div>
            ))}
          </div>
          
          {/* Footer Links */}
          <div className="text-center text-xs text-zinc-500 dark:text-zinc-400 pt-2 space-y-2">
              <p>
                  By continuing, you agree to our{" "}
                  <Link href="/terms" className="underline hover:text-zinc-800 dark:hover:text-zinc-200">
                      Terms of Service
                  </Link>.
              </p>
              <p>
                  Already have an account?{" "}
                  <Link href="/sign-in" className="font-medium text-orange-500 underline hover:text-orange-600 dark:hover:text-orange-400">
                      Sign in
                  </Link>
              </p>
          </div>
        </div>
      </AuthContainer>
    </>
  );
}