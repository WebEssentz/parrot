import * as React from "react"
import type { modelID } from "@/ai/providers";
import { defaultModel } from "@/ai/providers";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils"


// Custom Search SVG icon
function SearchIcon({ className = "", ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className + " h-[18px] w-[18px]"}
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

export const SEARCH_MODE = "__search_mode__";
export function SearchButton({
  selectedModel,
  setSelectedModel,
}: {
  selectedModel: string; // Accepts SEARCH_MODE or modelID
  setSelectedModel: (model: string) => void;
}) {
  const isSearching = selectedModel === SEARCH_MODE;
  const [lit, setLit] = React.useState(false);

  // Responsive: icon-only on mobile/tablet (<1024px), icon+text on desktop (>=1024px)
  const [isMobileOrTablet, setIsMobileOrTablet] = React.useState(false);
  React.useEffect(() => {
    const check = () => setIsMobileOrTablet(window.innerWidth < 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const handleClick = () => {
    if (!isSearching) {
        setSelectedModel(SEARCH_MODE); // Activate search mode
        setLit(true); // Keep visual indicator if desired
    } else {
        // IMPORTANT: Fall back to the *actual* default model ID here
        setSelectedModel(defaultModel); // Deactivate search, return to default
        setLit(false);
    }
  };
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-pressed={isSearching}
          onClick={handleClick}
          className={
            cn(
              // Increased height, padding, and added desktop margin
              "inline-flex items-center cursor-pointer justify-center h-9 rounded-full border text-zinc-500 dark:text-zinc-400 bg-white dark:bg-zinc-900 font-medium px-2.5 transition-colors",
              isSearching
                ? "bg-[#daeeff] text-[#1e93ff] dark:bg-[#2a4a6d] dark:text-[#46a5e7] hover:bg-[#b3d8ff] hover:shadow-[0_2px_8px_0_rgba(30,147,255,0.15)] dark:hover:bg-[#18304a]"
                : lit
                  ? "bg-[#e6f4ff] text-[#46a5e7] dark:bg-[#1a2a3d] dark:text-[#46a5e7] hover:bg-[#b3e0ff] hover:shadow-[0_2px_8px_0_rgba(70,165,231,0.15)] dark:hover:bg-[#142033]"
                  : "hover:bg-zinc-100 dark:hover:bg-zinc-800",
              // Add right margin on desktop only
              !isMobileOrTablet && "ml-2"
            )
          }
          style={{ fontWeight: 500, minWidth: isMobileOrTablet ? 40 : 0 }}
          data-testid="composer-button-search"
          aria-label="Search"
        >
          <SearchIcon
            className={
              cn(
                "h-[18px] w-[18px] transition-colors duration-200",
                isSearching
                  ? "text-[#1e93ff]"
                  : lit
                    ? "text-[#46a5e7]"
                    : "text-zinc-400"
              )
            }
          />
          {!isMobileOrTablet && (
            <span className="ml-1 font-medium text-sm">Search</span>
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side={isMobileOrTablet ? "top" : "bottom"} className="select-none">
        Search the web
      </TooltipContent>
    </Tooltip>
  );
}


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

export function ReasonButton({
  selectedModel,
  setSelectedModel,
  hideTextOnMobile = false,
}: {
  selectedModel: string;
  setSelectedModel: (model: string) => void;
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
            <span className="ml-1 font-medium text-sm">Reason</span>
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side={isMobileOrTablet ? "top" : "bottom"} className="select-none">
        Think before responding
      </TooltipContent>
    </Tooltip>
  );
}

// ReasonButton is now exported inline above