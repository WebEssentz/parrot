"use client"

import React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Drawer } from "vaul"
import { X, Paperclip, File as FileIcon, FileText, FileSpreadsheet, Presentation } from "lucide-react"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import type { AttachmentRecord, StagedFile } from "@/components/chats/user-chat"
import { useMediaQuery } from "@/hooks/use-media-query"

// Helper to get an icon based on file type
const getFileIcon = (fileType: string) => {
  if (fileType.includes("pdf")) return <FileText className="h-6 w-6 text-red-500" />
  if (fileType.includes("word")) return <img src="/word.png" alt="word" className="h-6 w-6" />
  if (fileType.includes("presentation")) return <img src="/ppt.png" alt="ppt" className="h-6 w-6" />
  if (fileType.includes("sheet")) return <FileSpreadsheet className="h-6 w-6 text-green-600" />
  return <FileIcon className="h-6 w-6 text-zinc-500" />
}

// Helper to format file size
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes"
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
}

const FileItem = ({
  file,
  onPreview,
  isDesktop,
}: {
  file: AttachmentRecord
  onPreview: (file: StagedFile) => void
  isDesktop: boolean
}) => {
  const isImage = file.fileType.startsWith("image/")

  // Create a temporary StagedFile object to reuse the existing preview modals
  const handlePreviewClick = () => {
    const tempStagedFile: StagedFile = {
      id: file.id,
      file: new File([], file.fileName, { type: file.fileType }),
      previewUrl: file.downloadUrl,
      uploadedAttachment: file,
      isUploading: false,
    }
    onPreview(tempStagedFile)
  }

  const content = (
    <button
      onClick={handlePreviewClick}
      className="w-full flex items-center gap-4 p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors text-left"
    >
      <div className="flex-shrink-0 h-10 w-10 bg-zinc-100 dark:bg-zinc-800 rounded-lg flex items-center justify-center">
        {isImage ? (
          <img src={file.downloadUrl} alt={file.fileName} className="h-full w-full object-cover rounded-lg" />
        ) : (
          getFileIcon(file.fileType)
        )}
      </div>
      <div className="flex-grow truncate">
        <p className="font-medium text-sm truncate text-zinc-900 dark:text-zinc-100">{file.fileName}</p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{formatFileSize(file.fileSize)}</p>
      </div>
    </button>
  )

  if (isDesktop) {
    return (
      <HoverCard openDelay={200} closeDelay={100}>
        <HoverCardTrigger asChild>{content}</HoverCardTrigger>
        <HoverCardContent side="left" align="center" className="w-64 p-2">
          {isImage ? (
            <img src={file.downloadUrl} alt={file.fileName} className="w-full h-auto rounded-lg object-contain" />
          ) : (
            <div className="flex flex-col items-center text-center p-4">
              <div className="h-16 w-16 flex items-center justify-center">{getFileIcon(file.fileType)}</div>
              <p className="font-semibold mt-2 text-sm">{file.fileName}</p>
              <p className="text-xs text-zinc-500">Click to preview file</p>
            </div>
          )}
        </HoverCardContent>
      </HoverCard>
    )
  }

  return content
}

interface FilesInChatSidebarProps {
  isOpen: boolean
  onClose: () => void
  files: AttachmentRecord[]
  onPreview: (file: StagedFile) => void
}

export const FilesInChatSidebar = ({ isOpen, onClose, files, onPreview }: FilesInChatSidebarProps) => {
  const isDesktop = useMediaQuery("(min-width: 1024px)")

  const sidebarContent = (
    <>
      <header className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800 flex-shrink-0">
        <h2 className="font-semibold text-lg text-zinc-900 dark:text-zinc-100">Files in Chat</h2>
        <button
          onClick={onClose}
          className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        >
          <X size={20} />
        </button>
      </header>
      <div className="flex-grow overflow-y-auto p-2">
        {files.length > 0 ? (
          <div className="flex flex-col gap-1">
            {files.map((file) => (
              <FileItem key={file.id} file={file} onPreview={onPreview} isDesktop={isDesktop} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center text-zinc-500 p-4">
            <Paperclip className="h-8 w-8 mb-2" />
            <p className="font-medium">No Files Yet</p>
            <p className="text-sm">Files you upload will appear here.</p>
          </div>
        )}
      </div>
    </>
  )

  if (isDesktop) {
    return (
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: "0%" }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", ease: "easeInOut", duration: 0.35 }}
            className="fixed top-0 right-0 h-full w-80 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl z-40 border-l border-zinc-200 dark:border-zinc-800 flex flex-col"
          >
            {sidebarContent}
          </motion.div>
        )}
      </AnimatePresence>
    )
  }

  return (
    <Drawer.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 mt-24 flex h-[90%] flex-col rounded-t-2xl bg-zinc-50 dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800">
          <div className="mx-auto my-3 h-1.5 w-12 rounded-full bg-zinc-300 dark:bg-zinc-700" />
          <div className="flex-grow overflow-y-auto">{sidebarContent}</div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}