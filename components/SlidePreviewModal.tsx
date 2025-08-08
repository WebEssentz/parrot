// FILE: components/SlidePreviewModal.tsx

"use client"

import React from "react"
import { X, Download, File } from "lucide-react"
import type { StagedFile } from "@/components/chats/user-chat"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Drawer, DrawerContent } from "@/components/ui/drawer"
import { useMediaQuery } from "@/hooks/use-media-query"

interface SlidePreviewModalProps {
  isOpen: boolean
  onClose: () => void
  stagedFile: StagedFile | null
}

export const SlidePreviewModal: React.FC<SlidePreviewModalProps> = ({ isOpen, onClose, stagedFile }) => {
  const isDesktop = useMediaQuery("(min-width: 768px)")

  if (!stagedFile) return null

  const handleDownload = () => {
    const url = URL.createObjectURL(stagedFile.file)
    const a = document.createElement("a")
    a.href = url
    a.download = stagedFile.file.name
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const content = (
    <div className="flex flex-col bg-white dark:bg-[#1e1e1e] max-h-[90vh]">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-700 p-4">
        <div className="flex items-center gap-3">
          <File className="h-6 w-6 text-orange-500" />
          <h2 className="truncate pr-4 font-semibold text-zinc-800 dark:text-zinc-200">{stagedFile.file.name}</h2>
        </div>
        <button onClick={onClose} className="cursor-pointer rounded-full p-1 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800">
          <X size={20} />
        </button>
      </div>

      {/* Body */}
      <div className="flex flex-col items-center gap-2 p-6 text-center text-sm text-zinc-600 dark:text-zinc-300">
        <p>Preview for PowerPoint files isn’t supported here.</p>
        <p>Download and open it with your presentation app.</p>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-3 border-t border-zinc-200 p-3 dark:border-zinc-700">
        <button
          onClick={handleDownload}
          className="cursor-pointer rounded-lg bg-zinc-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-black dark:hover:bg-zinc-200"
        >
          <Download size={16} className="mr-2 inline" />
          Download
        </button>
      </div>
    </div>
  )

  if (isDesktop) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl gap-0 border-none p-0">{content}</DialogContent>
      </Dialog>
    )
  }

  return (
    <Drawer open={isOpen} onOpenChange={onClose}>
      <DrawerContent className="border-none p-0">{content}</DrawerContent>
    </Drawer>
  )
}


