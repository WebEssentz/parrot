"use client"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface DeleteDraftModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  draftTitle: string
  isDeleting?: boolean
}

export const DeleteDraftModal = ({
  isOpen,
  onClose,
  onConfirm,
  draftTitle,
  isDeleting = false,
}: DeleteDraftModalProps) => {
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="sm:max-w-[30rem] -mt-5 px-4 py-1 border border-neutral-200 dark:border-white/10 bg-white/90 dark:bg-[#2a2a2a]/90 backdrop-blur-sm shadow-2xl rounded-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="mt-2 mb-2 text-lg text-zinc-900/90 dark:text-neutral-50">
            Delete draft?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-md text-primary dark:text-neutral-400">
            This will permanently delete{" "}
            <span className="font-bold text-primary dark:text-neutral-50">"{draftTitle}".</span>
          </AlertDialogDescription>
          <AlertDialogDescription className="text-sm text-red-600 dark:text-red-500">
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:justify-end gap-3">
          <AlertDialogCancel
            disabled={isDeleting}
            className="px-3 mb-3.5 rounded-full cursor-pointer border border-neutral-200 dark:border-white/20 bg-transparent text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-white/10 transition-colors"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-3 mb-3.5 rounded-full cursor-pointer bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#2a2a2a] transition-colors"
          >
            {isDeleting ? "Deleting..." : "Delete Draft"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
