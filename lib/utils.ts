import {
  generateId,
  type CoreAssistantMessage,
  type CoreToolMessage,
  type Message,
  type UIMessage,
} from 'ai';
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

import type { Document } from '@/lib/db/schema';
import { genSaltSync, hashSync } from 'bcrypt-ts';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ApplicationError extends Error {
  info: string;
  status: number;
}

export const fetcher = async (url: string) => {
  const res = await fetch(url);

  if (!res.ok) {
    const error = new Error(
      'An error occurred while fetching the data.',
    ) as ApplicationError;

    error.info = await res.json();
    error.status = res.status;

    throw error;
  }

  return res.json();
};

export function getLocalStorage(key: string) {
  if (typeof window !== 'undefined') {
    return JSON.parse(localStorage.getItem(key) || '[]');
  }
  return [];
}

export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function addToolMessageToChat({
  toolMessage,
  messages,
}: {
  toolMessage: CoreToolMessage;
  messages: Array<Message>;
}): Array<Message> {
  return messages.map((message) => {
    if (message.toolInvocations) {
      return {
        ...message,
        toolInvocations: message.toolInvocations.map((toolInvocation) => {
          const toolResult = toolMessage.content.find(
            (tool) => tool.toolCallId === toolInvocation.toolCallId,
          );

          if (toolResult) {
            return {
              ...toolInvocation,
              state: 'result',
              result: toolResult.result,
            };
          }

          return toolInvocation;
        }),
      };
    }

    return message;
  });
}

type ResponseMessageWithoutId = CoreToolMessage | CoreAssistantMessage;
type ResponseMessage = ResponseMessageWithoutId & { id: string };

export function sanitizeResponseMessages({
  messages,
  reasoning,
}: {
  messages: Array<ResponseMessage>;
  reasoning: string | undefined;
}) {
  const toolResultIds: Array<string> = [];

  for (const message of messages) {
    if (message.role === 'tool') {
      for (const content of message.content) {
        if (content.type === 'tool-result') {
          toolResultIds.push(content.toolCallId);
        }
      }
    }
  }

  const messagesBySanitizedContent = messages.map((message) => {
    if (message.role !== 'assistant') return message;

    if (typeof message.content === 'string') return message;

    const sanitizedContent = message.content.filter((content) =>
      content.type === 'tool-call'
        ? toolResultIds.includes(content.toolCallId)
        : content.type === 'text'
          ? content.text.length > 0
          : true,
    );

    if (reasoning) {
      // @ts-expect-error: reasoning message parts in sdk is wip
      sanitizedContent.push({ type: 'reasoning', reasoning });
    }

    return {
      ...message,
      content: sanitizedContent,
    };
  });

  return messagesBySanitizedContent.filter(
    (message) => message.content.length > 0,
  );
}

export function getMostRecentUserMessage(messages: Array<UIMessage>) {
  const userMessages = messages.filter((message) => message.role === 'user');
  return userMessages.at(-1);
}

export function getDocumentTimestampByIndex(
  documents: Array<Document>,
  index: number,
) {
  if (!documents) return new Date();
  if (index > documents.length) return new Date();

  return documents[index].createdAt;
}

export function getTrailingMessageId({
  messages,
}: {
  messages: Array<ResponseMessage>;
}): string | null {
  const trailingMessage = messages.at(-1);

  if (!trailingMessage) return null;

  return trailingMessage.id;
}

export function generateDummyPassword() {
  const password = generateId(12);

  const salt = genSaltSync(10);
  const hash = hashSync(password, salt);

  return hash;
}

// lib/utils.ts (add these functions)

export function extractBaseHostname(url: string): string {
  if (!url) return '';
  try {
    const parsedUrl = new URL(url);
    // Remove www. if it exists
    return parsedUrl.hostname.replace(/^www\./, '');
  } catch (error) {
    // console.error("Error parsing URL for hostname:", error);
    // Fallback for invalid URLs, or return a more generic placeholder
    const parts = url.split('/');
    if (parts.length > 2) {
        return parts[2].replace(/^www\./, '');
    }
    return url;
  }
}

/**
 * Transforms an array of search results (with imageUrl) into MediaCarousel-compatible image objects.
 * @param searchResults Array of search result objects, each possibly with imageUrl, title, and url.
 * @returns Array of image objects for MediaCarousel.
 */
export function mapSearchResultsToCarouselImages(
  searchResults: Array<{ imageUrl?: string; image?: string; title?: string; url?: string; sourceUrl?: string }>
): Array<{ src: string; alt?: string; source?: { url: string; title?: string } }> {
  if (!Array.isArray(searchResults)) return [];
  return searchResults
    .filter(r => (typeof r.image === 'string' && r.image) || (typeof r.imageUrl === 'string' && r.imageUrl))
    .map(r => ({
      src: r.image || r.imageUrl!,
      alt: r.title || 'Search result image',
      source: { url: r.url || r.sourceUrl || '', title: r.title || '' },
    }));
}

// --- Example usage for integrating with MediaCarousel ---
//
// import { mapSearchResultsToCarouselImages } from '@/lib/utils';
// import { MediaCarousel } from '@/components/ui/media-carousel';
//
// function SearchResults({ searchResults }) {
//   const images = mapSearchResultsToCarouselImages(searchResults);
//   return <MediaCarousel images={images} />;
// }
//
// This ensures all imageUrls from search results are displayed in the carousel, following best practices.
