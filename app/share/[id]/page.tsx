// FILE: app/share/[id]/page.tsx

import { PublicChatView } from "@/components/public-chat-view";
import { ArrowRight, FileQuestion, Ghost, Rocket } from "lucide-react";
import Link from "next/link";

// Define the shape of the data we expect from our API
interface PublicChatData {
  id: string;
  title: string;
  messages: any[]; // Define a proper type for your messages if you have one
  updatedAt: string;
  isLiveSynced: boolean;
  user: {
    username: string | null;
    profilePic: string | null;
  };
}

// Helper function to fetch the data. This keeps the component clean.
async function getPublicChat(chatId: string): Promise<PublicChatData | null> {
  // IMPORTANT: Use your actual production domain here from environment variables.
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const response = await fetch(`${appUrl}/api/public/share/${chatId}`, {
    // Use `no-store` to ensure the page is always fresh, especially for live-synced chats.
    cache: 'no-store', 
  });

  if (!response.ok) {
    // If the API returns 404 or any other error, we'll treat it as not found.
    return null;
  }

  return response.json();
}

const ChatNotFound = () => (
  // The main container is centered and uses generous padding for a spacious, focused layout.
  // The background uses a very dark gray to match the source image's theme.
  <div className="flex flex-col min-h-screen items-center justify-center text-center gap-5 py-32 px-4 bg-[#121212]">
     {/* Icon: 'FileQuestion' is thematic for a missing chat.
        The surrounding glow effect integrates it with the modern UI aesthetic. */}
    <div className="relative flex items-center justify-center">
        <div className="absolute w-24 h-24 bg-blue-500/10 dark:bg-blue-900/40 rounded-full blur-2xl" />
        <FileQuestion className="w-16 h-16 text-zinc-600 dark:text-zinc-500" strokeWidth={1.25} />
    </div>
    
    {/* Heading: Bold, larger, and uses a crisp white for high contrast and impact. */}
    <h1 className="text-3xl font-bold tracking-tight text-zinc-100 dark:text-zinc-50 mt-4">
      Chat Not Found
    </h1>
    
    {/* Subtext: Softer gray provides clear hierarchy. The copy is direct and helpful. */}
    <p className="max-w-sm text-zinc-500 dark:text-zinc-400">
      The conversation you're looking for doesn't exist or you may not have permission to view it.
    </p>
    
    {/* Call to Action: REFINED BUTTON
        This button is designed to be cleaner and more subtle.
        - No 'ring': Replaced with a soft, dark 'border'.
        - Softer colors: Uses darker, less obtrusive default colors.
        - Clean hover state: The border and text subtly brighten on hover for a polished feel.
    */}
    <Link 
      href="/" 
      className="inline-flex items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-400 border border-zinc-800 hover:border-zinc-700 hover:text-zinc-200 transition-colors duration-200 mt-6"
    >
      Start a New Conversation
      <ArrowRight className="w-4 h-4" />
    </Link>
  </div>
);

// The main Server Component for the page.
export default async function PublicSharePage({ params }: { params: { id: string } }) {
  const chatData = await getPublicChat(params.id);

  // If no data is returned, render our custom "Not Found" component.
  if (!chatData) {
    return <ChatNotFound />;
  }

  // On success, render the client component responsible for presentation.
  return <PublicChatView chat={chatData} />;
}