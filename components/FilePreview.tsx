"use client"

import { X, FileIcon, Expand } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { motion } from "framer-motion"
import type { AttachmentRecord } from "@/components/chats/user-chat"

interface FilePreviewProps {
  previewUrl: string | null
  fileType: string
  fileName: string
  onRemove: () => void
  onPreview: (url: string, name: string) => void
  uploadProgress?: number
  isUploading?: boolean
  error?: string
  uploadedAttachment?: AttachmentRecord
}

export const filePreviewVariants = {
  hidden: { opacity: 0, y: 10, scale: 0.8 },
  visible: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -10, scale: 0.8 },
}

export const FilePreview = ({
  previewUrl,
  fileType,
  fileName,
  onRemove,
  onPreview,
  uploadProgress,
  isUploading,
  error,
  uploadedAttachment,
}: FilePreviewProps) => {
  const showProgress = isUploading || (uploadProgress !== undefined && uploadProgress < 100)
  const displayUrl = uploadedAttachment?.downloadUrl || previewUrl
  const isImage = fileType.startsWith("image/") && displayUrl

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
              {isImage ? (
                <button
                  type="button"
                  onClick={() => onPreview(displayUrl, fileName)}
                  className="relative h-full w-full rounded-xl focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer"
                >
                  <img
                    src={displayUrl || "/placeholder.svg"}
                    alt={fileName}
                    className="h-full w-full rounded-xl object-cover"
                    onError={(e) => {
                      e.currentTarget.src = "/placeholder.svg?height=80&width=80"
                    }}
                  />
                  <div className="absolute inset-0 rounded-xl bg-black/0 transition-colors group-hover:bg-black/30 flex items-center justify-center">
                    <Expand className="h-6 w-6 text-white opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                </button>
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center rounded-xl bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800">
                  <FileIcon className="h-8 w-8 text-zinc-500" />
                  <p className="mt-1 w-full truncate px-1 text-center text-xs text-zinc-600 dark:text-zinc-400">
                    {fileName}
                  </p>
                </div>
              )}

              {showProgress && (
                <div className="absolute inset-0 flex flex-col items-center justify-center rounded-xl bg-black/50 p-2 pointer-events-none">
                  {error ? (
                    <p className="text-red-400 text-xs text-center">Upload Failed</p>
                  ) : (
                    <>
                      <div className="h-1 w-full rounded-full bg-zinc-700 mx-2">
                        <div className="h-full rounded-full bg-blue-500" style={{ width: `${uploadProgress || 0}%` }} />
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
          <TooltipContent
            side="top"
            className="select-none bg-black text-white dark:bg-white dark:text-black rounded-md font-medium shadow-lg"
          >
            <p>{fileName}</p>
          </TooltipContent>
        </Tooltip>
      </motion.div>
    </TooltipProvider>
  )
}
