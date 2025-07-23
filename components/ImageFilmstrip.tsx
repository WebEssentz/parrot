"use client"

import { motion } from "framer-motion"
import { X, ChevronLeft, ChevronRight } from "lucide-react"
import { useState } from "react"
import type { StagedFile } from "@/components/chats/user-chat"

interface ImageFilmstripModalProps {
  images: StagedFile[]
  initialImageId: string
  onClose: () => void
}

export const ImageFilmstripModal = ({ images, initialImageId, onClose }: ImageFilmstripModalProps) => {
  const imageFiles = images.filter((file) => file.file.type.startsWith("image/"))
  const [currentIndex, setCurrentIndex] = useState(imageFiles.findIndex((img) => img.id === initialImageId) || 0)

  const currentImage = imageFiles[currentIndex]
  const displayUrl = currentImage?.uploadedAttachment?.downloadUrl || currentImage?.previewUrl

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : imageFiles.length - 1))
  }

  const goToNext = () => {
    setCurrentIndex((prev) => (prev < imageFiles.length - 1 ? prev + 1 : 0))
  }

  if (!currentImage || !displayUrl) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="flex h-full">
        {/* Filmstrip Sidebar */}
        <motion.div
          initial={{ x: -300, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -300, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="w-64 bg-zinc-900/80 backdrop-blur-md border-r border-zinc-700/50 p-4 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-zinc-600"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex flex-col gap-3">
            <h3 className="text-white font-medium text-sm mb-2">Images ({imageFiles.length})</h3>
            {imageFiles.map((image, index) => {
              const imgDisplayUrl = image.uploadedAttachment?.downloadUrl || image.previewUrl
              return (
                <motion.button
                  key={image.id}
                  onClick={() => setCurrentIndex(index)}
                  className={`relative group rounded-lg overflow-hidden border-2 transition-all duration-200 ${
                    index === currentIndex
                      ? "border-blue-500 ring-2 ring-blue-500/30"
                      : "border-zinc-700/50 hover:border-zinc-600"
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="aspect-video w-full bg-zinc-800">
                    <img
                      src={imgDisplayUrl || "/placeholder.svg"}
                      alt={image.file.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Upload Progress */}
                  {image.isUploading && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <div className="flex flex-col items-center gap-1">
                        <div className="w-12 h-1 bg-zinc-700 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-blue-500 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${image.uploadProgress || 0}%` }}
                            transition={{ duration: 0.3 }}
                          />
                        </div>
                        <span className="text-white text-xs">{image.uploadProgress || 0}%</span>
                      </div>
                    </div>
                  )}

                  {/* Error State */}
                  {image.error && (
                    <div className="absolute inset-0 bg-red-900/60 flex items-center justify-center">
                      <span className="text-red-200 text-xs">Failed</span>
                    </div>
                  )}

                  {/* Current indicator */}
                  {index === currentIndex && (
                    <div className="absolute top-2 right-2 w-2 h-2 bg-blue-500 rounded-full" />
                  )}

                  {/* Filename overlay */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                    <p className="text-white text-xs truncate">{image.file.name}</p>
                  </div>
                </motion.button>
              )
            })}
          </div>
        </motion.div>

        {/* Main Image Display */}
        <div className="flex-1 flex items-center justify-center p-8" onClick={(e) => e.stopPropagation()}>
          <div className="relative max-w-4xl max-h-full">
            <motion.img
              key={currentImage.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              src={displayUrl}
              alt={currentImage.file.name}
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            />

            {/* Navigation Arrows */}
            {imageFiles.length > 1 && (
              <>
                <button
                  onClick={goToPrevious}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition-colors"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  onClick={goToNext}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition-colors"
                >
                  <ChevronRight size={20} />
                </button>
              </>
            )}

            {/* Image Info */}
            <div className="absolute bottom-4 left-4 right-4 bg-black/70 backdrop-blur-sm rounded-lg p-3">
              <p className="text-white font-medium">{currentImage.file.name}</p>
              <p className="text-white/70 text-sm">
                {currentIndex + 1} of {imageFiles.length}
              </p>
            </div>
          </div>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-10 h-10 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition-colors z-10"
        >
          <X size={20} />
        </button>
      </div>
    </motion.div>
  )
}
