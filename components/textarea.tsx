import { modelID} from "@/ai/providers";
import { Textarea as ShadcnTextarea, ReasonButton } from "@/components/ui/textarea";
import { ArrowUp } from "lucide-react";
import { PauseIcon } from "./icons";
import { ModelPicker } from "./model-picker";

interface InputProps {
  input: string;
  handleInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  isLoading: boolean;
  status: string;
  stop: () => void;
  selectedModel: modelID;
  setSelectedModel: (model: modelID) => void;
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
  return (
    <div className="relative w-full pt-4 bg-transparent dark:bg-transparent">
      {/* Model name display commented out for now */}
      {/*
      <div className="absolute left-2 top-2 text-xs font-medium bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-md max-w-[60vw] truncate">
        {MODEL_DISPLAY_NAMES[selectedModel] || selectedModel}
      </div>
      */}
      <ShadcnTextarea
        className="resize-none bg-transparent dark:bg-transparent w-full rounded-2xl pr-12 pt-4 pb-16"
        value={input}
        autoFocus
        placeholder={"Ask Parrot..."}
        // @ts-expect-error err
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
      
      <ReasonButton selectedModel={selectedModel} setSelectedModel={setSelectedModel} />

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
