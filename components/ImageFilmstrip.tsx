"use client"

import { motion } from "framer-motion"
import { X, ChevronLeft, ChevronRight } from "lucide-react"
import { useState, useEffect, useCallback, useRef } from "react"
import type { StagedFile } from "@/components/chats/user-chat"

interface ImageFilmstripModalProps {
  images: StagedFile[]
  initialImageId: string
  onClose: () => void
}

export const ImageFilmstripModal = ({ images, initialImageId, onClose }: ImageFilmstripModalProps) => {
  const imageFiles = images.filter((file) => file.file.type.startsWith("image/"))
  const [currentIndex, setCurrentIndex] = useState(imageFiles.findIndex((img) => img.id === initialImageId) || 0)

  // Ref for the horizontally-scrolling mobile container
  const mobileContainerRef = useRef<HTMLDivElement>(null)
  const mobileThumbRefs = useRef<(HTMLButtonElement | null)[]>([])

  const currentImage = imageFiles[currentIndex]
  const displayUrl = currentImage?.uploadedAttachment?.downloadUrl || currentImage?.previewUrl

  // Accessibility labels
  const prevLabel = "Previous image";
  const nextLabel = "Next image";
  const closeLabel = "Close image viewer";

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : imageFiles.length - 1))
  }, [imageFiles.length])

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < imageFiles.length - 1 ? prev + 1 : 0))
  }, [imageFiles.length])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) e.preventDefault()
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") goToPrevious()
      else if (e.key === "ArrowRight" || e.key === "ArrowDown") goToNext()
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [goToPrevious, goToNext])

  // Effect to scroll the active thumbnail into view on mobile
  useEffect(() => {
    const activeThumb = mobileThumbRefs.current[currentIndex]
    if (activeThumb) {
      activeThumb.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest",
      })
    }
  }, [currentIndex])

  if (!currentImage || !displayUrl) return null

  // Desktop-specific animation calculation
  const STACK_ITEM_SEPARATION = 40
  const initialYPositions = imageFiles.map((_, index) => (index - currentIndex) * STACK_ITEM_SEPARATION)
  const sumOfY = initialYPositions.reduce((sum, y) => sum + y, 0)
  const yCorrection = sumOfY / imageFiles.length

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md"
      onClick={onClose}
    >
      {/* --- CHANGE #1: Main container is now responsive --- */}
      <div className="flex h-full w-full flex-col lg:flex-row">
        {/* --- CHANGE #2: Container for filmstrip, responsive sizing and animation --- */}
        <motion.div
          initial={{ x: -300, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -300, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          // On mobile, it's a bottom bar. On desktop, a sidebar.
          className="order-last bg-black/50 lg:order-first lg:w-64 lg:h-full lg:bg-transparent"
          onClick={(e) => e.stopPropagation()}
        >
          {/* --- DESKTOP VIEW (Vertical Stack) --- */}
          <div className="hidden h-full w-full p-4 lg:block">
            <h3 className="text-white font-medium text-sm mb-4 relative z-20">Images ({imageFiles.length})</h3>
            <div className="relative h-full w-full">
              {imageFiles.map((image, index) => {
                const offset = index - currentIndex
                const y = offset * STACK_ITEM_SEPARATION - yCorrection
                const scale = index === currentIndex ? 1 : 0.85
                const zIndex = imageFiles.length - Math.abs(offset)
                return (
                  <motion.button
                    key={image.id}
                    onClick={() => setCurrentIndex(index)}
                    animate={{ y, scale, zIndex }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    whileTap={{ scale: index === currentIndex ? 1 : 0.8 }}
                    whileHover={{ scale: 1.05, zIndex: 50 }}
                    className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 group w-full rounded-lg overflow-hidden border-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${index === currentIndex ? "border-blue-500 ring-2 ring-blue-500/30" : "border-zinc-700/60 hover:border-zinc-500"}`}
                    aria-label={`Show image: ${image.file.name}`}
                  >
                    <div className="aspect-video w-full bg-zinc-800"><img src={image.uploadedAttachment?.downloadUrl || image.previewUrl || "/placeholder.svg"} alt={image.file.name} className="w-full h-full object-cover" /></div>
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2"><p className="text-white text-xs truncate">{image.file.name}</p></div>
                  </motion.button>
                )
              })}
            </div>
          </div>

          {/* --- MOBILE VIEW (Horizontal Scroll) --- */}
          <div className="block h-full w-full p-2 lg:hidden">
            <div ref={mobileContainerRef} className="flex h-full items-center gap-3 overflow-x-auto scrollbar-hide">
              {imageFiles.map((image, index) => (
                <button
                  key={image.id}
                  ref={(el) => { mobileThumbRefs.current[index] = el }}
                  onClick={() => setCurrentIndex(index)}
                  className={`relative flex-shrink-0 w-24 h-16 rounded-md overflow-hidden border-2 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 ${index === currentIndex ? "border-blue-500 scale-105" : "border-zinc-700/60 opacity-70"}`}
                  aria-label={`Show image: ${image.file.name}`}
                >
                  <img src={image.uploadedAttachment?.downloadUrl || image.previewUrl || "/placeholder.svg"} alt={image.file.name} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Main Image Display (largely unchanged, just responsive padding) */}
        <div className="flex-1 flex items-center justify-center p-2 pt-8 lg:p-8 min-h-0" onClick={(e) => e.stopPropagation()}>
          <div className="relative w-full h-full flex items-center justify-center">
            <motion.img key={currentImage.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", stiffness: 300, damping: 25 }} src={displayUrl} alt={currentImage.file.name} className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" />
            {imageFiles.length > 1 && (
              <>
                <button
                  onClick={goToPrevious}
                  className="absolute left-2 top-1/2 cursor-pointer -translate-y-1/2 w-9 h-9 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition-all lg:w-11 lg:h-11 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label={prevLabel}
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  onClick={goToNext}
                  className="absolute right-2 top-1/2 cursor-pointer -translate-y-1/2 w-9 h-9 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition-all lg:w-11 lg:h-11 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label={nextLabel}
                >
                  <ChevronRight size={20} />
                </button>
              </>
            )}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-sm rounded-md py-1 px-2.5 text-xs lg:py-1.5 lg:px-3 lg:text-sm"><p className="text-white/90">{currentIndex + 1} of {imageFiles.length}</p></div>
          </div>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 bg-black/50 cursor-pointer hover:bg-black/70 rounded-full flex items-center justify-center text-white transition-all z-20 lg:w-11 lg:h-11 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label={closeLabel}
        >
          <X size={20} />
        </button>
      </div>
    </motion.div>
  )
}