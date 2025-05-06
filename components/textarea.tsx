import { Textarea as ShadcnTextarea, ReasonButton, SearchButton, AttachButton } from "@/components/ui/textarea"; // Added AttachButton
import { ArrowUp } from "lucide-react";
import { PauseIcon } from "./icons";
import React from "react";

interface InputProps {
  input: string;
  // Use correct event type for textarea, not input
  handleInputChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  isLoading: boolean;
  status: 'idle' | 'submitted' | 'streaming' | 'error' | string; // Use specific statuses if known
  stop: () => void;
  selectedModel: string; // Can be modelID or SEARCH_MODE
  setSelectedModel: (model: string) => void; // Can set modelID or SEARCH_MODE
}

export const Textarea = ({
  input,
  handleInputChange,
  isLoading,
  status,
  stop,
  selectedModel,
  setSelectedModel,
}: InputProps) => {
  // Responsive: icon-only on mobile/tablet (<1024px), icon+text on desktop (>=1024px)
  const [isMobileOrTablet, setIsMobileOrTablet] = React.useState(false);
  React.useEffect(() => {
    const check = () => setIsMobileOrTablet(window.innerWidth < 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  

  return (
    <div className="relative w-full pt-4 bg-transparent dark:bg-transparent">
      {/* Model name display commented out for now */}
      {/*
      <div className="absolute left-2 top-2 text-xs font-medium bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-md max-w-[60vw] truncate">
        {MODEL_DISPLAY_NAMES[selectedModel] || selectedModel}
      </div>
      */}
      <ShadcnTextarea
        className="resize-none bg-transparent dark:bg-transparent w-full rounded-3xl pr-12 pt-4 pb-16 text-lg md:text-lg font-normal border-2 border-zinc-200 dark:border-zinc-700 shadow-lg min-h-[64px] placeholder:text-lg md:placeholder:text-lg"
        value={input}
        autoFocus
        placeholder={"Ask Parrot..."}
        onChange={handleInputChange}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (input.trim() && !isLoading) {
              // @ts-expect-error err
              const form = e.target.closest("form");
              if (form) form.requestSubmit();
            }
          }
        }}
      />
      
      {/* Action buttons row (mobile/tablet: icons only, desktop: show text) */}
      <div
        data-testid="composer-footer-actions"
        className={`max-xs:gap-1 flex items-center gap-2 overflow-x-auto [scrollbar-width:none] mt-2 absolute bottom-2 z-20 ${isMobileOrTablet ? 'left-0' : 'left-0'}`}
        style={{marginRight: 102}}
      >
        {/* New Attach Button */}
        <AttachButton onClick={() => console.log("Attach button clicked")} />
        
        {/* Search Button: icon only on mobile/tablet, icon+text on desktop */}
        <SearchButton
          selectedModel={selectedModel}
          setSelectedModel={setSelectedModel}
        />
        <ReasonButton
          selectedModel={selectedModel}
          setSelectedModel={setSelectedModel}
          hideTextOnMobile // This prop is part of ReasonButton's definition
        />
      </div>

      {status === "streaming" ? (
        <button
          type="button"
          onClick={stop}
          className="cursor-pointer absolute right-2 bottom-2 rounded-full p-2 bg-black dark:bg-white hover:bg-zinc-800 disabled:bg-zinc-300 disabled:cursor-not-allowed transition-colors"
          title="Stop generating"
        >
          <PauseIcon className="h-4 w-4 text-white dark:text-black cursor-pointer" />
        </button>
      ) : status === "submitted" ? (
        <button
          type="button"
          disabled
          className="cursor-not-allowed absolute right-2 bottom-2 rounded-full p-2 bg-zinc-300 dark:bg-white dark:opacity-60 text-zinc-400 dark:text-zinc-500 transition-colors"
        >
          <PauseIcon className="h-4 w-4 text-zinc-400 dark:text-zinc-500 cursor-not-allowed" />
        </button>
      ) : (
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className={`absolute right-2 bottom-2 rounded-full p-2
            ${isLoading || !input.trim()
              ? 'bg-zinc-300 dark:bg-white dark:opacity-60 text-zinc-400 dark:text-zinc-500 cursor-not-allowed'
              : 'dark:bg-white dark:text-black bg-black hover:bg-zinc-800 text-white'}
            `}
        >
          <ArrowUp className="h-4 w-4 transition-colors duration-300" />
        </button>
      )}
    </div>
  );
};