"use client"

import type React from "react"
import { useState, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Play, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface VideoLinkModalProps {
  isOpen: boolean
  onClose: () => void
  onVideoInsert: (url: string, platform: string) => Promise<void>
}

const videoPlatforms = [
  {
    name: "YouTube",
    id: "youtube",
    logo: "🎥",
    color: "bg-zinc-700",
    placeholder: "https://www.youtube.com/watch?v=...",
  },
  {
    name: "Vimeo",
    id: "vimeo",
    logo: "📹",
    color: "bg-zinc-600",
    placeholder: "https://vimeo.com/...",
  },
  {
    name: "Loom",
    id: "loom",
    logo: "🎬",
    color: "bg-zinc-800",
    placeholder: "https://www.loom.com/share/...",
  },
  {
    name: "Zoom",
    id: "zoom",
    logo: "💻",
    color: "bg-zinc-700",
    placeholder: "https://zoom.us/rec/share/...",
  },
  {
    name: "Facebook",
    id: "facebook",
    logo: "📘",
    color: "bg-zinc-600",
    placeholder: "https://www.facebook.com/watch/...",
  },
  {
    name: "LinkedIn",
    id: "linkedin",
    logo: "💼",
    color: "bg-zinc-800",
    placeholder: "https://www.linkedin.com/posts/...",
  },
  {
    name: "X (Twitter)",
    id: "twitter",
    logo: "🐦",
    color: "bg-zinc-900",
    placeholder: "https://x.com/.../status/...",
  },
  {
    name: "Rumble",
    id: "rumble",
    logo: "🎯",
    color: "bg-zinc-700",
    placeholder: "https://rumble.com/...",
  },
  {
    name: "Twitch",
    id: "twitch",
    logo: "🎮",
    color: "bg-zinc-800",
    placeholder: "https://www.twitch.tv/videos/...",
  },
  {
    name: "Google Drive",
    id: "googledrive",
    logo: "📁",
    color: "bg-zinc-600",
    placeholder: "https://drive.google.com/file/d/...",
  },
  {
    name: "Dailymotion",
    id: "dailymotion",
    logo: "🎭",
    color: "bg-zinc-700",
    placeholder: "https://www.dailymotion.com/video/...",
  },
  {
    name: "TikTok",
    id: "tiktok",
    logo: "🎵",
    color: "bg-zinc-800",
    placeholder: "https://www.tiktok.com/@.../video/...",
  },
]

export function VideoLinkModal({ isOpen, onClose, onVideoInsert }: VideoLinkModalProps) {
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null)
  const [videoUrl, setVideoUrl] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const selectedPlatformData = videoPlatforms.find((p) => p.id === selectedPlatform)

  const handlePlatformSelect = (platformId: string) => {
    setSelectedPlatform(platformId)
    setVideoUrl("")
    // Focus input after a short delay to ensure it's rendered
    setTimeout(() => {
      inputRef.current?.focus()
    }, 100)
  }

  const handleVideoInsert = useCallback(async () => {
    if (!videoUrl.trim() || !selectedPlatform) {
      toast.error("Please enter a video URL")
      return
    }

    setIsProcessing(true)
    try {
      await onVideoInsert(videoUrl, selectedPlatform)
      onClose()
    } catch (error) {
      // Error handling is done in the parent component
    } finally {
      setIsProcessing(false)
    }
  }, [videoUrl, selectedPlatform, onVideoInsert, onClose])

  const resetForm = () => {
    setSelectedPlatform(null)
    setVideoUrl("")
    setIsProcessing(false)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isProcessing) {
      handleVideoInsert()
    }
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
            className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-white dark:bg-zinc-800 rounded-xl shadow-2xl z-50 overflow-hidden max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between p-6 border-b border-zinc-200 dark:border-zinc-700">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Play className="w-5 h-5 text-zinc-600" />
                Insert Video
              </h3>
              <button
                onClick={handleClose}
                className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-md transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              {!selectedPlatform ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
                    Select a video platform to get started:
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {videoPlatforms.map((platform, index) => (
                      <motion.button
                        key={platform.id}
                        onClick={() => handlePlatformSelect(platform.id)}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="flex flex-col items-center gap-2 p-4 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:border-zinc-300 dark:hover:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-all cursor-pointer"
                      >
                        <div
                          className={`w-10 h-10 ${platform.color} rounded-lg flex items-center justify-center text-white text-lg`}
                        >
                          {platform.logo}
                        </div>
                        <span className="text-sm font-medium">{platform.name}</span>
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              ) : (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className={`w-8 h-8 ${selectedPlatformData?.color} rounded-lg flex items-center justify-center text-white`}
                    >
                      {selectedPlatformData?.logo}
                    </div>
                    <div>
                      <h4 className="font-medium">{selectedPlatformData?.name}</h4>
                      <p className="text-sm text-zinc-500">Paste your video link below</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Video URL</label>
                    <input
                      ref={inputRef}
                      type="url"
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder={selectedPlatformData?.placeholder}
                      className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:ring-2 focus:ring-zinc-500 focus:border-transparent bg-white dark:bg-zinc-700"
                      disabled={isProcessing}
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => setSelectedPlatform(null)}
                      className="flex-1 px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
                      disabled={isProcessing}
                    >
                      Back
                    </button>
                    <button
                      onClick={handleVideoInsert}
                      disabled={isProcessing || !videoUrl.trim()}
                      className="flex-1 px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4" />
                          Insert Video
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
