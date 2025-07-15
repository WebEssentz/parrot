"use client";

import React, { useState } from "react";
import { useClerk, useUser } from "@clerk/nextjs";
import { Settings, AlertOctagon, Users, Zap, LogOut } from "lucide-react";
import * as Popover from "@radix-ui/react-popover";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";

const MenuItem = ({
  icon: Icon,
  text,
  onClick,
}: {
  icon: React.ElementType;
  text: string;
  onClick?: () => void;
}) => (
  <button
    onClick={onClick}
    className="w-full flex items-center text-left text-[14px] px-3 py-1.5 rounded-lg transition-colors duration-150 cursor-pointer
               text-black dark:text-zinc-100
               hover:bg-zinc-100 dark:hover:bg-zinc-700/50
               focus-visible:outline-none focus-visible:bg-zinc-100 dark:focus-visible:bg-zinc-700/50"
  >
    <Icon className="w-4 h-4 mr-3 text-black dark:text-zinc-100" />
    {text}
  </button>
);

export const CustomUserMenu = ({ children }: { children: React.ReactNode }) => {
  const { signOut, openUserProfile } = useClerk();
  const [isOpen, setIsOpen] = useState(false);

  const menuVariants = {
    hidden: { opacity: 0, scale: 0.97, y: 5, transition: { duration: 0.15, ease: "easeIn" } },
    visible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 400, damping: 25 } },
  };

  return (
    <Popover.Root open={isOpen} onOpenChange={setIsOpen}>
      <Popover.Trigger asChild>{children}</Popover.Trigger>
      <AnimatePresence>
        {isOpen && (
          <Popover.Portal forceMount>
            <Popover.Content
              asChild
              side="top"
              align="start"
              sideOffset={8}
              onInteractOutside={(e) => {
                if ((e.target as HTMLElement).closest(".cl-internal-b3fm6y")) {
                  e.preventDefault();
                }
              }}
            >
              <motion.div
                variants={menuVariants}
                initial="hidden"
                animate="visible"
                exit="hidden"
                className={clsx(
                  "w-44 z-50 p-1.5 rounded-xl shadow-xl origin-bottom-left",
                  "bg-white border border-zinc-200/80",
                  "dark:bg-[#282828] dark:border-zinc-700/80"
                )}
              >
                <div className="flex flex-col space-y-px">
                  <MenuItem icon={Settings} text="Settings" onClick={() => openUserProfile()} />
                  <MenuItem icon={AlertOctagon} text="Report Issue" />
                  <MenuItem icon={Users} text="Community" />
                  <MenuItem icon={Zap} text="Upgrade plan" />
                  <div className="h-px bg-zinc-200 dark:bg-zinc-700/60 my-1" />
                  <MenuItem icon={LogOut} text="Sign Out" onClick={() => signOut({ redirectUrl: "/" })} />
                </div>
              </motion.div>
            </Popover.Content>
          </Popover.Portal>
        )}
      </AnimatePresence>
    </Popover.Root>
  );
};

// UserAvatar component remains unchanged
export const UserAvatar = () => {
  const { user } = useUser();
  const getInitials = () => {
    const names = user?.fullName?.split(" ") || [];
    return names.length > 1 ? `${names[0][0]}${names[names.length - 1][0]}` : user?.fullName?.[0] || "U";
  };

  return (
    <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center bg-zinc-200 dark:bg-zinc-700/80">
      {user?.imageUrl ? (
        <img src={user.imageUrl} alt={user.fullName || "User"} className="w-full h-full rounded-full object-cover" />
      ) : (
        <span className="text-sm font-semibold text-zinc-600 dark:text-zinc-300">{getInitials()}</span>
      )}
    </div>
  );
};