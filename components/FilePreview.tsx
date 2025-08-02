"use client"

// NEW: Import the icons needed for different file types
import { X, FileIcon, Expand, FileText, FileSpreadsheet, Presentation } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { motion } from "framer-motion"
import type { StagedFile } from "@/components/chats/user-chat"

interface FilePreviewProps {
  stagedFile: StagedFile
  onRemove: () => void
  onPreview: (file: StagedFile) => void
}

export const filePreviewVariants = {
  hidden: { opacity: 0, y: 10, scale: 0.8 },
  visible: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -10, scale: 0.8 },
}

// NEW: Helper function to determine the correct icon and color based on file type
const getFileStyle = (fileType: string) => {
  if (fileType.includes("pdf")) {
    return { Icon: FileText, color: "text-red-500" };
  }
  if (fileType.includes("word")) {
    return { Icon: FileText, color: "text-blue-600" };
  }
  if (fileType.includes("sheet") || fileType.includes("excel")) {
    return { Icon: FileSpreadsheet, color: "text-green-600" };
  }
  if (fileType.includes("presentation") || fileType.includes("powerpoint")) {
    return { Icon: Presentation, color: "text-orange-600" };
  }
  if (fileType === "text/plain") {
    // This is your original style for .txt files
    return { Icon: FileText, color: "text-green-600 dark:text-green-500" };
  }
  // This is the fallback for any other non-image file
  return { Icon: FileIcon, color: "text-zinc-500" };
};


export const FilePreview = ({ stagedFile, onRemove, onPreview }: FilePreviewProps) => {
  const { file, previewUrl, isUploading, uploadProgress, error, uploadedAttachment } = stagedFile
  const { name: fileName, type: fileType } = file

  const showProgress = isUploading || (uploadProgress !== undefined && uploadProgress < 100)
  const displayUrl = uploadedAttachment?.downloadUrl || previewUrl
  
  const isImage = fileType.startsWith("image/") && displayUrl
  
  // NEW: Get the dynamic icon and color for the current file
  const { Icon, color } = getFileStyle(fileType);

  return (
    <motion.div
      layout
      variants={filePreviewVariants}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="relative flex-shrink-0"
    >
      <TooltipProvider delayDuration={100}>
        {/*
          The group logic now needs to check if it's NOT an image,
          so the hover effect works for all document chips.
        */}
        <div className={!isImage ? "group" : ""}>
          <Tooltip>
            <TooltipTrigger asChild>
              {isImage ? (
                // --- IMAGE PREVIEW (UNCHANGED) ---
                <button
                  type="button"
                  onClick={() => onPreview(stagedFile)}
                  disabled={isUploading || !!error}
                  className="group cursor-pointer rounded-lg"
                >
                  <div className="relative h-20 w-20">
                    <img src={displayUrl} alt={fileName} className="h-full w-full rounded-lg object-cover" />
                    <div className="absolute inset-0 rounded-lg bg-black/0 transition-colors group-hover:bg-black/30 flex items-center justify-center">
                      <Expand className="h-6 w-6 text-white opacity-0 transition-opacity group-hover:opacity-100" />
                    </div>
                  </div>
                </button>
              ) : (
                // --- UNIFIED DOCUMENT CHIP (USING YOUR STYLES) ---
                <button
                  type="button"
                  onClick={() => onPreview(stagedFile)}
                  disabled={isUploading || !!error}
                  // YOUR styles are preserved here
                  className="group h-12 w-48 max-w-48 rounded-lg flex items-center text-left transition-colors duration-200
                             bg-zinc-100 border border-zinc-200/80 hover:border-zinc-300 hover:bg-zinc-200 cursor-pointer
                             dark:bg-zinc-900/40 dark:border-zinc-700/40 dark:hover:border-zinc-600/40 dark:hover:bg-zinc-900
                             pl-2.5 pr-1.5"
                >
                  {/* The Icon component and its color are now dynamic */}
                  <Icon className={`h-5 w-5 flex-shrink-0 ${color}`} />
                  <p className="flex-grow truncate text-sm font-medium text-zinc-700 dark:text-zinc-200 pl-2">
                    {fileName}
                  </p>
                  
                  <div
                    role="button"
                    aria-label="Remove file"
                    onClick={(e) => {
                      e.stopPropagation()
                      onRemove()
                    }}
                    // YOUR styles for the 'X' button are preserved here
                    className="flex-shrink-0 h-7 w-7 flex cursor-pointer items-center justify-center rounded-md text-zinc-500 dark:text-zinc-400 opacity-0 group-hover:opacity-100 hover:bg-zinc-200 dark:hover:bg-zinc-700/60"
                  >
                    <X size={16} />
                  </div>
                </button>
              )}
            </TooltipTrigger>
            <TooltipContent side="bottom" className="bg-black text-white dark:bg-white dark:text-black">
              <p>{fileName}</p>
            </TooltipContent>
          </Tooltip>

          {/* This "X" button now ONLY applies to image files */}
          {isImage && (
            <button
              onClick={onRemove}
              className="absolute -right-2 -top-2 h-5 w-5 flex items-center justify-center rounded-full bg-zinc-600 text-white opacity-0 transition-all duration-300 group-hover:opacity-100 hover:scale-110 dark:bg-zinc-300 dark:text-black z-10"
              aria-label="Remove file"
            >
              <X size={14} />
            </button>
          )}

          {/* Progress/Error Overlay (Unchanged) */}
          {showProgress && (
            <div className="absolute inset-0 flex flex-col items-center justify-center rounded-lg bg-black/60 p-2 pointer-events-none">
              {error ? (
                <p className="text-red-400 text-xs font-semibold text-center">Failed</p>
              ) : (
                <div className="w-full px-4">
                  <div className="h-1.5 w-full rounded-full bg-zinc-700">
                    <div className="h-full w-full rounded-full bg-blue-500 transition-all duration-300" style={{ width: `${uploadProgress || 0}%` }} />
                  </div>
                  <p className="mt-1.5 text-white text-xs text-center">{uploadProgress}%</p>
                </div>
              )}
            </div>
          )}
        </div>
      </TooltipProvider>
    </motion.div>
  )
}