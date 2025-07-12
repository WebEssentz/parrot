// =================================================================
// A Reusable, Sleek Icon Button for the Sidebar
// =================================================================
import clsx from "clsx";
import { LucideProps } from "lucide-react";
import { forwardRef } from "react";

interface SidebarIconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ComponentType<LucideProps>;
}

export const SidebarIconButton = forwardRef<HTMLButtonElement, SidebarIconButtonProps>(
  ({ icon: Icon, className, ...props }, ref) => {
    return (
      <button
        ref={ref}
        {...props}
        className={clsx(
          "p-2 rounded-lg text-zinc-500",
          "hover:text-primary hover:bg-zinc-200/70 dark:hover:bg-zinc-700/30",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          className
        )}
      >
        <Icon size={19} />
      </button>
    );
  }
);

SidebarIconButton.displayName = "SidebarIconButton";