// In IntelligentInput.tsx
"use client";

import { useState, useRef, useLayoutEffect, useEffect } from "react";
import { parsePhoneNumberFromString, isValidPhoneNumber } from "libphonenumber-js";
import { motion, AnimatePresence } from "framer-motion";
import { FiAlertCircle } from "react-icons/fi";

// Add the submitButtonText prop to the component's type definition
interface IntelligentInputProps {
    submitButtonText?: string; // Optional prop for custom button text
}

// Update the function signature to accept the prop
export default function IntelligentInput({ submitButtonText = "Continue" }: IntelligentInputProps) {
    const [value, setValue] = useState("");
    const [isFocused, setIsFocused] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [isPhone, setIsPhone] = useState(false);
    const [password, setPassword] = useState("");
    const clickAudio = useRef<HTMLAudioElement | null>(null);
    const [passwordFocus, setPasswordFocus] = useState(false);
    const [phoneError, setPhoneError] = useState("");
    const [pendingPhoneError, setPendingPhoneError] = useState("");
    const [passwordError, setPasswordError] = useState("");
    const [emailError, setEmailError] = useState("");

    // New states for password strength UI
    const [passwordStrengthScore, setPasswordStrengthScore] = useState(0);
    const [passwordStrengthText, setPasswordStrengthText] = useState("");
    const [passwordStrengthColor, setPasswordStrengthColor] = useState("");

    // Debounced phone error display
    useEffect(() => {
        const handler = setTimeout(() => {
            setPhoneError(pendingPhoneError);
        }, 400);
        return () => clearTimeout(handler);
    }, [pendingPhoneError]);

    // Function to calculate password strength
    const getPasswordStrength = (pwd: string) => {
        let score = 0;
        const feedbackMessages = [];

        // Criteria checks
        const hasMinLength = pwd.length >= 8;
        const hasLetter = /[A-Za-z]/.test(pwd);
        const hasNumber = /\d/.test(pwd);
        const hasSpecialChar = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(pwd);

        if (hasMinLength) score += 1;
        if (hasLetter) score += 1;
        if (hasNumber) score += 1;
        if (hasSpecialChar) score += 1;

        // Determine text and color based on score
        let text = "";
        let color = "";

        if (pwd.length === 0) {
            text = "";
            color = "bg-transparent";
        } else if (score <= 1) {
            text = "Very Weak";
            color = "bg-red-500";
        } else if (score === 2) {
            text = "Average";
            color = "bg-yellow-500";
        } else if (score === 3) {
            text = "Good";
            color = "bg-blue-500"; // A nice middle ground color
        } else if (score === 4) {
            text = "Strong";
            color = "bg-green-500";
        }

        // Update passwordError based on missing criteria
        if (pwd.length > 0) {
            if (!hasMinLength) feedbackMessages.push("Password must be at least 8 characters long.");
            if (!hasLetter) feedbackMessages.push("Password must contain at least one letter.");
            if (!hasNumber) feedbackMessages.push("Password must contain at least one number.");
            if (!hasSpecialChar) feedbackMessages.push("Password must contain at least one special character.");
        }

        // Set the password error message (only the first one for clarity)
        setPasswordError(feedbackMessages.length > 0 ? feedbackMessages[0] : "");

        return { score, text, color };
    };

    // Fast, synchronous detection logic
    useLayoutEffect(() => {
        // If the value contains any letters, treat as email (even if no @ yet)
        const isLikelyEmail = /[a-zA-Z]/.test(value);
        if (isLikelyEmail) {
            setShowPassword(true);
            setIsPhone(false);
            setPendingPhoneError("");
            // Email format validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (value.length > 0 && value.includes("@") && !emailRegex.test(value)) {
                setEmailError("Please enter a valid email address.");
            } else {
                setEmailError("");
            }
            if (!showPassword) clickAudio.current?.play();
        } else {
            setEmailError("");
            // Use libphonenumber-js for robust phone validation
            const cleaned = value.replace(/\s+/g, "");
            if (cleaned.length === 0) {
                setPendingPhoneError("");
                setIsPhone(false);
                setShowPassword(false);
                return;
            }
            if (!cleaned.startsWith("+")) {
                setPendingPhoneError("Please use an international country code, e.g. +234");
                setIsPhone(false);
                setShowPassword(false);
                return;
            }
            // Accept partial phone numbers, but only show error if length > 3
            if (cleaned.length <= 3) {
                setPendingPhoneError("");
                setIsPhone(false);
                setShowPassword(false);
                return;
            }
            // Use libphonenumber-js to parse and validate
            const phoneNumber = parsePhoneNumberFromString(cleaned);
            if (phoneNumber && phoneNumber.isValid()) {
                setIsPhone(true);
                setShowPassword(false);
                setPendingPhoneError("");
                return;
            } else {
                setPendingPhoneError("Invalid phone number. Please check the number and country code.");
            }
            setIsPhone(false);
            setShowPassword(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
        setValue(e.target.value);
    }

    function handlePasswordChange(e: React.ChangeEvent<HTMLInputElement>) {
        const val = e.target.value;
        setPassword(val);
        const { score, text, color } = getPasswordStrength(val);
        setPasswordStrengthScore(score);
        setPasswordStrengthText(text);
        setPasswordStrengthColor(color);
    }

    return (
        <div className="w-full max-w-md mx-auto flex flex-col items-center relative">
            <div className="w-full relative">
                <label
                    className={`absolute left-4 transition-all duration-200 pointer-events-none px-1
                    ${isFocused
                            ? 'text-xs -top-3 px-2 text-[#4870fe] dark:text-[hsl(22,100%,52%)]'
                            : value
                                ? 'text-xs -top-3 px-2 dark:text-zinc-400'
                                : 'text-base top-3 dark:text-zinc-400'}
                  `}
                    style={{
                        zIndex: 2,
                        transform: (isFocused || value) ? 'scale(0.95)' : 'none',
                        background:
                            (!isFocused && !value && typeof window !== 'undefined' && document.documentElement.classList.contains('dark'))
                                ? 'transparent'
                                : 'var(--label-bg)',
                        color:
                            typeof window !== 'undefined' && document.documentElement.classList.contains('dark') && isFocused
                                ? 'hsl(22, 100%, 52%)'
                                : undefined,
                        '--solar': '22 100% 52%',
                        '--mask-gradient': 'linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 50%, rgba(0,0,0,0) 100%)'
                    } as React.CSSProperties}
                >
                    Email or Phone Number
                </label>
                <input
                    type="text"
                    className="w-full px-6 py-4 rounded-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#4870fe] dark:focus:ring-[hsl(var(--solar))] transition-all duration-200 relative z-1"
                    style={{
                        '--solar': '22 100% 52%',
                        '--mask-gradient': 'linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 50%, rgba(0,0,0,0) 100%)'
                    } as React.CSSProperties}
                    value={value}
                    onChange={handleChange}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    autoComplete="username"
                />
            </div>
            {emailError && (
                <div className="flex items-center gap-1 mt-2 text-sm font-medium text-[#e11d48] dark:text-[#ff6b81]">
                    <FiAlertCircle className="w-4 h-4" />
                    <span>{emailError}</span>
                </div>
            )}
            {phoneError && (
                <div className="flex items-center gap-1 mt-2 text-sm font-medium text-[#e11d48] dark:text-[#ff6b81]">
                    <FiAlertCircle className="w-4 h-4" />
                    <span>{phoneError}</span>
                </div>
            )}
            {/* Password field for email */}
            {/* <audio ref={clickAudio} src="/click.mp3" preload="auto" /> */}
            <AnimatePresence initial={false}>
                {showPassword && (
                    <>
                        <div className="w-full relative mt-4">
                            <label
                                className={`absolute left-4 transition-all duration-200 pointer-events-none px-1
                  ${passwordFocus
                                        ? 'text-xs -top-3 px-2 text-[#4870fe] dark:text-[hsl(22,100%,52%)]'
                                        : password
                                            ? 'text-xs -top-3 px-2 dark:text-zinc-400'
                                            : 'text-base top-3 dark:text-zinc-400'}
                `}
                                style={{
                                    zIndex: 2,
                                    transform: (passwordFocus || password) ? 'scale(0.95)' : 'none',
                                    background:
                                        (!passwordFocus && !password && typeof window !== 'undefined' && document.documentElement.classList.contains('dark'))
                                            ? 'transparent'
                                            : 'var(--label-bg)',
                                    color:
                                        typeof window !== 'undefined' && document.documentElement.classList.contains('dark') && passwordFocus
                                            ? 'hsl(22, 100%, 52%)'
                                            : undefined,
                                    '--solar': '22 100% 52%',
                                    '--mask-gradient': 'linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 50%, rgba(0,0,0,0) 100%)'
                                } as React.CSSProperties}
                                htmlFor="password-input"
                            >
                                Password
                            </label>
                            <motion.input
                                id="password-input"
                                key="password"
                                type="password"
                                className="w-full px-6 py-4 rounded-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#4870fe] dark:focus:ring-[hsl(var(--solar))] transition-all duration-300 relative z-1"
                                style={{
                                    '--solar': '22 100% 52%',
                                    '--mask-gradient': 'linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 50%, rgba(0,0,0,0) 100%)'
                                } as React.CSSProperties}
                                value={password}
                                onChange={handlePasswordChange}
                                autoComplete="current-password"
                                onFocus={() => setPasswordFocus(true)}
                                onBlur={() => setPasswordFocus(false)}
                                initial={{ opacity: 0, y: -16 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -16 }}
                                transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                            />
                            {/* Password Strength Indicator */}
                            <AnimatePresence initial={false}>
                                {(password.length > 0 && passwordStrengthScore < 4) && ( // Condition changed here!
                                    <motion.div
                                        key="password-strength-indicator"
                                        className="w-full mt-2"
                                        initial={{ opacity: 0, y: -8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -8 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                                                Password Strength:
                                            </span>
                                            <span className={`text-xs font-semibold ${passwordStrengthColor.replace('bg-', 'text-')}`}>
                                                {passwordStrengthText}
                                            </span>
                                        </div>
                                        <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-2 overflow-hidden">
                                            <motion.div
                                                className={`h-full rounded-full ${passwordStrengthColor}`}
                                                initial={{ width: 0 }}
                                                animate={{ width: `${(passwordStrengthScore / 4) * 100}%` }}
                                                transition={{ duration: 0.2 }}
                                            />
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                            {passwordError && (
                                <div className="flex items-center gap-1 mt-2 text-sm font-medium text-[#e11d48] dark:text-[#ff6b81]">
                                    <FiAlertCircle className="w-4 h-4" />
                                    <span>{passwordError}</span>
                                </div>
                            )}
                            {/* Continue button if email and password are valid */}
                            <AnimatePresence initial={false}>
                                {(!passwordError && !emailError && password.length > 0 && value.length > 0 && value.includes("@")) && (
                                    <motion.button
                                        key="continue-btn"
                                        className="ml-2 mt-4 px-4 py-3 rounded-full bg-black dark:bg-zinc-200 text-white dark:text-black font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors duration-200 w-full cursor-pointer"
                                        type="button"
                                        initial={{ opacity: 0, y: -16 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -16 }}
                                        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                                    >
                                        {submitButtonText} {/* Use the prop here! */}
                                    </motion.button>
                                )}
                            </AnimatePresence>
                        </div>
                        <motion.div
                            key="forgot-password"
                            className="flex w-full mt-2"
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                        >
                            <span className="text-sm font-medium text-[#4870fe] dark:text-[hsl(22,100%,52%)] cursor-pointer select-none pl-3">
                                Forgot Password
                            </span>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
            {/* Send Code button for phone */}
            <AnimatePresence initial={false}>
                {isPhone && (
                    <motion.button
                        key="send-code"
                        className="ml-2 mt-4 px-4 py-3 rounded-full bg-black dark:bg-zinc-200 text-white dark:text-black font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors duration-200 w-full cursor-pointer"
                        type="button"
                        initial={{ opacity: 0, y: -16 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -16 }}
                        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                    >
                        Send Code
                    </motion.button>
                )}
            </AnimatePresence>
            <style jsx global>{`
        label {
          --label-bg: #fff;
        }
        html.dark label {
          --label-bg: #000;
        }
        @keyframes slide-in {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-in {
          animation: slide-in 0.2s cubic-bezier(0.4,0,0.2,1);
        }
      `}</style>
        </div>
    );
}