import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { UserButton } from "@clerk/nextjs";
// import { SidebarToggle } from '@/components/sidebar-toggle';

export const UserChatHeader = () => {
  const [showBorder, setShowBorder] = useState(false);
  const { theme } = useTheme();
  const [isLoaded, setIsLoaded] = useState(false);
  // No need for useUser, use UserButton from Clerk

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
        `fixed right-0 left-0 w-full top-0 bg-white dark:bg-[#1f2023] z-50` +
        (showBorder ? " border-b border-zinc-200 dark:border-zinc-800" : " border-b-0")
      }
      style={{ boxShadow: showBorder ? '0 2px 8px 0 rgba(0,0,0,0.03)' : 'none' }}
    >
      <div className="flex justify-between items-center p-4">
        <div className="flex flex-row items-center gap-2 shrink-0 ">
          {/* <SidebarToggle /> */}
          <span className="flex flex-row items-center gap-2 home-links">
            <span
              className={
                `text-[20px] font-leading select-none -mt-2 font-medium transition-colors duration-200 ` +
                (theme === 'dark' ? 'text-white' : 'text-black')
              }
              style={{
                lineHeight: '22px',
                fontFamily: 'Google Sans, \"Helvetica Neue\", sans-serif',
                letterSpacing: 'normal',
              }}
            >
              Avurna
            </span>
          </span>
        </div>
        <div className="flex items-center gap-2 pr-2" style={{ marginTop: '-2px' }}>
          <UserButton appearance={{ elements: { avatarBox: "w-10 h-10" } }} />
        </div>
      </div>
    </div>
  );
};
