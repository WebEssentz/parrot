"use client"

import type React from "react"

import { useState, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Upload, Link, X, ImageIcon, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface ImageUploadModalProps {
  isOpen: boolean
  onClose: () => void
  onImageInsert: (url: string, alt?: string) => void
}

export function ImageUploadModal({ isOpen, onClose, onImageInsert }: ImageUploadModalProps) {
  const [activeTab, setActiveTab] = useState<"upload" | "url">("upload")
  const [imageUrl, setImageUrl] = useState("")
  const [altText, setAltText] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file")
        return
      }

      setIsUploading(true)
      try {
        // Create FormData for file upload
        const formData = new FormData()
        formData.append("file", file)

        // Simulate upload to your backend
        const response = await fetch("/api/upload-image", {
          method: "POST",
          body: formData,
        })

        if (!response.ok) throw new Error("Upload failed")

        const { url } = await response.json()
        onImageInsert(url, altText || file.name)
        onClose()
        toast.success("Image uploaded successfully!")
      } catch (error) {
        toast.error("Failed to upload image")
      } finally {
        setIsUploading(false)
      }
    },
    [altText, onImageInsert, onClose],
  )

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setDragActive(false)

      const files = Array.from(e.dataTransfer.files)
      if (files.length > 0) {
        handleFileUpload(files[0])
      }
    },
    [handleFileUpload],
  )

  const handleUrlInsert = () => {
    if (!imageUrl.trim()) {
      toast.error("Please enter an image URL")
      return
    }
    onImageInsert(imageUrl, altText)
    onClose()
  }

  const resetForm = () => {
    setImageUrl("")
    setAltText("")
    setActiveTab("upload")
    setIsUploading(false)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={handleClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white dark:bg-zinc-800 rounded-xl shadow-2xl z-50 overflow-hidden"
          >
            <div className="flex items-center justify-between p-6 border-b border-zinc-200 dark:border-zinc-700">
              <h3 className="text-lg font-semibold">Insert Image</h3>
              <button
                onClick={handleClose}
                className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-md transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex border-b border-zinc-200 dark:border-zinc-700">
              <button
                onClick={() => setActiveTab("upload")}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === "upload"
                    ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50 dark:bg-blue-900/20"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                }`}
              >
                <Upload className="w-4 h-4 inline mr-2" />
                Upload
              </button>
              <button
                onClick={() => setActiveTab("url")}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === "url"
                    ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50 dark:bg-blue-900/20"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                }`}
              >
                <Link className="w-4 h-4 inline mr-2" />
                URL
              </button>
            </div>

            <div className="p-6">
              <AnimatePresence mode="wait">
                {activeTab === "upload" ? (
                  <motion.div
                    key="upload"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-4"
                  >
                    <div
                      className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
                        dragActive
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                          : "border-zinc-300 dark:border-zinc-600 hover:border-blue-400"
                      }`}
                      onDragEnter={handleDrag}
                      onDragLeave={handleDrag}
                      onDragOver={handleDrag}
                      onDrop={handleDrop}
                    >
                      {isUploading ? (
                        <div className="flex flex-col items-center">
                          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
                          <p className="text-sm text-zinc-600 dark:text-zinc-400">Uploading...</p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center">
                          <ImageIcon className="w-12 h-12 text-zinc-400 mb-4" />
                          <p className="text-sm font-medium mb-2">Drop your image here, or</p>
                          <button
                            onClick={() => fileInputRef.current?.click()}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            Browse Files
                          </button>
                          <p className="text-xs text-zinc-500 mt-2">PNG, JPG, GIF up to 10MB</p>
                        </div>
                      )}
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handleFileUpload(file)
                      }}
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key="url"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    <div>
                      <label className="block text-sm font-medium mb-2">Image URL</label>
                      <input
                        type="url"
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        placeholder="https://example.com/image.jpg"
                        className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-zinc-700"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="mt-4">
                <label className="block text-sm font-medium mb-2">Alt Text (Optional)</label>
                <input
                  type="text"
                  value={altText}
                  onChange={(e) => setAltText(e.target.value)}
                  placeholder="Describe the image..."
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-zinc-700"
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleClose}
                  className="flex-1 px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={activeTab === "upload" ? () => fileInputRef.current?.click() : handleUrlInsert}
                  disabled={isUploading || (activeTab === "url" && !imageUrl.trim())}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {activeTab === "upload" ? "Choose File" : "Insert Image"}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
