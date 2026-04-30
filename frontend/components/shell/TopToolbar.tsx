import { Home, ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { QuotaBadge } from "./QuotaBadge";
import { ThemeToggle } from "./ThemeToggle";
import { AccountMenu } from "./AccountMenu";

export function TopToolbar({ isEdgeToEdge }: { isEdgeToEdge: boolean }) {
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => setMounted(true), []);

  const segments = pathname?.split("/").filter(Boolean) ?? [];
  const isApp = segments[0] === "app";

  // /app/projects/[id]/rooms/[id]/layouts/[id]
  const projectId = segments[2];
  const roomId = segments[4];
  const layoutId = segments[6];

  return (
    <header
      className={`flex h-14 items-center justify-between border-b px-6 transition-all z-20 ${
        isEdgeToEdge ? "absolute left-0 right-0 top-0 border-b bg-background" : "bg-card"
      }`}
    >
      <div className="flex items-center gap-2 text-sm text-muted-foreground font-body">
        <Link href="/app" className="flex items-center hover:text-foreground transition-colors">
          <Home size={16} />
        </Link>
        <ChevronRight size={14} className="opacity-50" />
        <Link href="/app" className="hover:text-foreground transition-colors">
          Dashboard
        </Link>

        {projectId && (
          <>
            <ChevronRight size={14} className="opacity-50" />
            <Link 
              href={`/app/projects/${projectId}`} 
              className={`hover:text-foreground transition-colors ${!roomId ? "font-semibold text-foreground" : ""}`}
            >
              Project
            </Link>
          </>
        )}

        {roomId && (
          <>
            <ChevronRight size={14} className="opacity-50" />
            <Link 
              href={`/app/projects/${projectId}/rooms/${roomId}`} 
              className={`hover:text-foreground transition-colors ${!layoutId ? "font-semibold text-foreground" : ""}`}
            >
              Room
            </Link>
          </>
        )}

        {layoutId && (
          <>
            <ChevronRight size={14} className="opacity-50" />
            <span className="font-semibold text-foreground tracking-tight font-display">
              Layout
            </span>
          </>
        )}
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