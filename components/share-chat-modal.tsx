"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"
import { useTransformToArticle } from "@/hooks/use-transform-to-article"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Copy, Check, MessageSquareText, FileText, Mic, Scissors, Loader2, ArrowRight, X } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"
import { useChats } from "@/hooks/use-chats"
import { PublicChatView } from "./public-chat-view"
import type { Message } from "@ai-sdk/react"
import clsx from "clsx"
import { Markdown } from "./markdown"

type ShareFormat = "conversation" | "article" | "podcast" | "snippet"

interface ShareChatModalProps {
  isOpen: boolean
  onClose: () => void
  chatId: string
  chatTitle: string
  chat: {
    messages: Message[]
    user: {
      username: string | null
      profilePic: string | null
      firstName: string | null
    }
    updatedAt: string
    isLiveSynced: boolean
    visibility: "public" | "private"
  }
}

const SharePreview = ({
  chat,
  chatTitle,
  format,
  articleContent,
  isTransforming,
  artifact,
}: {
  chat: ShareChatModalProps["chat"]
  chatTitle: string
  format: ShareFormat
  articleContent: string
  isTransforming: boolean
  artifact: { slug: string } | null
}) => {
  const [isHovered, setIsHovered] = useState(false)

  const renderPreviewContent = () => {
    switch (format) {
      case "article":
        if (isTransforming) {
          return (
            <div className="flex flex-col items-center justify-center h-full text-zinc-400 p-8">
              <Loader2 className="w-16 h-16 animate-spin mb-4" />
              <p className="text-lg font-medium text-center mb-2">Crafting Professional Article...</p>
              <p className="text-sm text-center text-zinc-500">
                Converting your conversation into a Medium-style article
              </p>
            </div>
          )
        }
        return (
          <div className="h-full overflow-y-auto">
            {articleContent ? (
              <div className="p-8 prose prose-lg dark:prose-invert max-w-none relative">
                <Markdown>{articleContent}</Markdown>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-zinc-400 p-8">
                <FileText className="w-20 h-20 mb-6" />
                <p className="text-lg font-medium text-center mb-2">Professional Article Preview</p>
                <p className="text-sm text-center text-zinc-500 max-w-md">
                  Your conversation will be transformed into a comprehensive, Medium-style technical article.
                </p>
              </div>
            )}
          </div>
        )
      case "podcast":
        return (
          <div className="flex flex-col items-center justify-center h-full text-zinc-400 p-4">
            <Mic className="w-16 h-16" />
            <p className="mt-4 text-sm font-medium text-center">Podcast controls will appear here</p>
          </div>
        )
      case "snippet":
        return (
          <div className="flex flex-col items-center justify-center h-full text-zinc-400 p-4">
            <Scissors className="w-16 h-16" />
            <p className="mt-4 text-sm font-medium text-center">Select messages to create a snippet</p>
          </div>
        )
      case "conversation":
      default:
        return <PublicChatView chat={{ ...chat, id: "preview-id", title: chatTitle }} />
    }
  }

  return (
    <div
      className="h-full w-full rounded-xl border bg-zinc-50 dark:bg-zinc-900 shadow-inner overflow-hidden relative cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <motion.div
        className="absolute top-0 left-0 origin-top-left"
        style={{ width: "285.71%", height: "285.71%" }}
        initial={{ scale: 0.35 }}
        animate={{ scale: isHovered ? 0.38 : 0.35 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        {renderPreviewContent()}
      </motion.div>
      <div className="absolute inset-0" />
      <AnimatePresence>
        {!isHovered && !(format === "article" && (isTransforming || articleContent)) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <span className="text-sm font-medium text-zinc-600 dark:text-zinc-300 bg-white/80 dark:bg-black/50 px-3 py-1.5 rounded-full border border-zinc-200 dark:border-zinc-700 shadow-sm">
              Hover to preview
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export const ShareChatModal = ({ isOpen, onClose, chatId, chatTitle, chat }: ShareChatModalProps) => {
  const router = useRouter()
  const [isPublic, setIsPublic] = useState(chat.visibility === "public")
  const [isLiveSynced, setIsLiveSynced] = useState(chat.isLiveSynced)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [copied, setCopied] = useState(false)
  const { mutateChats } = useChats()
  const [shareLink, setShareLink] = useState("")
  const [shareFormat, setShareFormat] = useState<ShareFormat>("conversation")
  const {
    article,
    isLoading: isTransforming,
    transform: transformToArticle,
    setArticle,
    artifact,
    cancel: cancelArticleTransform,
  } = useTransformToArticle()

  // Reset component state when the modal opens
  useEffect(() => {
    if (isOpen) {
      setShareFormat("conversation")
      setArticle("")
      setIsPublic(chat.visibility === "public")
      setIsLiveSynced(chat.isLiveSynced)
    }
  }, [isOpen, setArticle, chat.visibility, chat.isLiveSynced])

  // Handle API cancellation
  useEffect(() => {
    if (isOpen && shareFormat === "article" && chatId) {
      transformToArticle(chatId)
      return () => {
        if (cancelArticleTransform) {
          cancelArticleTransform()
        }
      }
    }
  }, [isOpen, shareFormat, chatId, transformToArticle, cancelArticleTransform])

  // Declaratively update the shareable link based on the current state
  useEffect(() => {
    if (!isOpen) return
    if (shareFormat === "article" && artifact && chat.user.firstName) {
      const articleUrl = `${window.location.origin}/${chat.user.firstName}/articles/${artifact.slug}`
      setShareLink(articleUrl)
      setIsPublic(true) // An article is inherently public
    } else {
      // For all other formats, use the standard chat link if public
      if (isPublic) {
        setShareLink(`${window.location.origin}/share/${chatId}`)
      } else {
        setShareLink("")
      }
    }
  }, [isOpen, shareFormat, isPublic, artifact, chatId, chat.user.firstName])

  const handleCopy = () => {
    if (!shareLink) return
    navigator.clipboard.writeText(shareLink).then(() => {
      setCopied(true)
      toast.success("Link copied to clipboard!")
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleShareConfirm = async () => {
    if (!chatId) {
      toast.error("Cannot share: Chat ID is missing.")
      return
    }
    setIsSubmitting(true)
    const shareSettings = {
      visibility: isPublic ? "public" : "private",
      isLiveSynced: isPublic ? isLiveSynced : false,
    }
    try {
      const response = await fetch(`/api/chats/${chatId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(shareSettings),
      })
      if (!response.ok) throw new Error("Failed to update sharing settings.")
      await response.json()
      toast.success("Sharing settings updated!")
      mutateChats()
      onClose()
    } catch (error) {
      console.error("Sharing update failed:", error)
      toast.error("Could not update sharing settings.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleGoToArticle = () => {
    if (!artifact || !chat.user.firstName) {
      toast.error("Could not navigate to article. Information is missing.")
      return
    }
    const editUrl = `/${chat.user.firstName}/articles/${artifact.slug}/edit`
    console.log(`Navigating to editor: ${editUrl}`)
    router.push(editUrl)
    onClose()
  }

  const formatOptions: { id: ShareFormat; label: string; icon: React.ElementType; description: string }[] = [
    { id: "conversation", label: "Conversation", icon: MessageSquareText, description: "Share as chat format" },
    { id: "article", label: "Article", icon: FileText, description: "Professional Medium-style article" },
    { id: "podcast", label: "Podcast", icon: Mic, description: "Audio format (coming soon)" },
    { id: "snippet", label: "Snippet", icon: Scissors, description: "Selected highlights" },
  ]

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-6xl w-[95vw] h-[90vh] flex flex-col p-0 bg-white/90 dark:bg-[#202020]/90 backdrop-blur-lg shadow-2xl rounded-2xl border-zinc-200/50 dark:border-zinc-700/50">
        {/* Custom Close Button - MOVED HERE FOR CORRECT POSITIONING */}
        <DialogClose asChild>
          <button
            className="absolute top-5 right-4 z-10 p-2 rounded-lg bg-white/80 dark:bg-zinc-800/80 hover:bg-white cursor-pointer dark:hover:bg-zinc-800 border border-zinc-200/50 dark:border-zinc-700/50 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-all duration-200 shadow-sm hover:shadow-md backdrop-blur-sm"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </DialogClose>
        {/* Fixed Header */}
        <DialogHeader className="flex-shrink-0 p-4 sm:p-6 pb-3 sm:pb-4 border-b border-zinc-200 dark:border-zinc-700/50">
          <div className="flex justify-between items-center">
            <DialogTitle className="text-lg text-zinc-900 dark:text-neutral-50 truncate pr-4">
              Share "{chatTitle}"
            </DialogTitle>
            <div className="flex items-center space-x-2 flex-shrink-0">
              <Switch id="public-link-toggle" checked={isPublic} onCheckedChange={setIsPublic} />
              <Label htmlFor="public-link-toggle" className="text-sm mr-10 whitespace-nowrap">
                Public Link
              </Label>
            </div>
            {/* The DialogClose button was moved from here */}
          </div>
        </DialogHeader>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-col lg:grid lg:grid-cols-2 gap-4 sm:gap-6 p-4 sm:p-6 min-h-full">
            {/* Preview Section */}
            <div className="h-64 lg:h-96 min-h-[300px] flex-shrink-0">
              <SharePreview
                chat={chat}
                chatTitle={chatTitle}
                format={shareFormat}
                articleContent={article}
                isTransforming={isTransforming}
                artifact={artifact}
              />
            </div>

            {/* Controls Section */}
            <div className="flex flex-col gap-4 sm:gap-6 min-h-0">
              {/* Format Selection */}
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-zinc-800 dark:text-zinc-100">Format</h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">Choose how to present this conversation.</p>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {formatOptions.map(({ id, label, icon: Icon, description }) => (
                    <button
                      key={id}
                      onClick={() => setShareFormat(id)}
                      className={clsx(
                        "flex items-center p-3 sm:p-4 rounded-lg border transition-all duration-200 text-left hover:cursor-pointer",
                        {
                          "bg-blue-500/10 border-blue-500/50 text-blue-600 dark:text-blue-400": shareFormat === id,
                          "bg-zinc-100/50 hover:bg-zinc-100 dark:bg-zinc-800/50 hover:dark:bg-zinc-800 border-transparent cursor-pointer":
                            shareFormat !== id,
                        },
                      )}
                    >
                      <Icon className="w-5 h-5 mr-3 flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="font-medium">{label}</div>
                        <div className="text-xs opacity-70">{description}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Share Settings */}
              <AnimatePresence>
                {isPublic && (
                  <motion.div
                  key={shareFormat === "article" && artifact ? "article-cta" : "share-link"}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-4 border-t border-zinc-200/80 dark:border-zinc-700/50 pt-4 sm:pt-6"
                  >
                    {shareFormat === "article" && artifact ? (
                      <div className="space-y-3">
                        <Label className="font-medium text-zinc-800 dark:text-zinc-100">Article Created</Label>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                          Your article draft has been saved. You can now edit and publish it.
                        </p>
                        <Button onClick={handleGoToArticle} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                          View & Edit Article <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="share-link" className="font-medium text-zinc-800 dark:text-zinc-100">
                            Shareable Link
                          </Label>
                          <div className="flex items-center gap-2">
                            <Input
                              id="share-link"
                              value={shareLink}
                              readOnly
                              className="bg-zinc-100 dark:bg-zinc-800 text-sm"
                            />
                            <Button
                              variant="outline"
                              size="icon"
                              className="shrink-0 cursor-pointer bg-transparent"
                              onClick={handleCopy}
                              disabled={isSubmitting}
                            >
                              {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                            </Button>
                          </div>
                        </div>
                        <div className="flex items-start space-x-2 pt-2">
                          <Checkbox
                            id="live-sync"
                            checked={isLiveSynced}
                            onCheckedChange={() => setIsLiveSynced(!isLiveSynced)}
                            disabled={!isPublic}
                            className="mt-0.5"
                          />
                          <div className="grid gap-1.5 leading-none">
                            <Label htmlFor="live-sync" className="font-medium cursor-pointer">
                              Live Sync
                            </Label>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400">
                              When enabled, any new messages in this chat will automatically appear on the public page.
                            </p>
                          </div>
                        </div>
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Fixed Footer */}
        <DialogFooter className="flex-shrink-0 p-4 sm:p-6 pt-3 sm:pt-4 border-t border-zinc-200 dark:border-zinc-700/50">
          <div className="flex gap-2 w-full sm:w-auto sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              className="rounded-full flex-1 sm:flex-none cursor-pointer"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="rounded-full cursor-pointer bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200 flex-1 sm:flex-none"
              onClick={handleShareConfirm}
              disabled={isSubmitting || isTransforming}
            >
              {isSubmitting ? "Saving..." : "Done"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}