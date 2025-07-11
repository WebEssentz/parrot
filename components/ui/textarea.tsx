"use client";

import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import * as React from "react";
import { useRef, useLayoutEffect, useState } from "react";
import { motion } from "framer-motion";
import { Paperclip } from "lucide-react";

// WIP: We want to create a license line in our files like below
// It should say something about licensed use. ie. Avurna is not a free software to distribute, sell, or purchase, and is tied to the Avocado INC.

/**
 * 
 * @license
 * Copyright 2025 Avocado INC.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// Custom Search SVG icon
function SearchIcon({ className = "", ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-[18px] w-[18px]", className)}
      {...props}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12ZM11.9851 4.00291C11.9933 4.00046 11.9982 4.00006 11.9996 4C12.001 4.00006 12.0067 4.00046 12.0149 4.00291C12.0256 4.00615 12.047 4.01416 12.079 4.03356C12.2092 4.11248 12.4258 4.32444 12.675 4.77696C12.9161 5.21453 13.1479 5.8046 13.3486 6.53263C13.6852 7.75315 13.9156 9.29169 13.981 11H10.019C10.0844 9.29169 10.3148 7.75315 10.6514 6.53263C10.8521 5.8046 11.0839 5.21453 11.325 4.77696C11.5742 4.32444 11.7908 4.11248 11.921 4.03356C11.953 4.01416 11.9744 4.00615 11.9851 4.00291ZM8.01766 11C8.08396 9.13314 8.33431 7.41167 8.72334 6.00094C8.87366 5.45584 9.04762 4.94639 9.24523 4.48694C6.48462 5.49946 4.43722 7.9901 4.06189 11H8.01766ZM4.06189 13H8.01766C8.09487 15.1737 8.42177 17.1555 8.93 18.6802C9.02641 18.9694 9.13134 19.2483 9.24522 19.5131C6.48461 18.5005 4.43722 16.0099 4.06189 13ZM10.019 13H13.981C13.9045 14.9972 13.6027 16.7574 13.1726 18.0477C12.9206 18.8038 12.6425 19.3436 12.3823 19.6737C12.2545 19.8359 12.1506 19.9225 12.0814 19.9649C12.0485 19.9852 12.0264 19.9935 12.0153 19.9969C12.0049 20.0001 11.9999 20 11.9999 20C11.9999 20 11.9948 20 11.9847 19.9969C11.9736 19.9935 11.9515 19.9852 11.9186 19.9649C11.8494 19.9225 11.7455 19.8359 11.6177 19.6737C11.3575 19.3436 11.0794 18.8038 10.8274 18.0477C10.3973 16.7574 10.0955 14.9972 10.019 13ZM15.9823 13C15.9051 15.1737 15.5782 17.1555 15.07 18.6802C14.9736 18.9694 14.8687 19.2483 14.7548 19.5131C17.5154 18.5005 19.5628 16.0099 19.9381 13H15.9823ZM19.9381 11C19.5628 7.99009 17.5154 5.49946 14.7548 4.48694C14.9524 4.94639 15.1263 5.45584 15.2767 6.00094C15.6657 7.41167 15.916 9.13314 15.9823 11H19.9381Z"
        fill="currentColor"
      />
    </svg>
  );
}


export function AttachButton({
  onClick,
  disabled,
}: {
  onClick?: () => void;
  disabled?: boolean;
}) {
  const [isMobileOrTablet, setIsMobileOrTablet] = React.useState(false);
  React.useEffect(() => {
    const check = () => setIsMobileOrTablet(window.innerWidth < 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          className={cn(
            "inline-flex items-center cursor-pointer justify-center h-8 rounded-full text-zinc-500 dark:text-zinc-400 bg-[#ffffff] dark:bg-transparent font-medium px-2.5", // Adjusted dark bg and -ml
            "hover:bg-zinc-100 dark:hover:bg-zinc-700/70", // Adjusted dark hover bg
            disabled ? "opacity-50 cursor-not-allowed" : ""
          )}
          data-testid="composer-button-attach"
          aria-label="Attach file"
        >
          <Paperclip
            className={cn("h-5 w-5")}
          />
        </button>
      </TooltipTrigger>
      <TooltipContent side={"top"} className="select-none">
        {disabled ? "Processing..." : "Attach files"}
      </TooltipContent>
    </Tooltip>
  );
}

// Framer Motion Animated Textarea - FULLY UPDATED
function Textarea({
  className,
  rows = 1,
  style,
  ...props
}: React.ComponentProps<"textarea"> & { rows?: number }) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fadeRef = useRef<HTMLDivElement>(null);
  const [isScrolled, setIsScrolled] = useState(false);

  const initialMinHeight = typeof style?.minHeight === 'number' 
    ? style.minHeight 
    : (rows > 1 ? undefined : 40); 
  const [animatedHeight, setAnimatedHeight] = useState<number | string>(initialMinHeight || 'auto');

  const value = props.value;
  const minHeightFromStyle = style?.minHeight;
  const maxHeightFromStyle = style?.maxHeight;

  // Detect scroll position for fade effect
  React.useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const handleScroll = () => {
      setIsScrolled(textarea.scrollTop > 0);
    };
    textarea.addEventListener('scroll', handleScroll);
    // Initial check
    setIsScrolled(textarea.scrollTop > 0);
    return () => textarea.removeEventListener('scroll', handleScroll);
  }, [textareaRef.current]);

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      const computedStyle = window.getComputedStyle(textarea);
      const computedMinHeight = parseFloat(computedStyle.minHeight); // Use minHeight from style prop if available via computedStyle
      const effectiveMaxHeight = typeof maxHeightFromStyle === 'number' ? maxHeightFromStyle : Infinity;
      const prevHeight = textarea.style.height;
      textarea.style.height = 'auto';
      const scrollHeight = textarea.scrollHeight;
      let targetHeight = scrollHeight;
      if (effectiveMaxHeight !== Infinity) {
        targetHeight = Math.min(targetHeight, effectiveMaxHeight);
      }
      // Ensure targetHeight respects the effective minHeight (from style or CSS default)
      targetHeight = Math.max(targetHeight, computedMinHeight);
      if (animatedHeight !== targetHeight || typeof animatedHeight === 'string') {
        setAnimatedHeight(targetHeight);
      }
      if (textarea.style.height !== `${targetHeight}px`) {
         textarea.style.height = `${targetHeight}px`;
      }
    }
  }, [value, rows, minHeightFromStyle, maxHeightFromStyle, animatedHeight]);

  // Light mode detection
  const [isLightMode, setIsLightMode] = useState(true);
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const match = window.matchMedia('(prefers-color-scheme: dark)');
      setIsLightMode(!match.matches);
      const listener = (e: MediaQueryListEvent) => setIsLightMode(!e.matches);
      match.addEventListener('change', listener);
      return () => match.removeEventListener('change', listener);
    }
  }, []);

  return (
    <motion.div
      animate={{ height: animatedHeight }}
      transition={{ type: "tween", duration: 0.2, ease: "circOut" }}
      style={{ overflow: "hidden", width: "100%", position: 'relative' }}
    >
      <textarea
        ref={textareaRef}
        data-slot="textarea"
        className={cn(
          "border-input placeholder:text-muted-foreground w-full rounded-md border px-3 py-2 text-base outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm min-h-10",
          "!shadow-none !backdrop-blur-none", // No shadow or blur
          isLightMode
            ? "bg-white bg-opacity-100 border-black"
            : "bg-zinc-900/80 dark:bg-transparent",
          className
        )}
        style={{ ...style, height: animatedHeight, minHeight: 64, overflowY: (textareaRef.current && typeof maxHeightFromStyle === "number" && typeof animatedHeight === "number" && animatedHeight >= maxHeightFromStyle && textareaRef.current.scrollHeight > animatedHeight) ? "auto" : "hidden", zIndex: 1, position: 'relative' }}
        rows={rows} {...props}
      />
      
      {/* Removed the top fade shadow div entirely */}

      {/* Removed the box-shadow from the focus state */}
      {/* {isLightMode && (
        <style>{`
          textarea[data-slot="textarea"]:focus-visible {
            box-shadow: none;
            border-color: #a1a1aa;
          }
        `}</style>
      )} */}
    </motion.div>
  );
}
export { Textarea };