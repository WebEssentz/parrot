// In pages/auth/sign-up.tsx (or wherever you place your signup page)
"use client";

import SignInHeader from "@/app/auth/sign-in/components/header"; // Assuming header is in a common components folder
import IntelligentInput from "@/app/auth/sign-in/components/IntelligentInput";
import SocialProviders from "@/app/auth/sign-in/components/SocialProviders";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion"; // Import motion and AnimatePresence for new fields
import { FiAlertCircle } from "react-icons/fi"; // Import for error icon

export default function SignUpPage() {
    const [isMobile, setIsMobile] = useState(false);
    const [isDesktop, setIsDesktop] = useState(false);
    const [username, setUsername] = useState("");
    const [usernameFocus, setUsernameFocus] = useState(false);
    const [usernameError, setUsernameError] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [confirmPasswordFocus, setConfirmPasswordFocus] = useState(false);
    const [confirmPasswordError, setConfirmPasswordError] = useState("");

    // State for IntelligentInput's email/phone and password
    const [emailOrPhoneValue, setEmailOrPhoneValue] = useState("");
    const [passwordValue, setPasswordValue] = useState(""); // This will be the password from IntelligentInput

    useEffect(() => {
        const check = () => {
            setIsMobile(window.innerWidth < 768);
            setIsDesktop(window.innerWidth >= 1024);
        };
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);

    // Validation for Username
    useEffect(() => {
        if (username.length > 0 && username.length < 3) {
            setUsernameError("Username must be at least 3 characters long.");
        } else if (username.length > 20) {
            setUsernameError("Username cannot exceed 20 characters.");
        } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            setUsernameError("Username can only contain letters, numbers, and underscores.");
        } else {
            setUsernameError("");
        }
    }, [username]);

    // Validation for Confirm Password
    useEffect(() => {
        if (confirmPassword.length > 0 && confirmPassword !== passwordValue) {
            setConfirmPasswordError("Passwords do not match.");
        } else {
            setConfirmPasswordError("");
        }
    }, [confirmPassword, passwordValue]);


    return (
        <div className="bg-white dark:bg-black flex flex-col overscroll-y-auto min-h-screen pb-8">
            <SignInHeader />
            <div className={`flex-1 flex flex-col items-center w-full px-4 overscroll-y-auto ${isMobile ? 'mt-[-2.5rem]' : 'pt-24'}`}>
                <h1
                    className={`tracking-tight text-2xl sm:text-3xl font-semibold mb-10 text-center ${isMobile ? 'mt-2' : 'mt-8'}`}
                    style={isMobile ? { marginBottom: '1.5rem' } : {}}
                >
                    Create your account
                </h1>

                {/* New Username Input Field */}
                <div className="w-full max-w-md mx-auto relative mb-4"> {/* Added mb-4 for spacing */}
                    <label
                        className={`absolute left-4 transition-all duration-200 pointer-events-none px-1
                            ${usernameFocus
                                ? 'text-xs -top-3 px-2 text-[#4870fe] dark:text-[hsl(22,100%,52%)]'
                                : username
                                    ? 'text-xs -top-3 px-2 dark:text-zinc-400'
                                    : 'text-base top-3 dark:text-zinc-400'}
                        `}
                        style={{
                            zIndex: 2,
                            transform: (usernameFocus || username) ? 'scale(0.95)' : 'none',
                            background:
                                (!usernameFocus && !username && typeof window !== 'undefined' && document.documentElement.classList.contains('dark'))
                                    ? 'transparent'
                                    : 'var(--label-bg)',
                            color:
                                typeof window !== 'undefined' && document.documentElement.classList.contains('dark') && usernameFocus
                                    ? 'hsl(22, 100%, 52%)'
                                    : undefined,
                            '--solar': '22 100% 52%',
                            '--mask-gradient': 'linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 50%, rgba(0,0,0,0) 100%)'
                        } as React.CSSProperties}
                        htmlFor="username-input"
                    >
                        Username
                    </label>
                    <input
                        id="username-input"
                        type="text"
                        className="w-full px-6 py-4 rounded-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#4870fe] dark:focus:ring-[hsl(var(--solar))] transition-all duration-200 relative z-1"
                        style={{
                            '--solar': '22 100% 52%',
                            '--mask-gradient': 'linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 50%, rgba(0,0,0,0) 100%)'
                        } as React.CSSProperties}
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        onFocus={() => setUsernameFocus(true)}
                        onBlur={() => setUsernameFocus(false)}
                        autoComplete="nickname"
                    />
                    {usernameError && (
                        <div className="flex items-center gap-1 mt-2 text-sm font-medium text-[#e11d48] dark:text-[#ff6b81]">
                            <FiAlertCircle className="w-4 h-4" />
                            <span>{usernameError}</span>
                        </div>
                    )}
                </div>

                {/* IntelligentInput for Email/Phone and Password */}
                <IntelligentInput
                    submitButtonText="Sign Up"
                    // You'll need to lift state from IntelligentInput if you want to use its values here
                    // For now, we'll assume IntelligentInput handles its own internal state for validation
                    // and you'll get the final values on form submission.
                    // If you need the values in SignUpPage, you'd pass callbacks like:
                    // onEmailOrPhoneChange={setEmailOrPhoneValue}
                    // onPasswordChange={setPasswordValue}
                />

                {/* New Confirm Password Input Field */}
                <AnimatePresence initial={false}>
                    {/* Only show confirm password if IntelligentInput's password field is visible */}
                    {/* This condition needs to be linked to IntelligentInput's internal state,
                        which is not directly exposed. For now, we'll make a simple assumption
                        that if the main input has an '@' (implying email and thus password),
                        we show confirm password. A more robust solution would involve
                        IntelligentInput exposing a prop like `isPasswordVisible`.
                    */}
                    {emailOrPhoneValue.includes("@") && ( // This is a temporary heuristic
                        <motion.div
                            key="confirm-password-field"
                            className="w-full max-w-md mx-auto relative mt-4"
                            initial={{ opacity: 0, y: -16 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -16 }}
                            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                        >
                            <label
                                className={`absolute left-4 transition-all duration-200 pointer-events-none px-1
                                    ${confirmPasswordFocus
                                        ? 'text-xs -top-3 px-2 text-[#4870fe] dark:text-[hsl(22,100%,52%)]'
                                        : confirmPassword
                                            ? 'text-xs -top-3 px-2 dark:text-zinc-400'
                                            : 'text-base top-3 dark:text-zinc-400'}
                                `}
                                style={{
                                    zIndex: 2,
                                    transform: (confirmPasswordFocus || confirmPassword) ? 'scale(0.95)' : 'none',
                                    background:
                                        (!confirmPasswordFocus && !confirmPassword && typeof window !== 'undefined' && document.documentElement.classList.contains('dark'))
                                            ? 'transparent'
                                            : 'var(--label-bg)',
                                    color:
                                        typeof window !== 'undefined' && document.documentElement.classList.contains('dark') && confirmPasswordFocus
                                            ? 'hsl(22, 100%, 52%)'
                                            : undefined,
                                    '--solar': '22 100% 52%',
                                    '--mask-gradient': 'linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 50%, rgba(0,0,0,0) 100%)'
                                } as React.CSSProperties}
                                htmlFor="confirm-password-input"
                            >
                                Confirm Password
                            </label>
                            <input
                                id="confirm-password-input"
                                type="password"
                                className="w-full px-6 py-4 rounded-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#4870fe] dark:focus:ring-[hsl(var(--solar))] transition-all duration-200 relative z-1"
                                style={{
                                    '--solar': '22 100% 52%',
                                    '--mask-gradient': 'linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 50%, rgba(0,0,0,0) 100%)'
                                } as React.CSSProperties}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                onFocus={() => setConfirmPasswordFocus(true)}
                                onBlur={() => setConfirmPasswordFocus(false)}
                                autoComplete="new-password"
                            />
                            {confirmPasswordError && (
                                <div className="flex items-center gap-1 mt-2 text-sm font-medium text-[#e11d48] dark:text-[#ff6b81]">
                                    <FiAlertCircle className="w-4 h-4" />
                                    <span>{confirmPasswordError}</span>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>


                <div className="w-full max-w-md mx-auto my-6 flex items-center">
                    <div className="flex-grow border-t border-zinc-300 dark:border-zinc-700"></div>
                    <span className="flex-shrink mx-4 text-zinc-500 dark:text-zinc-400 text-sm font-medium">
                        OR
                    </span>
                    <div className="flex-grow border-t border-zinc-300 dark:border-zinc-700"></div>
                </div>
                <div className="w-full max-w-md mx-auto mb-2">
                    <SocialProviders isMobile={isMobile} />
                </div>


                {/* Sign In Link */}
                <div className="mt-4 text-center text-zinc-600 dark:text-zinc-400 text-sm">
                    Already have an account?{" "}
                    <a href="/auth/sign-in" className="text-[#4870fe] dark:text-[hsl(22,100%,52%)] hover:underline">
                        Sign in
                    </a>
                </div>

                {/* Terms and Policy */}
                <div className="mt-8 text-center max-w-md mx-auto">
                    <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400 select-none px-4 py-2 rounded-xl">
                        By signing up, you agree to our{' '}
                        <a href="/terms" target="_blank" rel="noopener noreferrer" className="font-medium text-zinc-600 dark:text-zinc-300 hover:text-zinc-800 dark:hover:text-zinc-100 underline">Terms</a>
                        {' '}and our{' '}
                        <a href="/privacy" target="_blank" rel="noopener noreferrer" className="font-medium text-zinc-600 dark:text-zinc-300 hover:text-zinc-800 dark:hover:text-zinc-100 underline">Privacy Policy</a>.
                    </span>
                </div>
            </div>
        </div>
    );
}