"use client"

import React, { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Copy, Download } from "lucide-react"
import type { StagedFile } from "@/components/chats/user-chat" // Adjust the import path if needed
import { toast } from "sonner"

interface TextFileModalProps {
  stagedFile: StagedFile
  onClose: () => void
}

export const TextFileModal = ({ stagedFile, onClose }: TextFileModalProps) => {
  const [content, setContent] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const reader = new FileReader()
    reader.onload = (e) => {
      setContent(e.target?.result as string)
    }
    reader.onerror = () => {
      setError("Failed to read the file.")
      toast.error("Could not read the contents of the text file.")
    }
    reader.readAsText(stagedFile.file)
  }, [stagedFile.file])

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

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-2xl bg-white dark:bg-[#1e1e1e] rounded-2xl shadow-xl flex flex-col max-h-[80vh]"
        >
          {/* Header */}
          <div className="flex-shrink-0 p-4 border-b border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
            <h2 className="font-semibold text-zinc-800 dark:text-zinc-200 truncate pr-4">{stagedFile.file.name}</h2>
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
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}