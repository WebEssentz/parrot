"use client"

import React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Download, MonitorPlay, Presentation } from "lucide-react"
import { toast } from "sonner"
import type { StagedFile } from "@/components/chats/user-chat"

// We use shadcn/ui's Dialog for desktop and Drawer for mobile
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Drawer, DrawerContent } from "@/components/ui/drawer"
import { useMediaQuery } from "@/hooks/use-media-query" // A common hook for responsiveness

interface SlidePreviewModalProps {
  isOpen: boolean
  onClose: () => void
  stagedFile: StagedFile | null
}

// A simple utility to format file size
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

export const SlidePreviewModal = ({ isOpen, onClose, stagedFile }: SlidePreviewModalProps) => {
  // This hook will return true if the screen is a desktop size
  const isDesktop = useMediaQuery("(min-width: 768px)");

  if (!stagedFile) return null;

  const { file, previewImageUrl, metadata } = stagedFile;
  const slideCount = (metadata as any)?.slideCount || 0;
  const fileSize = formatFileSize(file.size);

  const handleDownload = () => {
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleOpenInNewTab = () => {
    toast.info("Opening file in a new tab...");
    const url = URL.createObjectURL(file);
    window.open(url, '_blank');
    // We don't revoke the URL here, as the new tab needs it
  };

  const content = (
    <div className="flex flex-col max-h-[90vh] bg-white dark:bg-[#1e1e1e]">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
            <Presentation className="h-6 w-6 text-orange-500" />
            <div>
              <h2 className="font-semibold text-zinc-800 dark:text-zinc-200 truncate">{file.name}</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {slideCount > 0 ? `${slideCount} Slides` : ''}{slideCount > 0 && fileSize ? ' • ' : ''}{fileSize}
              </p>
            </div>
        </div>
        <button onClick={onClose} className="p-1 rounded-full text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800">
          <X size={20} />
        </button>
      </div>
      
      {/* Visual Preview */}
      <div className="flex-grow p-4 sm:p-6 bg-zinc-50 dark:bg-zinc-900/20 flex items-center justify-center">
        {previewImageUrl ? (
            <img src={previewImageUrl} alt="First slide preview" className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-lg" />
        ) : (
            <div className="text-center text-zinc-500 dark:text-zinc-400">
                <MonitorPlay className="h-16 w-16 mx-auto mb-2"/>
                <p>No preview available.</p>
            </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="flex-shrink-0 p-3 border-t border-zinc-200 dark:border-zinc-700 flex items-center justify-end gap-3">
        <button
          onClick={handleOpenInNewTab}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700"
        >
          Open
        </button>
        <button
          onClick={handleDownload}
          className="flex items-center gap-2 px-4 py-1.5 text-sm font-medium bg-zinc-800 dark:bg-zinc-100 text-white dark:text-black rounded-lg hover:bg-zinc-700 dark:hover:bg-zinc-200"
        >
          <Download size={16} />
          Download
        </button>
      </div>
    </div>
  );

  if (isDesktop) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="p-0 border-none gap-0 max-w-3xl">
          {content}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={isOpen} onOpenChange={onClose}>
      <DrawerContent className="p-0 border-none">
        {content}
      </DrawerContent>
    </Drawer>
  );
}