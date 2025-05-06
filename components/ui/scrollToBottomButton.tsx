// components/ui/scroll-to-bottom-button.tsx
import React from "react";
import { ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface ScrollToBottomButtonProps {
  onClick: () => void;
  isVisible: boolean;
}

export const ScrollToBottomButton: React.FC<ScrollToBottomButtonProps> = ({ onClick, isVisible }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Scroll to bottom"
      className={cn(
        "fixed left-1/2 -translate-x-1/2 z-20",
        // Positioning: Adjust 'bottom' value based on your Textarea height + desired gap
        // This assumes your Textarea and its surrounding fixed elements are roughly this height.
        // Example: If Textarea container is ~6rem high, 7rem or 8rem bottom should be ~1-2rem above.
        "bottom-28 md:bottom-32", // current: 7rem / 8rem from bottom of viewport
        "rounded-full p-2",
        // Sleek background: Semi-transparent, blurred glass effect
        "bg-background/70 dark:bg-background/60 backdrop-blur-sm",
        "border border-black/10 dark:border-white/10",
        "shadow-md hover:shadow-lg transition-shadow duration-300 ease-out", // Shadow transition can remain slower
        "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background",
        
        // Visibility transition: Fast appear, slightly slower disappear
        // Apply base opacity/scale and transitions that can be overridden.
        // Base state (hidden)
        "opacity-0 scale-95 pointer-events-none", 
        // Transitions for opacity and transform (scale)
        "transition-opacity duration-150 ease-out", // Fast for opacity (both in and out)
        "transform transition-transform duration-150 ease-out", // Fast for scale (both in and out)

        isVisible && "opacity-100 scale-100 pointer-events-auto", // Visible state override
        
        "animate-float" // Apply the floating animation (defined in your CSS File 4)
      )}
    >
      <ArrowDown className="h-5 w-5 text-foreground/80" />
    </button>
  );
};