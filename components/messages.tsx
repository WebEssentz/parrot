import type { Message as TMessage } from "ai"
import { Message } from "./message"
import type React from "react"

// Extend TMessage to allow pending/failed status for user messages
type ChatMessage = TMessage & {
  pending?: boolean
  status?: "pending" | "sending" | "failed" | "sent"
}

interface MessagesProps {
  messages: ChatMessage[]
  isLoading: boolean
  status: "error" | "submitted" | "streaming" | "ready"
  endRef?: React.RefObject<HTMLDivElement>
}

export const Messages = ({ messages, isLoading, status }: MessagesProps) => {
  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6 space-y-1">
      {messages.map((m, i) => {
        const isLatest = i === messages.length - 1
        let messageStatus: "error" | "submitted" | "streaming" | "ready" = "ready"
        let messageIsLoading = false
        let isPending = false
        let isFailed = false

        if (m.role === "user" && (m as ChatMessage).pending) {
          isPending = m.status === "pending" || m.status === "sending"
          isFailed = m.status === "failed"
        }

        if (m.role === "assistant" && isLatest) {
          messageStatus = status
          messageIsLoading = isLoading
        }

        return (
          <div key={m.id} data-latest-message={isLatest ? "true" : undefined} className="w-full relative">
            <Message
              chatId="default"
              isLatestMessage={isLatest}
              isLoading={messageIsLoading}
              message={m}
              status={messageStatus}
            />
            {isPending && m.role === "user" && (
              <div className="absolute right-4 top-4 flex items-center gap-1 z-10">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-zinc-400 animate-pulse"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" />
                </svg>
                <span className="text-xs text-zinc-400">{m.status === "sending" ? "Sending..." : "Pending"}</span>
              </div>
            )}
            {isFailed && m.role === "user" && (
              <div className="absolute right-4 top-4 flex items-center gap-1 z-10">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-red-500"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 8v4" />
                  <circle cx="12" cy="16" r="1" />
                </svg>
                <span className="text-xs text-red-500">Failed. Retry?</span>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
