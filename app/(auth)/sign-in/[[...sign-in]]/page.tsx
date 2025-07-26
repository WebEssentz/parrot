'use client'

import { useSignIn } from "@clerk/nextjs";
import { OAuthStrategy } from "@clerk/types";
import { FcGoogle } from "react-icons/fc";
import { FaApple, FaDiscord } from "react-icons/fa";
import Link from "next/link";
import { AuthContainer, OAuthButton } from "@/components/auth/shared";
import { motion } from "framer-motion";

export default function SignInPage() {
  const { signIn, isLoaded } = useSignIn();

  const signInWith = (strategy: OAuthStrategy) => {
    if (!isLoaded) return;
    return signIn.authenticateWithRedirect({
      strategy,
      redirectUrl: "/callback",
      redirectUrlComplete: "/",
    });
  };

  const providers = [
    // Increased icon size to 24
    { name: "Google", icon: <FcGoogle size={24} />, strategy: "oauth_google" },
    { name: "Apple", icon: <FaApple size={24} />, strategy: "oauth_apple" },
    { name: "Discord", icon: <FaDiscord size={24} className="text-[#5865F2]" />, strategy: "oauth_discord" }
  ];

  return (
    <AuthContainer>
      <div className="w-full max-w-xs flex flex-col items-start">

        {/* --- THIS IS THE FIX: Applying the precise Notion styles --- */}
        <div className="text-left mb-8">
            <h2 className="font-heading text-[22px] leading-[26px] font-semibold text-zinc-900 dark:text-white">
                Your thoughts. Your flow.
            </h2>
            <h2 className="font-heading text-[22px] leading-[26px] font-semibold text-[#46444073] dark:text-white/[.45]">
                Create your Avurna account
            </h2>
        </div>

        {/* OAuth Buttons */}
        <div className="w-full space-y-3">
          {providers.map((provider, index) => (
              <motion.div
                key={provider.strategy}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + index * 0.1, duration: 0.3 }}
            >
                <OAuthButton
                    icon={provider.icon}
                    label={`Continue with ${provider.name}`}
                    onClick={() => signInWith(provider.strategy as OAuthStrategy)}
                />
            </motion.div>
          ))}
        </div>

        {/* Footer Links */}
        <div className="text-left text-sm text-zinc-500 dark:text-zinc-400 mt-8 space-y-4">
            <p>
                By continuing, you agree to our{" "}
                <Link href="/terms" className="hover:underline">
                    Terms of Service
                </Link>.
            </p>
            <p>
                Don't have an account?{" "}
                <Link href="/sign-up" className="font-medium text-orange-600 dark:text-orange-500 hover:underline">
                    Sign up
                </Link>
            </p>
        </div>
      </div>
    </AuthContainer>
  );
}
