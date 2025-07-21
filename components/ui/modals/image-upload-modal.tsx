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
  const [uploadProgress, setUploadProgress] = useState(0); // New state for upload progress

  const handleFileUpload = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file")
        return
      }

      setIsUploading(true)
      setUploadProgress(0); // Reset progress at the start of a new upload
      try {
        const formData = new FormData()
        formData.append("file", file)

        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/upload-image', true);

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percentCompleted = Math.round((event.loaded * 100) / event.total);
            setUploadProgress(percentCompleted); // Update progress
          }
        };

        const response = await new Promise<Response>((resolve, reject) => {
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve(new Response(xhr.responseText, { status: xhr.status, statusText: xhr.statusText }));
            } else {
              reject(new Error(xhr.statusText || 'Upload failed'));
            }
          };
          xhr.onerror = () => reject(new Error("Network error during upload"));
          xhr.send(formData);
        });

        if (!response.ok) throw new Error("Upload failed")

        const { url } = await response.json()
        onImageInsert(url, altText || file.name)
        onClose()
        toast.success("Image uploaded successfully!")
      } catch (error) {
        toast.error("Failed to upload image")
      } finally {
        setIsUploading(false)
        setUploadProgress(0); // Reset progress after upload completes or fails
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
    setUploadProgress(0); // Reset progress on form reset
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
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-zinc-200 bg-white p-6 shadow-lg dark:border-zinc-700 dark:bg-zinc-800"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={handleClose}
              className="absolute right-4 top-4 rounded-full p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-700"
              aria-label="Close"
            >
              <X size={20} />
            </button>

            <h2 className="mb-4 text-xl font-semibold text-zinc-900 dark:text-white">
              Insert Image
            </h2>

            <div className="mb-4 flex space-x-2 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-700">
              <button
                className={`flex-1 rounded-md px-3 py-2 text-sm font-medium ${
                  activeTab === "upload"
                    ? "bg-white text-zinc-900 shadow dark:bg-zinc-900 dark:text-white"
                    : "text-zinc-600 dark:text-zinc-300"
                }`}
                onClick={() => setActiveTab("upload")}
              >
                Upload
              </button>
              <button
                className={`flex-1 rounded-md px-3 py-2 text-sm font-medium ${
                  activeTab === "url"
                    ? "bg-white text-zinc-900 shadow dark:bg-zinc-900 dark:text-white"
                    : "text-zinc-600 dark:text-zinc-300"
                }`}
                onClick={() => setActiveTab("url")}
              >
                Image URL
              </button>
            </div>

            {activeTab === "upload" ? (
              <div className="space-y-4">
                <div
                  className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center ${
                    dragActive
                      ? "border-blue-500 bg-blue-500/10"
                      : "border-zinc-300 dark:border-zinc-600"
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  {isUploading ? (
                    <div className="flex flex-col items-center">
                      <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
                        Uploading... {uploadProgress}%
                      </p>
                      <div className="w-full bg-zinc-200 rounded-full h-2.5 dark:bg-zinc-700 mt-2">
                        <div className="bg-blue-600 h-2.5 rounded-full" style={{width: `${uploadProgress}%`}}></div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <Upload size={32} className="text-zinc-500" />
                      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
                        Drag & drop image here, or
                      </p>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="mt-2 rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
                      >
                        Browse Files
                      </button>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={(e) => {
                          if (e.target.files && e.target.files.length > 0) {
                            handleFileUpload(e.target.files[0])
                          }
                        }}
                        className="hidden"
                        accept="image/*"
                      />
                    </>
                  )}
                </div>
                <div>
                  <label
                    htmlFor="alt-text-upload"
                    className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                  >
                    Alt Text (Optional)
                  </label>
                  <input
                    id="alt-text-upload"
                    type="text"
                    value={altText}
                    onChange={(e) => setAltText(e.target.value)}
                    className="w-full rounded-md border border-zinc-300 p-2 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white"
                    placeholder="Describe the image for accessibility"
                    disabled={isUploading}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="image-url"
                    className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                  >
                    Image URL
                  </label>
                  <input
                    id="image-url"
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    className="w-full rounded-md border border-zinc-300 p-2 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white"
                    placeholder="https://example.com/image.jpg"
                  />
                </div>
                <div>
                  <label
                    htmlFor="alt-text-url"
                    className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                  >
                    Alt Text (Optional)
                  </label>
                  <input
                    id="alt-text-url"
                    type="text"
                    value={altText}
                    onChange={(e) => setAltText(e.target.value)}
                    className="w-full rounded-md border border-zinc-300 p-2 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white"
                    placeholder="Describe the image for accessibility"
                  />
                </div>
                <button
                  onClick={handleUrlInsert}
                  className="w-full rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
                >
                  Insert Image
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
