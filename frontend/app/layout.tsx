import "./globals.css";
import type { Metadata } from "next";

import Providers from "./providers";

export const metadata: Metadata = {
  title: "Interior Flow 3D",
  description: "AI-powered 3D living room design copilot",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-neutral-900 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
