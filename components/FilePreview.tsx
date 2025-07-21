"use client";

import { X, File as FileIcon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { motion } from "framer-motion";

interface FilePreviewProps {
  previewUrl: string | null; // Null for non-image files
  fileType: string;
  fileName: string;
  onRemove: () => void;
  // Add uploadProgress to FilePreviewProps
  uploadProgress?: number; 
  isUploading?: boolean; // New prop to indicate if the file is actively uploading
  error?: string; // New prop to show upload errors
}

// Animation variants for the preview item
export const filePreviewVariants = {
  hidden: { opacity: 0, y: 10, scale: 0.8 },
  visible: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -10, scale: 0.8 },
};

export const FilePreview = ({ previewUrl, fileType, fileName, onRemove, uploadProgress, isUploading, error }: FilePreviewProps) => {
  const showProgress = isUploading || (uploadProgress !== undefined && uploadProgress < 100);

  return (
    <TooltipProvider delayDuration={100}>
      <motion.div
        layout
        variants={filePreviewVariants}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className="relative h-20 w-20 flex-shrink-0"
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="group h-full w-full">
              {previewUrl && fileType.startsWith("image/") ? (
                <img
                  src={previewUrl}
                  alt={fileName}
                  className="h-full w-full rounded-xl object-cover"
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center rounded-xl bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800">
                  <FileIcon className="h-8 w-8 text-zinc-500" />
                  <p className="mt-1 w-full truncate px-1 text-center text-xs text-zinc-600 dark:text-zinc-400">
                    {fileName}
                  </p>
                </div>
              )}
              {showProgress && (
                <div className="absolute inset-0 flex flex-col items-center justify-center rounded-xl bg-black/50 p-2">
                  {error ? (
                    <p className="text-red-400 text-xs text-center">Upload Failed</p>
                  ) : (
                    <>
                      <div className="h-1 w-full rounded-full bg-zinc-700 mx-2">
                        <div 
                          className="h-full rounded-full bg-blue-500" 
                          style={{ width: `${uploadProgress || 0}%` }}
                        />
                      </div>
                      <p className="mt-1 text-white text-xs">{uploadProgress}%</p>
                    </>
                  )}
                </div>
              )}
              <button
                onClick={onRemove}
                className="absolute -right-2 -top-2 z-10 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-zinc-700 text-white opacity-0 transition-all duration-300 group-hover:opacity-100 hover:scale-110 dark:bg-zinc-200 dark:text-black"
                aria-label="Remove file"
              >
                <X size={16} />
              </button>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="select-none bg-black text-white dark:bg-white dark:text-black rounded-md font-medium shadow-lg">
            <p>{fileName}</p>
          </TooltipContent>
        </Tooltip>
      </motion.div>
    </TooltipProvider>
  );
};
