"use client";

import { Wrench } from "lucide-react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import * as React from "react";
import { useRef, useLayoutEffect, useState } from "react";
import { motion } from "framer-motion";
import { Paperclip } from "lucide-react";

export const SEARCH_MODE = "__search_mode__"; // Ensure this is consistently defined

// WIP: We want to create a license line in our files like below
// It should say something about licensed use. ie. Avurna is not a free software to distribute, sell, or purchase, and is tied to the Avocado INC.

/**
 * 
 * @license
 * Copyright 2025 Avocado INC.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// Custom Search SVG icon
function SearchIcon({ className = "", ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-[18px] w-[18px]", className)}
      {...props}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12ZM11.9851 4.00291C11.9933 4.00046 11.9982 4.00006 11.9996 4C12.001 4.00006 12.0067 4.00046 12.0149 4.00291C12.0256 4.00615 12.047 4.01416 12.079 4.03356C12.2092 4.11248 12.4258 4.32444 12.675 4.77696C12.9161 5.21453 13.1479 5.8046 13.3486 6.53263C13.6852 7.75315 13.9156 9.29169 13.981 11H10.019C10.0844 9.29169 10.3148 7.75315 10.6514 6.53263C10.8521 5.8046 11.0839 5.21453 11.325 4.77696C11.5742 4.32444 11.7908 4.11248 11.921 4.03356C11.953 4.01416 11.9744 4.00615 11.9851 4.00291ZM8.01766 11C8.08396 9.13314 8.33431 7.41167 8.72334 6.00094C8.87366 5.45584 9.04762 4.94639 9.24523 4.48694C6.48462 5.49946 4.43722 7.9901 4.06189 11H8.01766ZM4.06189 13H8.01766C8.09487 15.1737 8.42177 17.1555 8.93 18.6802C9.02641 18.9694 9.13134 19.2483 9.24522 19.5131C6.48461 18.5005 4.43722 16.0099 4.06189 13ZM10.019 13H13.981C13.9045 14.9972 13.6027 16.7574 13.1726 18.0477C12.9206 18.8038 12.6425 19.3436 12.3823 19.6737C12.2545 19.8359 12.1506 19.9225 12.0814 19.9649C12.0485 19.9852 12.0264 19.9935 12.0153 19.9969C12.0049 20.0001 11.9999 20 11.9999 20C11.9999 20 11.9948 20 11.9847 19.9969C11.9736 19.9935 11.9515 19.9852 11.9186 19.9649C11.8494 19.9225 11.7455 19.8359 11.6177 19.6737C11.3575 19.3436 11.0794 18.8038 10.8274 18.0477C10.3973 16.7574 10.0955 14.9972 10.019 13ZM15.9823 13C15.9051 15.1737 15.5782 17.1555 15.07 18.6802C14.9736 18.9694 14.8687 19.2483 14.7548 19.5131C17.5154 18.5005 19.5628 16.0099 19.9381 13H15.9823ZM19.9381 11C19.5628 7.99009 17.5154 5.49946 14.7548 4.48694C14.9524 4.94639 15.1263 5.45584 15.2767 6.00094C15.6657 7.41167 15.916 9.13314 15.9823 11H19.9381Z"
        fill="currentColor"
      />
    </svg>
  );
}

// ToolsButton component (moved from components/textarea.tsx)
export const ToolsButton = ({ onClick, disabled, hasSentMessage }: { onClick: () => void; disabled?: boolean; hasSentMessage?: boolean }) => {
  // All hooks must be called unconditionally and in the same order
  const [isDesktop, setIsDesktop] = React.useState(
    typeof window === 'undefined' ? true : window.innerWidth >= 1024
  );
  const [showSearchInline, setShowSearchInline] = React.useState(false);
  const [dropdownOpen, setDropdownOpen] = React.useState(false);
  const [selectedTool, setSelectedTool] = React.useState<'search' | 'reason'>('search');
  // These hooks must always be called, regardless of isDesktop
  React.useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Inline search button animation state
  const [searchToggled, setSearchToggled] = React.useState(false);
  // For closing the dropdown
  const dropdownRef = React.useRef<any>(null);

  // Custom vertical separator (STATIC, no animation)
  const VerticalSeparator = () => (
    <div
      className="mx-2 h-6 w-px bg-gradient-to-b from-zinc-300/60 via-zinc-400/80 to-zinc-300/60 dark:from-zinc-700/60 dark:via-zinc-600/80 dark:to-zinc-700/60 rounded-full backdrop-blur-[2px]"
      style={{ boxShadow: '0 0 8px 0 rgba(31,38,135,0.10)' }}
    />
  );

  // Web search icon (matching SearchButton)
  function WebSearchIcon({ isToggled, className = '', ...rest }: { isToggled?: boolean; className?: string } & React.SVGProps<SVGSVGElement>) {
    return (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn(
          "h-[18px] w-[18px]",
          isToggled ? "text-[#1e93ff]" : "text-zinc-400 dark:text-white",
          className
        )}
        {...rest}
      >
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12ZM11.9851 4.00291C11.9933 4.00046 11.9982 4.00006 11.9996 4C12.001 4.00006 12.0067 4.00046 12.0149 4.00291C12.0256 4.00615 12.047 4.01416 12.079 4.03356C12.2092 4.11248 12.4258 4.32444 12.675 4.77696C12.9161 5.21453 13.1479 5.8046 13.3486 6.53263C13.6852 7.75315 13.9156 9.29169 13.981 11H10.019C10.0844 9.29169 10.3148 7.75315 10.6514 6.53263C10.8521 5.8046 11.0839 5.21453 11.325 4.77696C11.5742 4.32444 11.7908 4.11248 11.921 4.03356C11.953 4.01416 11.9744 4.00615 11.9851 4.00291ZM8.01766 11C8.08396 9.13314 8.33431 7.41167 8.72334 6.00094C8.87366 5.45584 9.04762 4.94639 9.24523 4.48694C6.48462 5.49946 4.43722 7.9901 4.06189 11H8.01766ZM4.06189 13H8.01766C8.09487 15.1737 8.42177 17.1555 8.93 18.6802C9.02641 18.9694 9.13134 19.2483 9.24522 19.5131C6.48461 18.5005 4.43722 16.0099 4.06189 13ZM10.019 13H13.981C13.9045 14.9972 13.6027 16.7574 13.1726 18.0477C12.9206 18.8038 12.6425 19.3436 12.3823 19.6737C12.2545 19.8359 12.1506 19.9225 12.0814 19.9649C12.0485 19.9852 12.0264 19.9935 12.0153 19.9969C12.0049 20.0001 11.9999 20 11.9999 20C11.9999 20 11.9948 20 11.9847 19.9969C11.9736 19.9935 11.9515 19.9852 11.9186 19.9649C11.8494 19.9225 11.7455 19.8359 11.6177 19.6737C11.3575 19.3436 11.0794 18.8038 10.8274 18.0477C10.3973 16.7574 10.0955 14.9972 10.019 13ZM15.9823 13C15.9051 15.1737 15.5782 17.1555 15.07 18.6802C14.9736 18.9694 14.8687 19.2483 14.7548 19.5131C17.5154 18.5005 19.5628 16.0099 19.9381 13H15.9823ZM19.9381 11C19.5628 7.99009 17.5154 5.49946 14.7548 4.48694C14.9524 4.94639 15.1263 5.45584 15.2767 6.00094C15.6657 7.41167 15.916 9.13314 15.9823 11H19.9381Z"
          fill="currentColor"
        />
      </svg>
    );
  }

  // Check icon for selected tool
  function CheckIcon({ className = '', ...props }: React.SVGProps<SVGSVGElement>) {
    return (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn("h-[18px] w-[18px]", className)}
        {...props}
      >
        <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  // Reason bulb icon (matching ReasonButton)
  const ReasonBulbIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-[18px] w-[18px] text-zinc-400", props.className)}
      {...props}
    >
      <path
        d="m12 3c-3.585 0-6.5 2.9225-6.5 6.5385 0 2.2826 1.162 4.2913 2.9248 5.4615h7.1504c1.7628-1.1702 2.9248-3.1789 2.9248-5.4615 0-3.6159-2.915-6.5385-6.5-6.5385zm2.8653 14h-5.7306v1h5.7306v-1zm-1.1329 3h-3.4648c0.3458 0.5978 0.9921 1 1.7324 1s1.3866-0.4022 1.7324-1zm-5.6064 0c0.44403 1.7252 2.0101 3 3.874 3s3.43-1.2748 3.874-3c0.5483-0.0047 0.9913-0.4506 0.9913-1v-2.4593c2.1969-1.5431 3.6347-4.1045 3.6347-7.0022 0-4.7108-3.8008-8.5385-8.5-8.5385-4.6992 0-8.5 3.8276-8.5 8.5385 0 2.8977 1.4378 5.4591 3.6347 7.0022v2.4593c0 0.5494 0.44301 0.9953 0.99128 1z"
        clipRule="evenodd"
        fill="currentColor"
        fillRule="evenodd"
      />
    </svg>
  );

  // Inline search button (animated in)
  // Framer Motion v5+: use motion(SearchButton) instead of motion.custom
  const InlineSearchButton = motion(SearchButton);

  // Inline search close logic: clicking the highlighted Search button closes the inline search
  const [inlineSearchEnabled, setInlineSearchEnabled] = React.useState(true); // always true in inline mode

  // Always render both mobile and desktop, but conditionally show one
  if (!isDesktop) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className={cn(
              "inline-flex items-center cursor-pointer justify-center h-9 rounded-full text-zinc-500 dark:text-zinc-400 bg-white dark:bg-transparent font-medium px-2.5",
              "hover:bg-zinc-100 dark:hover:bg-zinc-700/70",
              disabled ? "opacity-50 cursor-not-allowed" : ""
            )}
            style={{ fontWeight: 500, minWidth: 40 }}
            aria-label="Open tools"
          >
            <Wrench className="h-[18px] w-[18px] text-zinc-400" />
            <span className="ml-1.5 font-medium text-sm">Tools</span>
          </button>
        </TooltipTrigger>
        <TooltipContent side={"bottom"} className="select-none">
          {disabled ? "Processing..." : "Access tools with /"}
        </TooltipContent>
      </Tooltip>
    );
  }

  if (showSearchInline) {
    // Show the dropdown menu when wrench is clicked in inline search mode
    return (
      <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
        <motion.div
          className="flex items-center px-0 py-0"
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 16 }}
          transition={{ duration: 0.22, ease: 'circOut' }}
        >
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              disabled={disabled}
              className={cn(
                "inline-flex items-center justify-center h-9 rounded-full text-zinc-500 dark:text-zinc-400 font-medium px-2.5",
                disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
              )}
              style={{ fontWeight: 500, minWidth: 40, boxShadow: 'none', border: 'none', background: 'none' }}
              aria-label="Open tools"
              tabIndex={-1}
              onClick={() => {
                setDropdownOpen(true);
              }}
            >
              <Wrench className="h-[18px] w-[18px] text-zinc-400" />
            </button>
          </DropdownMenuTrigger>
          <VerticalSeparator />
          <motion.div
            className="flex items-center"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 16 }}
            transition={{ duration: 0.22, ease: 'circOut' }}
          >
            <InlineSearchButton
              isSearchEnabled={inlineSearchEnabled}
              setIsSearchEnabled={(enabled) => {
                // Only allow closing (enabled === false)
                if (!enabled) {
                  setShowSearchInline(false);
                }
              }}
              disabled={disabled}
            />
          </motion.div>
        </motion.div>
        <DropdownMenuContent
          align="start"
          side={typeof hasSentMessage !== 'undefined' && hasSentMessage ? "top" : "bottom"}
          className={cn(
    "min-w-[260px] max-w-[320px] p-2",
    "rounded-2xl",
    "transition-all duration-200",
    "bg-white/80 dark:bg-zinc-800"
  )}
  style={{
    ...(typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
      ? { background: '#212121e8', boxShadow: 'none', backdropFilter: 'none', border: 'none', borderRadius: 20 }
      : { boxShadow: '0 8px 32px 0 rgba(31,38,135,0.18)', backdropFilter: 'blur(8px)', border: 'none', borderRadius: 20 }
    )
  }}
        >
          <div className="px-3 pt-1 pb-2 text-sm font-semibold text-zinc-500 dark:text-zinc-300 select-none uppercase tracking-wider">Tools</div>
          <button
            type="button"
            className={cn(
              "flex items-center w-full px-3 py-2 text-sm rounded-xl transition-colors cursor-pointer font-medium",
              selectedTool === 'search'
                ? "text-[#1e93ff] dark:text-[#46a5e7]"
                : "text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            )}
            tabIndex={-1}
            onClick={() => {
              setShowSearchInline(true);
              setDropdownOpen(false);
              setSelectedTool('search');
            }}
          >
            <WebSearchIcon isToggled={showSearchInline} />
            <span className={cn("ml-2", selectedTool === 'search' && "text-[#1e93ff] dark:text-[#46a5e7]")}>Search the web</span>
            {selectedTool === 'search' && (
              <span className="ml-auto flex items-center">
                <CheckIcon className="text-[#1e93ff] dark:text-[#46a5e7]" />
              </span>
            )}
          </button>
          <button
            type="button"
            className={cn(
              "flex items-center w-full px-3 py-2 text-sm rounded-xl transition-colors cursor-pointer font-medium mt-1",
              "text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            )}
            tabIndex={-1}
            onClick={() => {
              setSelectedTool('reason');
            }}
          >
            <ReasonBulbIcon />
            <span className="ml-2">Reason before response</span>
            {selectedTool === 'reason' && (
              <span className="ml-auto flex items-center">
                <CheckIcon className="text-[#1e93ff] dark:text-[#46a5e7]" />
              </span>
            )}
          </button>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "inline-flex items-center cursor-pointer justify-center h-9 rounded-full text-zinc-500 dark:text-zinc-400 bg-white dark:bg-transparent font-medium px-2.5",
            "hover:bg-zinc-100 dark:hover:bg-zinc-700/70",
            disabled ? "opacity-50 cursor-not-allowed" : ""
          )}
          style={{ fontWeight: 500, minWidth: 40 }}
          aria-label="Open tools"
        >
          <Wrench className="h-[18px] w-[18px] text-zinc-400" />
          <span className="ml-1.5 font-medium text-sm">Tools</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        side={hasSentMessage ? "top" : "bottom"}
        className={cn(
          "min-w-[260px] max-w-[320px] p-2",
          "rounded-2xl",
          "transition-all duration-200"
          // Removed bg utility classes to avoid override
        )}
        style={{
          background: '#212121e8',
          ...(typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
            ? { boxShadow: 'none', backdropFilter: 'none', border: 'none', borderRadius: 20 }
            : { boxShadow: '0 8px 32px 0 rgba(31,38,135,0.18)', backdropFilter: 'blur(8px)', border: 'none', borderRadius: 20 }
          )
        }}
      >
        <div className="px-3 pt-1 pb-2 text-sm font-semibold text-zinc-500 dark:text-zinc-300 select-none uppercase tracking-wider">Tools</div>
        <button
          type="button"
          className={cn(
            "flex items-center w-full px-3 py-2 text-sm text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer",
            "font-medium"
          )}
          tabIndex={-1}
          onClick={() => {
            setShowSearchInline(true);
          }}
        >
          <WebSearchIcon isToggled={showSearchInline} />
          <span className="ml-2">Search the web</span>
        </button>
        <button
          type="button"
          className={cn(
            "flex items-center w-full px-3 py-2 text-sm text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer",
            "font-medium mt-1"
          )}
          tabIndex={-1}
          // onClick: not implemented yet
        >
          <ReasonBulbIcon />
          <span className="ml-2">Reason before response</span>
        </button>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function SearchButton({
  isSearchEnabled,
  setIsSearchEnabled,
  disabled,
}: {
  isSearchEnabled: boolean;
  setIsSearchEnabled: (enabled: boolean) => void;
  disabled?: boolean;
}) {
  const isSearching = isSearchEnabled;
  const [isMobileOrTablet, setIsMobileOrTablet] = React.useState(false);
  
  React.useEffect(() => {
    const check = () => setIsMobileOrTablet(window.innerWidth < 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const handleClick = () => {
    if (disabled) return;
    setIsSearchEnabled(!isSearching);
  };
  
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-pressed={isSearching}
          onClick={handleClick}
          disabled={disabled}
          className={cn(
            "inline-flex items-center cursor-pointer justify-center h-9 rounded-full text-zinc-500 dark:text-zinc-400 bg-white dark:bg-transparent font-medium px-2.5", // Adjusted dark bg
            isSearching && !disabled
              ? "bg-[#daeeff] text-[#1e93ff] dark:bg-[#2a4a6d] dark:text-[#46a5e7] hover:bg-[#b3d8ff] hover:shadow-[0_2px_8px_0_rgba(30,147,255,0.15)] dark:hover:bg-[#18304a]"
              : "hover:bg-zinc-100 dark:hover:bg-zinc-700/70", // Adjusted dark hover bg
            disabled ? "opacity-50 cursor-not-allowed" : ""
          )}
          style={{ fontWeight: 500, minWidth: isMobileOrTablet ? 40 : 0 }}
          data-testid="composer-button-search"
          aria-label="Search"
        >
          <SearchIcon
            className={cn(
              isSearching && !disabled
                ? "text-[#1e93ff]"
                : "text-zinc-400" // Kept zinc-400 for consistency, adjust if needed
            )}
          />
          {!isMobileOrTablet && (
            <span className="ml-1.5 font-medium text-sm">Search</span> // Adjusted margin
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side={isMobileOrTablet ? "top" : "bottom"} className="select-none">
        {disabled ? "Processing..." : "Search the web"}
      </TooltipContent>
    </Tooltip>
  );
}

export function AttachButton({
  onClick,
  disabled,
}: {
  onClick?: () => void;
  disabled?: boolean;
}) {
  const [isMobileOrTablet, setIsMobileOrTablet] = React.useState(false);
  React.useEffect(() => {
    const check = () => setIsMobileOrTablet(window.innerWidth < 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          className={cn(
            "inline-flex items-center cursor-pointer justify-center h-9 rounded-full text-zinc-500 dark:text-zinc-400 bg-white dark:bg-transparent font-medium px-2.5", // Adjusted dark bg and -ml
            "hover:bg-zinc-100 dark:hover:bg-zinc-700/70", // Adjusted dark hover bg
            disabled ? "opacity-50 cursor-not-allowed" : ""
          )}
          style={{ fontWeight: 500, minWidth: isMobileOrTablet ? 40 : 0 }}
          data-testid="composer-button-attach"
          aria-label="Attach file"
        >
          <Paperclip
            className={cn("h-[18px] w-[18px] text-zinc-400")} // Kept zinc-400 for consistency
          />
          {!isMobileOrTablet && (
            <span className="ml-1.5 font-medium text-sm">Attach</span> // Adjusted margin
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side={isMobileOrTablet ? "top" : "bottom"} className="select-none">
        {disabled ? "Processing..." : "Upload files and more"}
      </TooltipContent>
    </Tooltip>
  );
}

export function ReasonButton({
  isReasonEnabled,
  setIsReasonEnabled,
  hideTextOnMobile,
  disabled,
}: {
  isReasonEnabled: boolean;
  setIsReasonEnabled: (enabled: boolean) => void;
  hideTextOnMobile?: boolean;
  disabled?: boolean;
}) {
  const isReasoning = isReasonEnabled;
  const [isMobileOrTablet, setIsMobileOrTablet] = React.useState(false);

  React.useEffect(() => {
    const check = () => setIsMobileOrTablet(window.innerWidth < 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const handleClick = () => {
    if (disabled) return;
    setIsReasonEnabled(!isReasoning);
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-pressed={isReasoning}
          onClick={handleClick}
          disabled={disabled}
          className={cn(
            "inline-flex items-center cursor-pointer justify-center h-9 rounded-full text-zinc-500 dark:text-zinc-400 bg-white dark:bg-transparent font-medium px-2", // Adjusted dark bg
            isReasoning && !disabled
              ? "bg-[#daeeff] text-[#1e93ff] dark:bg-[#2a4a6d] dark:text-[#46a5e7] hover:bg-[#b3d8ff] hover:shadow-[0_2px_8px_0_rgba(30,147,255,0.15)] dark:hover:bg-[#18304a]"
              : "hover:bg-zinc-100 dark:hover:bg-zinc-700/70", // Adjusted dark hover bg
            disabled ? "opacity-50 cursor-not-allowed" : ""
          )}
          style={{ fontWeight: 500, minWidth: isMobileOrTablet ? 36 : 0 }}
          data-testid="composer-button-reason"
          aria-label="Reason"
        >
          <svg
            fill="none"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
            className={cn(
              "h-[18px] w-[18px]",
              isReasoning && !disabled
                ? "fill-[#1e93ff] text-[#1e93ff]"
                : "fill-none text-zinc-400" // Kept zinc-400 for consistency
            )}
          >
            <path
              d="m12 3c-3.585 0-6.5 2.9225-6.5 6.5385 0 2.2826 1.162 4.2913 2.9248 5.4615h7.1504c1.7628-1.1702 2.9248-3.1789 2.9248-5.4615 0-3.6159-2.915-6.5385-6.5-6.5385zm2.8653 14h-5.7306v1h5.7306v-1zm-1.1329 3h-3.4648c0.3458 0.5978 0.9921 1 1.7324 1s1.3866-0.4022 1.7324-1zm-5.6064 0c0.44403 1.7252 2.0101 3 3.874 3s3.43-1.2748 3.874-3c0.5483-0.0047 0.9913-0.4506 0.9913-1v-2.4593c2.1969-1.5431 3.6347-4.1045 3.6347-7.0022 0-4.7108-3.8008-8.5385-8.5-8.5385-4.6992 0-8.5 3.8276-8.5 8.5385 0 2.8977 1.4378 5.4591 3.6347 7.0022v2.4593c0 0.5494 0.44301 0.9953 0.99128 1z"
              clipRule="evenodd"
              fill={(isReasoning && !disabled) ? "#1e93ff" : "currentColor"}
              fillRule="evenodd"
            />
          </svg>
          {!isMobileOrTablet && (
            <span className="ml-1.5 font-medium text-sm">Reason</span>  // Adjusted margin
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side={isMobileOrTablet ? "top" : "bottom"} className="select-none">
        {disabled ? "Processing..." : "Think before responding"}
      </TooltipContent>
    </Tooltip>
  );
}

// Framer Motion Animated Textarea - FULLY UPDATED
function Textarea({
  className,
  rows = 1,
  style,
  ...props
}: React.ComponentProps<"textarea"> & { rows?: number }) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fadeRef = useRef<HTMLDivElement>(null);
  const [isScrolled, setIsScrolled] = useState(false);

  const initialMinHeight = typeof style?.minHeight === 'number' 
    ? style.minHeight 
    : (rows > 1 ? undefined : 40); 
  const [animatedHeight, setAnimatedHeight] = useState<number | string>(initialMinHeight || 'auto');

  const value = props.value;
  const minHeightFromStyle = style?.minHeight;
  const maxHeightFromStyle = style?.maxHeight;

  // Detect scroll position for fade effect
  React.useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const handleScroll = () => {
      setIsScrolled(textarea.scrollTop > 0);
    };
    textarea.addEventListener('scroll', handleScroll);
    // Initial check
    setIsScrolled(textarea.scrollTop > 0);
    return () => textarea.removeEventListener('scroll', handleScroll);
  }, [textareaRef.current]);

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      const computedStyle = window.getComputedStyle(textarea);
      const computedMinHeight = parseFloat(computedStyle.minHeight); // Use minHeight from style prop if available via computedStyle
      const effectiveMaxHeight = typeof maxHeightFromStyle === 'number' ? maxHeightFromStyle : Infinity;
      const prevHeight = textarea.style.height;
      textarea.style.height = 'auto';
      const scrollHeight = textarea.scrollHeight;
      let targetHeight = scrollHeight;
      if (effectiveMaxHeight !== Infinity) {
        targetHeight = Math.min(targetHeight, effectiveMaxHeight);
      }
      // Ensure targetHeight respects the effective minHeight (from style or CSS default)
      targetHeight = Math.max(targetHeight, computedMinHeight);
      if (animatedHeight !== targetHeight || typeof animatedHeight === 'string') {
        setAnimatedHeight(targetHeight);
      }
      if (textarea.style.height !== `${targetHeight}px`) {
         textarea.style.height = `${targetHeight}px`;
      }
    }
  }, [value, rows, minHeightFromStyle, maxHeightFromStyle, animatedHeight]);

  // Light mode detection
  const [isLightMode, setIsLightMode] = useState(true);
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const match = window.matchMedia('(prefers-color-scheme: dark)');
      setIsLightMode(!match.matches);
      const listener = (e: MediaQueryListEvent) => setIsLightMode(!e.matches);
      match.addEventListener('change', listener);
      return () => match.removeEventListener('change', listener);
    }
  }, []);

  return (
    <motion.div
      animate={{ height: animatedHeight }}
      transition={{ type: "tween", duration: 0.2, ease: "circOut" }}
      style={{ overflow: "hidden", width: "100%", position: 'relative' }}
    >
      <textarea
        ref={textareaRef}
        data-slot="textarea"
        className={cn(
          // Remove blur and shadow, set solid background for light mode
          "border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive w-full rounded-md border px-3 py-2 text-base transition-[color,box-shadow] outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm min-h-10",
          isLightMode
            ? "bg-white !shadow-none !backdrop-blur-none bg-opacity-100 border-zinc-200"
            : "bg-zinc-900/80 dark:bg-zinc-900/80 backdrop-blur-sm bg-opacity-50 dark:bg-opacity-50 shadow-[0_-4px_16px_-4px_rgba(0,0,0,0.35)]",
          className
        )}
        style={{
          ...style,
          height: typeof animatedHeight === "number" ? `${animatedHeight}px` : "auto",
          minHeight: 64,
          overflowY:
            textareaRef.current &&
            typeof maxHeightFromStyle === "number" &&
            typeof animatedHeight === "number" && 
            animatedHeight >= maxHeightFromStyle && 
            textareaRef.current.scrollHeight > animatedHeight 
              ? "auto"
              : "hidden",
          zIndex: 1,
          position: 'relative',
        }}
        rows={rows}
        {...props}
      />
      {/* Top fade shadow for light mode, always visible */}
      {isLightMode && (
        <div
          ref={fadeRef}
          style={{
            pointerEvents: 'none',
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            height: 28,
            zIndex: 2,
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.10), rgba(255,255,255,0.0) 80%)',
            borderTopLeftRadius: 8,
            borderTopRightRadius: 8,
            transition: 'opacity 0.2s',
            opacity: 1,
          }}
        />
      )}
      {/* Top border shadow for focus (light mode) */}
      {isLightMode && (
        <style>{`
          textarea[data-slot="textarea"]:focus-visible {
            box-shadow: 0 -8px 24px -8px rgba(30, 41, 59, 0.10);
            border-color: #a1a1aa;
          }
        `}</style>
      )}
    </motion.div>
  );
}
export { Textarea };