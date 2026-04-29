import { Home, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { QuotaBadge } from "./QuotaBadge";
import { ThemeToggle } from "./ThemeToggle";
import { AccountMenu } from "./AccountMenu";

export function TopToolbar({ isEdgeToEdge }: { isEdgeToEdge: boolean }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <header
      className={`flex h-16 items-center justify-between border-b px-6 transition-all bg-background z-20 ${
        isEdgeToEdge ? "absolute left-0 right-0 top-0 border-b/50 backdrop-blur" : "bg-card"
      }`}
    >
      <div className="flex items-center gap-2 text-sm text-muted-foreground font-body">
        <Link href="/app" className="flex items-center hover:text-foreground">
          <Home size={16} />
        </Link>
        <ChevronRight size={16} />
        <span className="font-semibold text-foreground tracking-tight font-display">Dashboard</span>
      </div>

      <div className="flex items-center gap-4">
        {mounted && (
          <>
            <QuotaBadge />
            <ThemeToggle />
            <AccountMenu />
          </>
        )}
      </div>
    </header>
  );
}