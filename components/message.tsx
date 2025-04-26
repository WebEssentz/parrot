// DO NOT COPY THE STYLES, CAUSE THE CODE IS FAULTY, JUST THE FUNCTIONALITY OF THE COPY, NOT EVEN THE RENDERING :"use client";

// import type { Message as TMessage } from "ai";
// import { AnimatePresence, motion } from "motion/react";
// import { memo, useCallback, useEffect, useState } from "react";
// import equal from "fast-deep-equal";

// import { Markdown } from "./markdown";
// import { cn } from "@/lib/utils";
// import {
//   CheckCircle,
//   ChevronDownIcon,
//   ChevronUpIcon,
//   Loader2,
//   PocketKnife,
//   SparklesIcon,
//   StopCircle,
// } from "lucide-react";
// import { SpinnerIcon } from "./icons";
// import { useRef } from "react";

// interface ReasoningPart {
//   type: "reasoning";
//   reasoning: string;
//   details: Array<{ type: "text"; text: string }>;
// }

// interface ReasoningMessagePartProps {
//   part: ReasoningPart;
//   isReasoning: boolean;
// }

// export function ReasoningMessagePart({
//   part,
//   isReasoning,
// }: ReasoningMessagePartProps) {
//   const [isExpanded, setIsExpanded] = useState(false);

//   const variants = {
//     collapsed: {
//       height: 0,
//       opacity: 0,
//       marginTop: 0,
//       marginBottom: 0,
//     },
//     expanded: {
//       height: "auto",
//       opacity: 1,
//       marginTop: "1rem",
//       marginBottom: 0,
//     },
//   };

//   const memoizedSetIsExpanded = useCallback((value: boolean) => {
//     setIsExpanded(value);
//   }, []);

//   useEffect(() => {
//     memoizedSetIsExpanded(isReasoning);
//   }, [isReasoning, memoizedSetIsExpanded]);

//   return (
//     <div className="flex flex-col">
//       {isReasoning ? (
//         <div className="flex flex-row gap-2 items-center">
//           <div className="font-medium text-sm pl-4 mt-1">Reasoning</div>
//           <div className="animate-spin">
//             <SpinnerIcon />
//           </div>
//         </div>
//       ) : (
//         <div className="flex flex-row gap-2 items-center">
//           <div className="font-medium text-sm pl-4 mt-1">Reasoned for a few seconds</div>
//           <button
//             className={cn(
//               "cursor-pointer rounded-full dark:hover:bg-zinc-800 hover:bg-zinc-200",
//               {
//                 "dark:bg-zinc-800 bg-zinc-200": isExpanded,
//               },
//             )}
//             onClick={() => {
//               setIsExpanded(!isExpanded);
//             }}
//           >
//             {isExpanded ? (
//               <ChevronDownIcon className="h-4 w-4" />
//             ) : (
//               <ChevronUpIcon className="h-4 w-4" />
//             )}
//           </button>
//         </div>
//       )}

//       <AnimatePresence initial={false}>
//         {isExpanded && (
//           <motion.div
//             key="reasoning"
//             className="text-sm dark:text-zinc-400 text-zinc-600 flex flex-col gap-4 border-l pl-3 dark:border-zinc-800"
//             initial="collapsed"
//             animate="expanded"
//             exit="collapsed"
//             variants={variants}
//             transition={{ duration: 0.2, ease: "easeInOut" }}
//           >
//             {part.details.map((detail, detailIndex) =>
//               detail.type === "text" ? (
//                 <Markdown key={detailIndex}>{detail.text}</Markdown>
//               ) : (
//                 "<redacted>"
//               ),
//             )}
//           </motion.div>
//         )}
//       </AnimatePresence>
//     </div>
//   );
// }

// const PurePreviewMessage = ({
//   message,
//   isLatestMessage,
//   status,
// }: {
//   message: TMessage;
//   isLoading: boolean;
//   status: "error" | "submitted" | "streaming" | "ready";
//   isLatestMessage: boolean;
// }) => {
//   // Responsive: mobile-first, enterprise-grade assistant message layout
//   // On mobile, assistant icon above message bubble, left-aligned, max-w-[80vw]
//   // On desktop, keep current layout
//   const isAssistant = message.role === "assistant";
//   const [showCopy, setShowCopy] = useState(false);
//   const [copied, setCopied] = useState(false);
//   const copyTimeout = useRef<NodeJS.Timeout | null>(null);

//   // Get the AI message text (all text parts joined)
//   const aiMessageText = message.parts
//     ?.filter((part) => part.type === "text")
//     .map((part) => part.text)
//     .join("\n\n");

//   const handleCopy = () => {
//     if (!aiMessageText) return;
//     navigator.clipboard.writeText(aiMessageText);
//     setCopied(true);
//     if (copyTimeout.current) clearTimeout(copyTimeout.current);
//     copyTimeout.current = setTimeout(() => setCopied(false), 1500);
//   };

//   // Custom Copy Icon
//   const CustomCopyIcon = (
//     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="stroke-[2] size-4">
//       <rect x="3" y="8" width="13" height="13" rx="4" stroke="currentColor"></rect>
//       <path fillRule="evenodd" clipRule="evenodd" d="M13 2.00004L12.8842 2.00002C12.0666 1.99982 11.5094 1.99968 11.0246 2.09611C9.92585 2.31466 8.95982 2.88816 8.25008 3.69274C7.90896 4.07944 7.62676 4.51983 7.41722 5.00004H9.76392C10.189 4.52493 10.7628 4.18736 11.4147 4.05768C11.6802 4.00488 12.0228 4.00004 13 4.00004H14.6C15.7366 4.00004 16.5289 4.00081 17.1458 4.05121C17.7509 4.10066 18.0986 4.19283 18.362 4.32702C18.9265 4.61464 19.3854 5.07358 19.673 5.63807C19.8072 5.90142 19.8994 6.24911 19.9488 6.85428C19.9992 7.47112 20 8.26343 20 9.40004V11C20 11.9773 19.9952 12.3199 19.9424 12.5853C19.8127 13.2373 19.4748 13.8114 19 14.2361V16.5829C20.4795 15.9374 21.5804 14.602 21.9039 12.9755C22.0004 12.4907 22.0002 11.9334 22 11.1158L22 11V9.40004V9.35725C22 8.27346 22 7.3993 21.9422 6.69141C21.8826 5.96256 21.7568 5.32238 21.455 4.73008C20.9757 3.78927 20.2108 3.02437 19.27 2.545C18.6777 2.24322 18.0375 2.1174 17.3086 2.05785C16.6007 2.00002 15.7266 2.00003 14.6428 2.00004L14.6 2.00004H13Z" fill="currentColor"></path>
//     </svg>
//   );

//   function CustomCheckIcon() {
//     return (
//       <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="size-4">
//         <circle cx="8" cy="8" r="8" fill="#22c55e" />
//         <path d="M4.5 8.5L7 11L11.5 6.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
//       </svg>
//     );
//   }

//   return (
//     <AnimatePresence key={message.id}>
//       <motion.div
//         className="w-full mx-auto px-2 sm:px-4 group/message sm:max-w-4xl"
//         initial={{ y: 5, opacity: 0 }}
//         animate={{ y: 0, opacity: 1 }}
//         key={`message-${message.id}`}
//         data-role={message.role}
//         onMouseEnter={() => setShowCopy(true)}
//         onMouseLeave={() => setShowCopy(false)}
//       >
//         <div
//           className={cn(
//             isAssistant
//               ? "flex w-full flex-col sm:flex-row items-start"
//               : "flex flex-row gap-4 w-full group-data-[role=user]/message:ml-auto group-data-[role=user]/message:max-w-2xl group-data-[role=user]/message:w-fit",
//           )}
//         >
//           {isAssistant && (
//             <div className="flex flex-row items-start w-full gap-2">
//               {/* Copy icon at the far left */}
//               <div
//                 className={
//                   "flex items-center transition-all duration-300" +
//                   (showCopy ? " opacity-100 translate-x-0" : " opacity-0 -translate-x-2 pointer-events-none")
//                 }
//                 style={{ minWidth: 32 }}
//               >
//                 <button
//                   className="relative flex items-center justify-center p-1 rounded-full bg-white dark:bg-zinc-900 shadow hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors outline-none border border-transparent focus-visible:ring-2 focus-visible:ring-green-400"
//                   onClick={handleCopy}
//                   tabIndex={-1}
//                   aria-label={copied ? "Copied!" : "Copy"}
//                   type="button"
//                   style={{ outline: 'none' }}
//                 >
//                   <span className="sr-only">{copied ? "Copied!" : "Copy"}</span>
//                   {/* Tooltip */}
//                   <span className={
//                     "absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-1 rounded bg-zinc-800 text-xs text-white whitespace-nowrap transition-all duration-200 " +
//                     (showCopy ? " opacity-100" : " opacity-0 pointer-events-none")
//                   }>
//                     {copied ? "Copied!" : "Copy"}
//                   </span>
//                   {/* Icon with transform animation */}
//                   <span className="transition-transform duration-300 ease-in-out flex items-center">
//                     <motion.div
//                       key={copied ? 'check' : 'copy'}
//                       initial={{ scale: 0.7, rotate: copied ? 90 : 0, opacity: 0 }}
//                       animate={{ scale: 1, rotate: 0, opacity: 1 }}
//                       exit={{ scale: 0.7, rotate: copied ? 0 : -90, opacity: 0 }}
//                       transition={{ type: 'spring', stiffness: 400, damping: 30 }}
//                     >
//                       {copied ? <CustomCheckIcon /> : CustomCopyIcon}
//                     </motion.div>
//                   </span>
//                 </button>
//               </div>
//               {/* AI icon next to copy icon */}
//               <div className="size-8 flex items-center rounded-full justify-center ring-1 shrink-0 ring-border bg-background">
//                 <SparklesIcon size={14} />
//               </div>
//               {/* Filler space between icons and message */}
//               <div className="flex-1 h-0" />
//             </div>
//           )}

//           {isAssistant ? (
//             <div
//               className="w-full"
//               style={{ marginLeft: 0, paddingLeft: 0 }}
//             >
//               <div className="flex flex-col space-y-4" style={{ alignItems: 'flex-start' }}>
//                 {message.parts?.map((part, i) => {
//                   switch (part.type) {
//                     case "text":
//                       return (
//                         <motion.div
//                           initial={{ y: 5, opacity: 0 }}
//                           animate={{ y: 0, opacity: 1 }}
//                           key={`message-${message.id}-part-${i}`}
//                           className="flex flex-row items-start w-full pb-4"
//                         >
//                           <div
//                             className="flex flex-col gap-4 px-4 py-2"
//                             style={{ marginLeft: 0, alignItems: 'flex-start', background: 'none', border: 'none', boxShadow: 'none' }}
//                           >
//                             <Markdown>{part.text}</Markdown>
//                           </div>
//                         </motion.div>
//                       );
//                     case "tool-invocation":
//                       const { toolName, state } = part.toolInvocation;

//                       return (
//                         <motion.div
//                           initial={{ y: 5, opacity: 0 }}
//                           animate={{ y: 0, opacity: 1 }}
//                           key={`message-${message.id}-part-${i}`}
//                           className="flex flex-col gap-2 p-2 mb-3 text-sm bg-zinc-50 dark:bg-zinc-900 rounded-md border border-zinc-200 dark:border-zinc-800"
//                         >
//                           <div className="flex-1 flex items-center justify-center">
//                             <div className="flex items-center justify-center w-8 h-8 bg-zinc-50 dark:bg-zinc-800 rounded-full">
//                               <PocketKnife className="h-4 w-4" />
//                             </div>
//                             <div className="flex-1">
//                               <div className="font-medium flex items-baseline gap-2">
//                                 {state === "call" ? "Calling" : "Called"}{" "}
//                                 <span className="font-mono bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-md">
//                                   {toolName}
//                                 </span>
//                               </div>
//                             </div>
//                             <div className="w-5 h-5 flex items-center justify-center">
//                               {state === "call" ? (
//                                 isLatestMessage && status !== "ready" ? (
//                                   <Loader2 className="animate-spin h-4 w-4 text-zinc-500" />
//                                 ) : (
//                                   <StopCircle className="h-4 w-4 text-red-500" />
//                                 )
//                               ) : state === "result" ? (
//                                 <CheckCircle size={14} className="text-green-600" />
//                               ) : null}
//                             </div>
//                           </div>
//                         </motion.div>
//                       );
//                     case "reasoning":
//                       return (
//                         <ReasoningMessagePart
//                           key={`message-${message.id}-${i}`}
//                           // @ts-expect-error part
//                           part={part}
//                           isReasoning={
//                             (message.parts &&
//                               status === "streaming" &&
//                               i === message.parts.length - 1) ??
//                             false
//                           }
//                         />
//                       );
//                     default:
//                       return null;
//                   }
//                 })}
//               </div>
//             </div>
//           ) : (
//             <div className="flex flex-col w-full space-y-4">
//               {message.parts?.map((part, i) => {
//                 switch (part.type) {
//                   case "text":
//                     return (
//                       <motion.div
//                         initial={{ y: 5, opacity: 0 }}
//                         animate={{ y: 0, opacity: 1 }}
//                         key={`message-${message.id}-part-${i}`}
//                         className="flex flex-row items-start w-full pb-4"
//                       >
//                         <div
//                           className="bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 px-4 py-2 rounded-xl w-full sm:max-w-2xl shadow"
//                         >
//                           <Markdown>{part.text}</Markdown>
//                         </div>
//                       </motion.div>
//                     );
//                   default:
//                     return null;
//                 }
//               })}
//             </div>
//           )}
//         </div>
//       </motion.div>
//     </AnimatePresence>
//   );
// };

// export const Message = memo(PurePreviewMessage, (prevProps, nextProps) => {
//   if (prevProps.status !== nextProps.status) return false;
//   if (prevProps.message.annotations !== nextProps.message.annotations)
//     return false;
//   // if (prevProps.message.content !== nextProps.message.content) return false;
//   if (!equal(prevProps.message.parts, nextProps.message.parts)) return false;

//   return true;
// });


"use client";

import type { Message as TMessage } from "ai";
import { AnimatePresence, motion } from "motion/react";
import { memo, useCallback, useEffect, useState } from "react";
import equal from "fast-deep-equal";

import { Markdown } from "./markdown";
import { cn } from "@/lib/utils";
import {
  CheckCircle,
  ChevronDownIcon,
  ChevronUpIcon,
  Loader2,
  PocketKnife,
  SparklesIcon,
  StopCircle,
} from "lucide-react";
import { SpinnerIcon } from "./icons";

interface ReasoningPart {
  type: "reasoning";
  reasoning: string;
  details: Array<{ type: "text"; text: string }>;
}

interface ReasoningMessagePartProps {
  part: ReasoningPart;
  isReasoning: boolean;
}

export function ReasoningMessagePart({
  part,
  isReasoning,
}: ReasoningMessagePartProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const variants = {
    collapsed: {
      height: 0,
      opacity: 0,
      marginTop: 0,
      marginBottom: 0,
    },
    expanded: {
      height: "auto",
      opacity: 1,
      marginTop: "1rem",
      marginBottom: 0,
    },
  };

  const memoizedSetIsExpanded = useCallback((value: boolean) => {
    setIsExpanded(value);
  }, []);

  useEffect(() => {
    memoizedSetIsExpanded(isReasoning);
  }, [isReasoning, memoizedSetIsExpanded]);

  return (
    <div className="flex flex-col">
      {isReasoning ? (
        <div className="flex flex-row gap-2 items-center">
          <div className="font-medium text-sm pl-4 mt-1">Reasoning</div>
          <div className="animate-spin">
            <SpinnerIcon />
          </div>
        </div>
      ) : (
        <div className="flex flex-row gap-2 items-center">
          <div className="font-medium text-sm pl-4 mt-1">Reasoned for a few seconds</div>
          <button
            className={cn(
              "cursor-pointer rounded-full dark:hover:bg-zinc-800 hover:bg-zinc-200",
              {
                "dark:bg-zinc-800 bg-zinc-200": isExpanded,
              },
            )}
            onClick={() => {
              setIsExpanded(!isExpanded);
            }}
          >
            {isExpanded ? (
              <ChevronDownIcon className="h-4 w-4" />
            ) : (
              <ChevronUpIcon className="h-4 w-4" />
            )}
          </button>
        </div>
      )}

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            key="reasoning"
            className="text-sm dark:text-zinc-400 text-zinc-600 flex flex-col gap-4 border-l pl-3 dark:border-zinc-800"
            initial="collapsed"
            animate="expanded"
            exit="collapsed"
            variants={variants}
            transition={{ duration: 0.2, ease: "easeInOut" }}
          >
            {part.details.map((detail, detailIndex) =>
              detail.type === "text" ? (
                <Markdown key={detailIndex}>{detail.text}</Markdown>
              ) : (
                "<redacted>"
              ),
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const PurePreviewMessage = ({
  message,
  isLatestMessage,
  status,
}: {
  message: TMessage;
  isLoading: boolean;
  status: "error" | "submitted" | "streaming" | "ready";
  isLatestMessage: boolean;
}) => {
  // Responsive: mobile-first, enterprise-grade assistant message layout
  // On mobile, assistant icon above message bubble, left-aligned, max-w-[80vw]
  // On desktop, keep current layout
  const isAssistant = message.role === "assistant";
  return (
    <AnimatePresence key={message.id}>
      <motion.div
        className="w-full mx-auto px-2 sm:px-4 group/message sm:max-w-4xl"
        initial={{ y: 5, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        key={`message-${message.id}`}
        data-role={message.role}
      >
        {/* Mobile: assistant icon above message bubble, left-aligned */}
        <div
          className={cn(
            isAssistant
              ? "flex w-full flex-col sm:flex-row items-start"
              : "flex flex-row gap-4 w-full group-data-[role=user]/message:ml-auto group-data-[role=user]/message:max-w-2xl group-data-[role=user]/message:w-fit",
          )}
        >
          {isAssistant && (
            <div className="mb-1 sm:mb-0 size-8 flex items-center rounded-full justify-center ring-1 shrink-0 ring-border bg-background" style={{ alignSelf: 'flex-start' }}>
              <div>
                <SparklesIcon size={14} />
              </div>
            </div>
          )}

          {isAssistant ? (
            <div
              className="w-full"
              style={{ marginLeft: 0, paddingLeft: 0 }}
            >
              <div className="flex flex-col space-y-4" style={{ alignItems: 'flex-start' }}>
                {message.parts?.map((part, i) => {
                  switch (part.type) {
                    case "text":
                      return (
                        <motion.div
                          initial={{ y: 5, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          key={`message-${message.id}-part-${i}`}
                          className="flex flex-row items-start w-full pb-4"
                        >
                          <div
                            className="flex flex-col gap-4 px-4 py-2"
                            style={{ marginLeft: 0, alignItems: 'flex-start', background: 'none', border: 'none', boxShadow: 'none' }}
                          >
                            <Markdown>{part.text}</Markdown>
                          </div>
                        </motion.div>
                      );
                    case "tool-invocation":
                      const { toolName, state } = part.toolInvocation;

                      return (
                        <motion.div
                          initial={{ y: 5, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          key={`message-${message.id}-part-${i}`}
                          className="flex flex-col gap-2 p-2 mb-3 text-sm bg-zinc-50 dark:bg-zinc-900 rounded-md border border-zinc-200 dark:border-zinc-800"
                        >
                          <div className="flex-1 flex items-center justify-center">
                            <div className="flex items-center justify-center w-8 h-8 bg-zinc-50 dark:bg-zinc-800 rounded-full">
                              <PocketKnife className="h-4 w-4" />
                            </div>
                            <div className="flex-1">
                              <div className="font-medium flex items-baseline gap-2">
                                {state === "call" ? "Calling" : "Called"}{" "}
                                <span className="font-mono bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-md">
                                  {toolName}
                                </span>
                              </div>
                            </div>
                            <div className="w-5 h-5 flex items-center justify-center">
                              {state === "call" ? (
                                isLatestMessage && status !== "ready" ? (
                                  <Loader2 className="animate-spin h-4 w-4 text-zinc-500" />
                                ) : (
                                  <StopCircle className="h-4 w-4 text-red-500" />
                                )
                              ) : state === "result" ? (
                                <CheckCircle size={14} className="text-green-600" />
                              ) : null}
                            </div>
                          </div>
                        </motion.div>
                      );
                    case "reasoning":
                      return (
                        <ReasoningMessagePart
                          key={`message-${message.id}-${i}`}
                          // @ts-expect-error part
                          part={part}
                          isReasoning={
                            (message.parts &&
                              status === "streaming" &&
                              i === message.parts.length - 1) ??
                            false
                          }
                        />
                      );
                    default:
                      return null;
                  }
                })}
              </div>
            </div>
          ) : (
            <div className="flex flex-col w-full space-y-4">
              {message.parts?.map((part, i) => {
                switch (part.type) {
                  case "text":
                    return (
                      <motion.div
                        initial={{ y: 5, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        key={`message-${message.id}-part-${i}`}
                        className="flex flex-row items-start w-full pb-4"
                      >
                        <div
                          className="bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 px-4 py-2 rounded-xl w-full sm:max-w-2xl shadow"
                        >
                          <Markdown>{part.text}</Markdown>
                        </div>
                      </motion.div>
                    );
                  default:
                    return null;
                }
              })}
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export const Message = memo(PurePreviewMessage, (prevProps, nextProps) => {
  if (prevProps.status !== nextProps.status) return false;
  if (prevProps.message.annotations !== nextProps.message.annotations)
    return false;
  // if (prevProps.message.content !== nextProps.message.content) return false;
  if (!equal(prevProps.message.parts, nextProps.message.parts)) return false;

  return true;
});
