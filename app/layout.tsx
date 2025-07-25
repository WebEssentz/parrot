import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
// --- STEP 1: Keep ONLY the fonts you are using ---
import { Nunito, Playfair_Display, Roboto_Mono } from 'next/font/google';
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ClerkProvider } from '@clerk/nextjs';
import { cn } from "@/lib/utils";
import { PWAInstaller } from "@/components/PWAInstaller";

// --- STEP 2: Instantiate ONLY the fonts you are using ---

// The primary body/sans-serif font
const nunito = Nunito({
  subsets: ['latin'],
  variable: '--font-nunito',
  display: 'swap', // Improves font loading performance
});

// The primary heading/display font
const playfairDisplay = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair-display',
  display: 'swap', // Improves font loading performance
});

// The primary monospace font for code
const robotoMono = Roboto_Mono({
  subsets: ['latin'],
  variable: '--font-roboto-mono',
  display: 'swap', // Improves font loading performance
});


export const metadata: Metadata = {
  title: "Avocado Avurna",
  description:
    "This starter project uses Groq with the AI SDK via the Vercel Marketplace",
  icons: {
    icon: '/favicon.png',
  }
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="shortcut icon" href="favicon.png" type="image/x-icon" />
        <meta name="theme-color" content="#18181b" />
        <meta name="google-site-verification" content="TWDD5_-BbDEw89BT9l6ywqyUtOT_trSMrQRCG9MUD9M" />
      </head>
      {/* --- STEP 3: Apply ONLY the necessary font variables and base classes --- */}
      <body className={cn(
        "font-sans antialiased", // This applies your base font (Nunito) via tailwind.config.js
        "h-full",
        nunito.variable,
        playfairDisplay.variable,
        robotoMono.variable
      )}
        suppressHydrationWarning
      >
        <ClerkProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem={false}
          >
            <TooltipProvider delayDuration={0}>
              <main>
                {children}
                <Analytics />
              </main>
              <Toaster />
              <PWAInstaller />
            </TooltipProvider>
          </ThemeProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}