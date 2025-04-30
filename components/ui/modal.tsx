import * as React from "react";
import { cn } from "@/lib/utils";

export function Modal({ open, onClose, children, className }: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  React.useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className={cn("bg-white dark:bg-zinc-900 rounded-xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-y-auto p-0", className)}
        onClick={e => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
