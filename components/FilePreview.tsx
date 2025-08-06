"use client"

// Imports are unchanged
import { X, FileIcon, Expand, FileText, FileSpreadsheet, Presentation, LucideProps } from "lucide-react"
import { ForwardRefExoticComponent, RefAttributes } from "react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { motion } from "framer-motion"
import type { StagedFile } from "@/components/chats/user-chat"

// --- REFINED CIRCULAR PROGRESS COMPONENT (Unchanged) ---
const CircularProgress = ({ progress }: { progress: number }) => {
  const radius = 8; 
  const strokeWidth = 2.5;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative h-4 w-4"> 
      <svg className="h-full w-full" viewBox="0 0 20 20">
        <circle
          className="text-zinc-200 dark:text-zinc-700"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx="10"
          cy="10"
        />
        <motion.circle
          className="text-blue-500 dark:text-blue-400"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx="10"
          cy="10"
          transform="rotate(-90 10 10)"
          transition={{ ease: "linear", duration: 0.2 }}
        />
      </svg>
    </div>
  );
};


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

// Type definitions are unchanged
type FileStyle =
  | { type: "image"; payload: string }
  | {
      type: "icon";
      payload: ForwardRefExoticComponent<Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>>;
      color: string;
    };

// The getFileStyle function is unchanged
const getFileStyle = (fileType: string): FileStyle => {
  if (fileType === "text/plain") {
    return { type: "image", payload: "/txt.png" };
  }
  if (fileType.includes("vnd.openxmlformats-officedocument.wordprocessingml.document")) {
    return { type: "image", payload: "/word.png" };
  }
  if (fileType.includes("vnd.openxmlformats-officedocument.presentationml.presentation")) {
    return { type: "image", payload: "/ppt.png" };
  }
  if (fileType.includes("pdf")) {
    return { type: "icon", payload: FileText, color: "text-red-500" };
  }
  if (fileType.includes("sheet") || fileType.includes("excel")) {
    return { type: "icon", payload: FileSpreadsheet, color: "text-green-600" };
  }
  return { type: "icon", payload: FileIcon, color: "text-zinc-500" };
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};


export const FilePreview = ({ stagedFile, onRemove, onPreview }: FilePreviewProps) => {
  const { file, previewUrl, isUploading, uploadProgress, error, uploadedAttachment } = stagedFile
  const { name: fileName, type: fileType, size: fileSize } = file

  const showProgress = isUploading || (uploadProgress !== undefined && uploadProgress < 100)
  const displayUrl = uploadedAttachment?.downloadUrl || previewUrl
  
  const isImage = fileType.startsWith("image/") && displayUrl
  
  const fileStyle = getFileStyle(fileType);

  return (
    <motion.div
      layout
      variants={filePreviewVariants}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="flex flex-col-reverse"
    >
      <TooltipProvider delayDuration={100}>
        <div className="group">
          <Tooltip>
            <TooltipTrigger asChild>
              {isImage ? (
                // --- IMAGE PREVIEW: FINAL ---
                <div
                  className="relative h-16 w-16" 
                >
                  <button
                    type="button"
                    onClick={() => onPreview(stagedFile)}
                    disabled={isUploading || !!error}
                    className="group h-full w-full cursor-pointer rounded-lg overflow-hidden"
                  >
                    <img src={displayUrl} alt={fileName} className="h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/30 flex items-center justify-center">
                      <Expand className="h-6 w-6 text-white opacity-0 transition-opacity group-hover:opacity-100" />
                    </div>
                  </button>
                  
                  {/* FINAL FIX: Progress bar is centered, percentage is below */}
                  {showProgress && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center rounded-lg bg-black/60 pointer-events-none">
                      {error ? (
                        <p className="text-red-400 text-xs font-semibold text-center p-2">Failed</p>
                      ) : (
                        <div className="w-full px-4">
                           {/* The bar comes first */}
                          <div className="h-1.5 w-full rounded-full bg-zinc-200/50">
                            <div className="h-full rounded-full bg-blue-500 transition-all duration-300" style={{ width: `${uploadProgress || 0}%` }} />
                          </div>
                           {/* The percentage comes second, below the bar */}
                          <p className="mt-1.5 text-white text-xs font-semibold text-center">{uploadProgress}%</p>
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    onClick={onRemove}
                    className="absolute top-1 right-1 h-5 w-5 flex items-center justify-center rounded-full bg-black/50 text-white transition-all duration-300 hover:scale-110 hover:bg-black/70 z-10"
                    aria-label="Remove file"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                // --- DOCUMENT CHIP (Unchanged) ---
                <div
                  onClick={() => !showProgress && !error && onPreview(stagedFile)}
                  className={`relative h-16 w-56 max-w-56 rounded-xl bg-[#f7f7f7] dark:bg-[#303030] 
                             p-3 pr-8 flex items-center text-left  
                             ${!showProgress && !error ? 'cursor-pointer hover:bg-zinc-200 dark:hover:bg-[#303030]/30' : 'cursor-default'}`}
                >
                  <div className="flex-shrink-0">
                    {fileStyle.type === 'image' ? (
                      <img src={fileStyle.payload} alt={fileName} className="h-10 w-10 object-contain" />
                    ) : (
                      <fileStyle.payload className={`h-8 w-8 ${fileStyle.color}`} />
                    )}
                  </div>

                  <div className="flex flex-col flex-grow truncate pl-2">
                    <p className="truncate text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                      {fileName}
                    </p>
                    
                    <div className="flex items-center space-x-1.5 h-5">
                      {showProgress ? (
                        <>
                          {!error && <CircularProgress progress={uploadProgress || 0} />}
                          <p className={`text-xs ${error ? 'text-red-500 font-medium' : 'text-zinc-500 dark:text-zinc-400'}`}>
                            {error ? 'Upload Failed' : `${uploadProgress || 0}%`}
                          </p>
                        </>
                      ) : (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          {formatFileSize(fileSize)}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div
                    role="button"
                    aria-label="Remove file"
                    onClick={(e) => {
                      e.stopPropagation()
                      onRemove()
                    }}
                    className="absolute top-2 right-2 h-5 w-5 flex items-center justify-center 
                               rounded-md cursor-pointer bg-black/5 text-zinc-600 
                               hover:bg-black/10 dark:bg-white/10 dark:text-zinc-300 dark:hover:bg-white/20"
                  >
                    <X size={12} />
                  </div>
                </div>
              )}
            </TooltipTrigger>
            <TooltipContent side="bottom" className="bg-black text-white dark:bg-white dark:text-black">
              <p>{fileName}</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    </motion.div>
  )
}