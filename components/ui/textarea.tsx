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
}: {
  selectedModel: modelID;
  setSelectedModel: (model: modelID) => void;
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

  // Show tooltip below on desktop, above on mobile
  const [isMobile, setIsMobile] = React.useState(false);
  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-pressed={isReasoning}
          onClick={handleClick}
          className={`absolute bottom-2 left-2 flex items-center gap-2 px-3 py-1.5 border rounded-full text-sm font-medium z-10
            ${isReasoning
              ? "bg-[#daeeff] text-[#1e93ff] dark:bg-[#2a4a6d] dark:text-[#46a5e7]"
              : "bg-transparent text-[#828282] dark:text-zinc-200"}
          `}
          style={{ minWidth: 70, fontWeight: 500 }}
        >
          <Lightbulb
            size={16}
            className={`transition-colors duration-200 ${isReasoning
              ? "fill-[#1e93ff] text-[#1e93ff]"
              : lit
                ? "fill-[#46a5e7] text-[#46a5e7]"
                : "fill-none text-zinc-400"}`}
            fill={isReasoning ? "#1e93ff" : lit ? "#46a5e7" : "none"}
          />
          Reason
        </button>
      </TooltipTrigger>
      <TooltipContent side={isMobile ? "top" : "bottom"} className="select-none">
        Think before responding
      </TooltipContent>
    </Tooltip>
  );
}

export { ReasonButton };