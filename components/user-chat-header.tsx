"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { UserButton } from "@clerk/nextjs";
import { dark } from "@clerk/themes";

export const UserChatHeader = () => {
  const [showBorder, setShowBorder] = useState(false);
  const { resolvedTheme } = useTheme();
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setShowBorder(window.scrollY > 2);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  if (!isLoaded) return null;

  return (
    <div
      className={
        `fixed right-0 left-0 w-full top-0 bg-white dark:bg-[#1e1e1e] z-50 transition-all duration-200 ` +
        (showBorder ? " border-b border-zinc-200 dark:border-zinc-800" : " border-b-transparent")
      }
      style={{ boxShadow: showBorder ? '0 2px 8px 0 rgba(0,0,0,0.03)' : 'none' }}
    >
      <div className="flex justify-between items-center p-4">
        <div className="flex flex-row items-center gap-2 shrink-0 ">
          <span className="flex flex-row items-center gap-2 home-links">
            <span
              className={
                `text-[20px] font-leading select-none -mt-2 font-medium transition-colors duration-200 text-black dark:text-white`
              }
              style={{
                lineHeight: '22px',
                fontFamily: 'Google Sans, "Helvetica Neue", sans-serif',
                letterSpacing: 'normal',
              }}
            >
              Avurna
            </span>
          </span>
        </div>
        <div className="flex items-center gap-2 pr-0" style={{ marginTop: '-2px' }}>
          <UserButton
            appearance={{
              // This styles the UserButton dropdown menu
              baseTheme: resolvedTheme === 'dark' ? dark : undefined,
              elements: {
                userButtonAvatarBox: "w-10 h-10",
                userButtonPopoverCard: {
                  backgroundColor: resolvedTheme === 'dark' ? '#2A2B2F' : '#ffffff',
                  border: resolvedTheme === 'dark' ? '1px solid #3f3f46' : '1px solid #e5e5e5',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
                },
                userButtonPopoverFooter: {
                  display: "none",
                },
              },
            }}
            
            userProfileProps={{
              appearance: {
                baseTheme: resolvedTheme === 'dark' ? dark : undefined,
                elements: {
                  card: {
                    backgroundColor: resolvedTheme === 'dark' ? '#1e1e1e' : '#FFFFFF',
                    border: `1px solid ${resolvedTheme === 'dark' ? '#3f3f46' : '#e5e5e5'}`,
                    boxShadow: 'none',
                    width: '100%',
                    maxWidth: '56rem',
                  },
                  headerTitle: {
                    color: resolvedTheme === 'dark' ? '#FFFFFF' : '#000000',
                  },
                  navbar: {
                    backgroundColor: resolvedTheme === 'dark' ? '#2A2B2F' : '#F9FAFB',
                  },
                  navbarButton__active: {
                    backgroundColor: resolvedTheme === 'dark' ? '#3f3f46' : '#F3F4F6',
                  },
                  rootBox: {
                    color: resolvedTheme === 'dark' ? '#D1D5DB' : '#374151',
                  },
                  formFieldInput: {
                    backgroundColor: resolvedTheme === 'dark' ? '#2A2B2F' : '#FFFFFF',
                  },
                  // THIS IS THE FIX: The correct key is 'profilePage__footer'
                  profilePage__footer: {
                    display: 'none',
                  },
                },
              },
            }}
          />
        </div>
      </div>
    </div>
  );
};