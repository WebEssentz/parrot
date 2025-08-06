"use client"

import React, { useEffect, useState } from "react"
import { X, Copy, Download, FileText } from "lucide-react"
import type { StagedFile } from "@/components/chats/user-chat"
import { toast } from "sonner"

// NEW: Import the components for responsiveness
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Drawer, DrawerContent } from "@/components/ui/drawer"
import { useMediaQuery } from "@/hooks/use-media-query"

interface TextFileModalProps {
  isOpen: boolean
  onClose: () => void
  stagedFile: StagedFile | null
}

export const TextFileModal = ({ isOpen, onClose, stagedFile }: TextFileModalProps) => {
  const [content, setContent] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  // NEW: Check if the device is a desktop
  const isDesktop = useMediaQuery("(min-width: 768px)")

  useEffect(() => {
    if (stagedFile) {
      const reader = new FileReader()
      reader.onload = (e) => setContent(e.target?.result as string)
      reader.onerror = () => {
        setError("Failed to read the file.")
        toast.error("Could not read the contents of the text file.")
      }
      reader.readAsText(stagedFile.file)
    } else {
      setContent(null)
      setError(null)
    }
  }, [stagedFile])

  if (!stagedFile) return null

  const handleCopy = () => {
    if (content) {
      navigator.clipboard.writeText(content)
      toast.success("Content copied to clipboard!")
    }
  }

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

  // This is the shared UI content for both versions
  const modalContent = (
    <div className="flex flex-col max-h-[90vh] bg-white dark:bg-[#1e1e1e] rounded-full">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
            <FileText className="h-6 w-6 text-green-500" />
            <h2 className="font-semibold text-zinc-800 dark:text-zinc-200 truncate pr-4">{stagedFile.file.name}</h2>
        </div>
        <button onClick={onClose} className="p-1 cursor-pointer rounded-full text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800">
          <X size={20} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-grow p-4 overflow-y-auto bg-zinc-50 dark:bg-zinc-900/20">
        <pre className="text-sm text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap break-words font-mono">
          {content !== null ? content : error ? <span className="text-red-500">{error}</span> : "Loading..."}
        </pre>
      </div>

      {/* Footer with Actions */}
      <div className="flex-shrink-0 p-3 border-t border-zinc-200 dark:border-zinc-700 flex items-center justify-end gap-3">
        <button
          onClick={handleCopy}
          disabled={!content}
          className="flex items-center cursor-pointer gap-2 px-3 py-1.5 text-sm font-medium bg-zinc-100 dark:bg-zinc-800/40 text-zinc-700 dark:text-zinc-200 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 disabled:opacity-50"
        >
          <Copy size={16} />
          Copy
        </button>
        <button
          onClick={handleDownload}
          className="flex items-center cursor-pointer gap-2 px-3 py-1.5 text-sm font-medium bg-zinc-800 dark:bg-zinc-100 text-white dark:text-black rounded-lg hover:bg-zinc-700 dark:hover:bg-zinc-200"
        >
          <Download size={16} />
          Download
        </button>
      </div>
    </div>
  );

  // NEW: Conditional rendering based on screen size
  if (isDesktop) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="p-0 border-none gap-0 max-w-3xl">
          {modalContent}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={isOpen} onOpenChange={onClose}>
      <DrawerContent className="p-0 border-none">
        {modalContent}
      </DrawerContent>
    </Drawer>
  );
}