import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next"
import { Geist, Geist_Mono, Inter, Roboto, Open_Sans, Lato, Montserrat, Poppins, Source_Sans_3, Nunito, Playfair_Display, Merriweather, Lora, Crimson_Text, PT_Serif, JetBrains_Mono, Fira_Code, Source_Code_Pro, Roboto_Mono } from 'next/font/google';
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  ClerkProvider,
} from '@clerk/nextjs'
import { cn } from "@/lib/utils";

// --- Instantiate all the fonts you need, assigning a CSS variable to each ---
const inter = Inter({ 
  subsets: ['latin'], 
  variable: '--font-inter' 
});
const roboto = Roboto({ 
  weight: ['400', '700'], 
  subsets: ['latin'], 
  variable: '--font-roboto' 
});
const openSans = Open_Sans({ 
  subsets: ['latin'], 
  variable: '--font-open-sans' 
});
const lato = Lato({ 
  weight: ['400', '700'], 
  subsets: ['latin'], 
  variable: '--font-lato' 
});
const montserrat = Montserrat({ 
  subsets: ['latin'], 
  variable: '--font-montserrat' 
});
const poppins = Poppins({ 
  weight: ['400', '600'], 
  subsets: ['latin'], 
  variable: '--font-poppins' 
});
const sourceSans3 = Source_Sans_3({ 
  subsets: ['latin'], 
  variable: '--font-source-sans-pro' 
});
const nunito = Nunito({ 
  subsets: ['latin'], 
  variable: '--font-nunito' 
});
const playfairDisplay = Playfair_Display({ 
  subsets: ['latin'], 
  variable: '--font-playfair-display' 
});
const merriweather = Merriweather({ 
  weight: ['400', '700'], 
  subsets: ['latin'], 
  variable: '--font-merriweather' 
});
const lora = Lora({ 
  subsets: ['latin'], 
  variable: '--font-lora' 
});
const crimsonText = Crimson_Text({
  weight: ['400', '600'],
  subsets: ['latin'],
  variable: '--font-crimson-text'
});
const ptSerif = PT_Serif({
  weight: ['400', '700'],
  subsets: ['latin'], variable: '--font-pt-serif'
});
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono'
});
const firaCode = Fira_Code({
  subsets: ['latin'],
  variable: '--font-fira-code'
});
const sourceCodePro = Source_Code_Pro({
  subsets: ['latin'],
  variable: '--font-source-code-pro'
});
const robotoMono = Roboto_Mono({
  subsets: ['latin'],
  variable: '--font-roboto-mono'
});
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Avocado Avurna",
  description:
    "This starter project uses Groq with the AI SDK via the Vercel Marketplace",
};


// Register service worker for PWA support
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch(() => { });
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
      <body className={cn(
        "font-sans antialiased",
        inter.variable,
        roboto.variable,
        openSans.variable,
        lato.variable,
        montserrat.variable,
        poppins.variable,
        sourceSans3.variable,
        nunito.variable,
        playfairDisplay.variable,
        merriweather.variable,
        lora.variable,
        crimsonText.variable,
        ptSerif.variable,
        jetbrainsMono.variable,
        firaCode.variable,
        sourceCodePro.variable,
        robotoMono.variable,
        geistMono.variable,
        geistSans.variable,
      )}
        suppressHydrationWarning
      >
        <ClerkProvider>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <TooltipProvider delayDuration={0}>
              <main>
                {children}
                <Analytics />
              </main>
              <Toaster />
            </TooltipProvider>
          </ThemeProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
