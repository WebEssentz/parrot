"use client"

import React, { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Drawer } from "vaul"
import { X, Loader2 } from "lucide-react"
import mammoth from "mammoth"
import type { StagedFile } from "../components/chats/user-chat"
import { useMediaQuery } from "@/hooks/use-media-query"

interface DocPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  stagedFile: StagedFile | null
}

const modalVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
}

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
}

// Internal component to handle the actual rendering logic
const DocViewer = ({ stagedFile }: { stagedFile: StagedFile }) => {
  const [docHtml, setDocHtml] = useState<string>("")
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const fileType = stagedFile.file.type
  const fileName = stagedFile.file.name
  const fileUrl = stagedFile.uploadedAttachment?.downloadUrl || URL.createObjectURL(stagedFile.file)

  useEffect(() => {
    if (fileType.includes("wordprocessingml.document")) {
      setIsLoading(true)
      setError(null)
      const reader = new FileReader()
      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer
          const result = await mammoth.convertToHtml({ arrayBuffer })
          setDocHtml(result.value)
        } catch (err) {
          console.error("Mammoth conversion error:", err)
          setError("Could not render this Word document.")
        } finally {
          setIsLoading(false)
        }
      }
      reader.onerror = () => {
        setError("Could not read the file.")
        setIsLoading(false)
      }
      reader.readAsArrayBuffer(stagedFile.file)
    } else {
      setIsLoading(false)
    }
  }, [stagedFile, fileType])

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-zinc-500">
        <Loader2 className="h-8 w-8 animate-spin mb-4" />
        <p>Processing {fileName}...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-red-500">
        <p>{error}</p>
      </div>
    )
  }

  // PDF and PPTX renderer
  if (fileType.includes("pdf") || fileType.includes("presentation")) {
    return (
      <iframe
        src={fileUrl}
        className="w-full h-full border-none"
        title={fileName}
      />
    )
  }

  // Word document renderer
  if (fileType.includes("wordprocessingml.document")) {
    return (
      <div
        className="prose dark:prose-invert p-6 overflow-y-auto w-full"
        dangerouslySetInnerHTML={{ __html: docHtml }}
      />
    )
  }

  return <p className="p-6">Unsupported file type for preview.</p>
}

export const DocPreviewModal = ({ isOpen, onClose, stagedFile }: DocPreviewModalProps) => {
  const isDesktop = useMediaQuery("(min-width: 768px)")

  if (!stagedFile) return null

  const fileName = stagedFile.file.name

  if (isDesktop) {
    return (
      <AnimatePresence>
        {isOpen && (
          <motion.div
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              variants={modalVariants}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-4xl h-[90vh] bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-zinc-200 dark:border-zinc-800"
            >
              <header className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800 flex-shrink-0">
                <p className="font-semibold truncate pr-4">{fileName}</p>
                <button
                  onClick={onClose}
                  className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <X size={20} />
                </button>
              </header>
              <div className="flex-grow overflow-y-auto">
                <DocViewer stagedFile={stagedFile} />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    )
  }

  return (
    <Drawer.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 mt-24 flex h-[94%] flex-col rounded-t-2xl bg-zinc-100 dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800">
          <div className="mx-auto my-3 h-1.5 w-12 rounded-full bg-zinc-300 dark:bg-zinc-700" />
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
            <Drawer.Title className="font-semibold text-center truncate">
              {fileName}
            </Drawer.Title>
          </div>
          <div className="flex-grow overflow-y-auto">
            {stagedFile && <DocViewer stagedFile={stagedFile} />}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}