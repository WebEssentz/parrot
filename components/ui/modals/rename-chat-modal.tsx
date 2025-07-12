// FILE: components/rename-chat-modal.tsx

"use client"

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface RenameChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (newTitle: string) => void;
  currentTitle: string;
  isRenaming?: boolean;
}

export const RenameChatModal = ({
  isOpen,
  onClose,
  onConfirm,
  currentTitle,
  isRenaming = false,
}: RenameChatModalProps) => {
  const [newTitle, setNewTitle] = useState(currentTitle);

  // Sync the input field if the currentTitle prop changes while the modal is open
  useEffect(() => {
    setNewTitle(currentTitle);
  }, [currentTitle, isOpen]);

  const handleConfirm = () => {
    const trimmedTitle = newTitle.trim();
    if (trimmedTitle && trimmedTitle !== currentTitle) {
      onConfirm(trimmedTitle);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleConfirm();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-white/90 dark:bg-[#2a2a2a]/90 backdrop-blur-sm shadow-2xl rounded-2xl border-zinc-200/80 dark:border-zinc-700/80">
        <DialogHeader>
          <DialogTitle className="text-lg text-zinc-900 dark:text-neutral-50">
            Rename chat
          </DialogTitle>
        </DialogHeader>
        <div className="py-2">
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter a new title"
            className="h-10 text-base"
            autoFocus
            onFocus={(e) => e.target.select()} // Automatically select text on focus
          />
        </div>
        <DialogFooter className="mt-2 sm:justify-end gap-2">
          <DialogClose asChild>
            <Button
              type="button"
              variant="ghost"
              className="rounded-full cursor-pointer"
              disabled={isRenaming}
            >
              Cancel
            </Button>
          </DialogClose>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={isRenaming || !newTitle.trim() || newTitle.trim() === currentTitle}
            className="rounded-full cursor-pointer bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
          >
            {isRenaming ? "Renaming..." : "Rename"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};