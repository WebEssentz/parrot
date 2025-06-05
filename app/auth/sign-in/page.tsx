// In SignInPage.tsx
"use client";

import SignInHeader from "./components/header";
import IntelligentInput from "./components/IntelligentInput";
import SocialProviders from "./components/SocialProviders";

import { useEffect, useState } from "react";

export default function SignInPage() {
    const [isMobile, setIsMobile] = useState(false);
    const [isDesktop, setIsDesktop] = useState(false); // Keep this if you use it elsewhere
    useEffect(() => {
        const check = () => {
            setIsMobile(window.innerWidth < 768);
            setIsDesktop(window.innerWidth >= 1024);
        };
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);
    return (
        <div className="bg-white dark:bg-black flex flex-col overscroll-y-auto min-h-screen pb-8"> {/* Adjusted min-h and pb */}
            <SignInHeader />
            <div className={`flex-1 flex flex-col items-center w-full px-4 overscroll-y-auto ${isMobile ? 'mt-[-2.5rem]' : 'pt-24'}`}>
                <h1
                  className={`tracking-tight text-2xl sm:text-3xl font-semibold mb-10 text-center ${isMobile ? 'mt-2' : 'mt-8'}`}
                  style={isMobile ? { marginBottom: '1.5rem' } : {}}
                >
                  Log into your account
                </h1>
                <IntelligentInput />
                <div className="w-full max-w-md mx-auto my-6 flex items-center">
                    <div className="flex-grow border-t border-zinc-300 dark:border-zinc-700"></div>
                    <span className="flex-shrink mx-4 text-zinc-500 dark:text-zinc-400 text-sm font-medium">
                        OR
                    </span>
                    <div className="flex-grow border-t border-zinc-300 dark:border-zinc-700"></div>
                </div>
                <div className="w-full max-w-md mx-auto mb-2">
                    <SocialProviders isMobile={isMobile}/>
                </div>


                {/* Sign Up Link */}
                <div className="mt-4 text-center text-zinc-600 dark:text-zinc-400 text-sm">
                    Don't have an account?{" "}
                    <a href="/auth/sign-up" className="text-[#4870fe] dark:text-[hsl(22,100%,52%)] hover:underline">
                        Sign up
                    </a>
                </div>

                {/* Moved Terms and Policy here, within the main content flow */}
                {/* Removed isDesktop condition to show on all sizes, adjust styling if needed for mobile */}
                <div className="mt-8 text-center max-w-md mx-auto"> {/* Added max-w-md and mx-auto for centering */}
                    <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400 select-none px-4 py-2 rounded-xl"> {/* Adjusted text size and color for subtlety */}
                        By logging in, you agree to our{' '}
                        <a href="/terms" target="_blank" rel="noopener noreferrer" className="font-medium text-zinc-600 dark:text-zinc-300 hover:text-zinc-800 dark:hover:text-zinc-100 underline">Terms</a> {/* Added underline for clarity, slightly less bold */}
                        {' '}and our{' '}
                        <a href="/privacy" target="_blank" rel="noopener noreferrer" className="font-medium text-zinc-600 dark:text-zinc-300 hover:text-zinc-800 dark:hover:text-zinc-100 underline">Privacy Policy</a>.
                    </span>
                </div>
            </div>
        </div>
    );
}