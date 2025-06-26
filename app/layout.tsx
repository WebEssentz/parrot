import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next"
import { IBM_Plex_Mono, Source_Serif_4 } from 'next/font/google';
import "./globals.css";
import "./styles/text-animations.css" // Import the animations CSS
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  ClerkProvider,
} from '@clerk/nextjs'

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono', // CSS variable for code
});

const sourceSerif = Source_Serif_4({
  subsets: ['latin'],
  weight: ['400', '600'],
  style: ['normal', 'italic'],
  variable: '--font-serif', // CSS variable for UI text and comments
});

export const metadata: Metadata = {
  title: "Avocado Avurna",
  description:
    "This starter project uses Groq with the AI SDK via the Vercel Marketplace",
};


// Register service worker for PWA support
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch(() => {});
  });
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" type="image/x-icon" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#18181b" />
      </head>
      <body
        className={`${ibmPlexMono.variable} ${sourceSerif.variable} antialiased`}
        suppressHydrationWarning
      >
        <ClerkProvider>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <TooltipProvider delayDuration={0}>
              <main>
                {children}
                <Analytics/>
              </main>
              <Toaster />
            </TooltipProvider>
          </ThemeProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}

