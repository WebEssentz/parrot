"use client";

import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import * as React from "react";
import { useRef, useLayoutEffect } from "react";
import { motion } from "framer-motion";
import { Loader2, Plus } from "lucide-react";

/**
 * @license
 * Copyright 2025 Avocado INC. All Rights Reserved.
 */

// 👇 MODIFIED: The AttachButton component is simplified to return only a button.
export const AttachButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { isUploading?: boolean; isActive?: boolean }
>(({ className, disabled, isUploading, isActive, ...props }, ref) => {
  const effectiveDisabled = disabled || isUploading;

  // Animation variants for the icon rotation
  const iconVariants = {
    closed: { rotate: 0 },
    open: { rotate: 45 },
  };

  return (
    <button
      ref={ref}
      disabled={effectiveDisabled}
      className={cn(
        "inline-flex items-center cursor-pointer justify-center h-8 w-8 rounded-full text-zinc-500 dark:text-zinc-400 bg-transparent font-medium transition-colors",
        "hover:bg-zinc-100 dark:hover:bg-zinc-700/40",
        effectiveDisabled ? "opacity-50 cursor-not-allowed" : "",
        isActive && "bg-zinc-200 dark:bg-[#303030]",
        className
      )}
      data-testid="composer-button-attach"
      aria-label="Add photos, files, and apps"
      {...props}
    >
      {isUploading ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : (
         <motion.div
          variants={iconVariants}
          animate={isActive ? "open" : "closed"}
          transition={{ duration: 0.2, ease: "easeInOut" }}
        >
          <Plus className="h-5 w-5" />
        </motion.div>
      )}
    </button>
  );
});
AttachButton.displayName = 'AttachButton';

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, style, ...props }, ref) => {
  const internalRef = useRef<HTMLTextAreaElement>(null);
  React.useImperativeHandle(ref, () => internalRef.current as HTMLTextAreaElement);

  const value = props.value;
  const minHeightFromStyle = style?.minHeight;
  const maxHeightFromStyle = style?.maxHeight;

  useLayoutEffect(() => {
    const textarea = internalRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const scrollHeight = textarea.scrollHeight;
      const effectiveMaxHeight = typeof maxHeightFromStyle === 'number' ? maxHeightFromStyle : Infinity;
      const targetHeight = Math.min(scrollHeight, effectiveMaxHeight);
      textarea.style.height = `${targetHeight}px`;
    }
  }, [value, minHeightFromStyle, maxHeightFromStyle]);

  return (
    <textarea
      ref={internalRef}
      className={cn(
        "border-input placeholder:text-muted-foreground w-full rounded-md border px-3 py-2 text-base outline-none focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "resize-none",
        className
      )}
      style={{
        ...style,
        overflowY: (internalRef.current && typeof maxHeightFromStyle === "number" && internalRef.current.scrollHeight > maxHeightFromStyle) ? "auto" : "hidden",
                scrollbarGutter: "stable both-edges", // reserve space consistently so the scrollbar sits inside without shifting content
      }}
      {...props}
    />
  );
});
Textarea.displayName = 'Textarea';

export { Textarea };