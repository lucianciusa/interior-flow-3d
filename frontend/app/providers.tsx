"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { useState } from "react";

import AuthProvider from "@/components/auth/AuthProvider";

export function ThemeProvider({ children, ...props }: React.ComponentProps<typeof NextThemesProvider> & { children?: React.ReactNode }) {
  const PropHack = NextThemesProvider as any;
  return <PropHack {...props}>{children}</PropHack>
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient());
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={client}>
        <AuthProvider>{children}</AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
