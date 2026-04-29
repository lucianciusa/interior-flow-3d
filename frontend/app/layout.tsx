import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import localFont from "next/font/local";

import Providers from "./providers";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"], variable: "--font-body" });
const geistDisplay = localFont({
  src: "../node_modules/geist/dist/fonts/geist-sans/Geist-Variable.woff2",
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "Interior Flow 3D",
  description: "AI-powered 3D living room design copilot",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={cn(inter.variable, "font-sans", geistDisplay.variable)}>
      <body className="min-h-screen bg-background text-foreground font-body antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
