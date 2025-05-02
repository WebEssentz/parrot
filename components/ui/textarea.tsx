import * as React from "react"
import type { modelID } from "@/ai/providers";
import { defaultModel } from "@/ai/providers";
import { Lightbulb } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils"

const REASON_MODEL = "deepseek-r1-distill-llama-70b";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive flex field-sizing-content min-h-16 w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "bg-zinc-50 dark:bg-zinc-900",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }

function ReasonButton({
  selectedModel,
  setSelectedModel,
  hideTextOnMobile = false,
}: {
  selectedModel: modelID;
  setSelectedModel: (model: modelID) => void;
  hideTextOnMobile?: boolean;
}) {
  const isReasoning = selectedModel === REASON_MODEL;
  const [lit, setLit] = React.useState(false);

  const handleClick = () => {
    if (!isReasoning) {
      setSelectedModel(REASON_MODEL);
      setLit(true);
    } else {
      setSelectedModel(defaultModel);
      setLit(false);
    }
  };

    // Show icon-only on mobile/tablet (<1024px), icon+text on desktop (>=1024px)
  const [isMobileOrTablet, setIsMobileOrTablet] = React.useState(false);
  React.useEffect(() => {
    const check = () => setIsMobileOrTablet(window.innerWidth < 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Only show text on desktop (>=1024px), icon only on mobile/tablet
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-pressed={isReasoning}
          onClick={handleClick}
          className={
            cn(
              "inline-flex items-center cursor-pointer justify-center h-9 rounded-full border text-zinc-500 dark:text-zinc-400 bg-white dark:bg-zinc-900 font-medium px-2 transition-colors",
              isReasoning
                ? "bg-[#daeeff] text-[#1e93ff] dark:bg-[#2a4a6d] dark:text-[#46a5e7] hover:bg-[#b3d8ff] hover:shadow-[0_2px_8px_0_rgba(30,147,255,0.15)] dark:hover:bg-[#18304a]"
                : lit
                  ? "bg-[#e6f4ff] text-[#46a5e7] dark:bg-[#1a2a3d] dark:text-[#46a5e7] hover:bg-[#b3e0ff] hover:shadow-[0_2px_8px_0_rgba(70,165,231,0.15)] dark:hover:bg-[#142033]"
                  : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
            )
          }
          style={{ fontWeight: 500, minWidth: isMobileOrTablet ? 36 : 0 }}
          data-testid="composer-button-reason"
          aria-label="Reason"
        >
          <svg
            fill="none"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
            className={
              cn(
                "h-[18px] w-[18px] transition-colors duration-200",
                isReasoning
                  ? "fill-[#1e93ff] text-[#1e93ff]"
                  : lit
                    ? "fill-[#46a5e7] text-[#46a5e7]"
                    : "fill-none text-zinc-400"
              )
            }
          >
            <path
              d="m12 3c-3.585 0-6.5 2.9225-6.5 6.5385 0 2.2826 1.162 4.2913 2.9248 5.4615h7.1504c1.7628-1.1702 2.9248-3.1789 2.9248-5.4615 0-3.6159-2.915-6.5385-6.5-6.5385zm2.8653 14h-5.7306v1h5.7306v-1zm-1.1329 3h-3.4648c0.3458 0.5978 0.9921 1 1.7324 1s1.3866-0.4022 1.7324-1zm-5.6064 0c0.44403 1.7252 2.0101 3 3.874 3s3.43-1.2748 3.874-3c0.5483-0.0047 0.9913-0.4506 0.9913-1v-2.4593c2.1969-1.5431 3.6347-4.1045 3.6347-7.0022 0-4.7108-3.8008-8.5385-8.5-8.5385-4.6992 0-8.5 3.8276-8.5 8.5385 0 2.8977 1.4378 5.4591 3.6347 7.0022v2.4593c0 0.5494 0.44301 0.9953 0.99128 1z"
              clipRule="evenodd"
              fill={isReasoning ? "#1e93ff" : lit ? "#46a5e7" : "currentColor"}
              fillRule="evenodd"
            />
          </svg>
          {!isMobileOrTablet && (
            <span className="ml-2 font-medium text-sm">Reason</span>
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side={isMobileOrTablet ? "top" : "bottom"} className="select-none">
        Think before responding
      </TooltipContent>
    </Tooltip>
  );
}

export { ReasonButton };