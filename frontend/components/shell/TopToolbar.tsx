import { Home, ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { QuotaBadge } from "./QuotaBadge";
import { ThemeToggle } from "./ThemeToggle";
import { AccountMenu } from "./AccountMenu";
import { useWizardStore } from "@/lib/stores/wizard";
import { LanguageToggle } from "./LanguageToggle";
import { useLanguage } from "@/lib/stores/useLanguage";

export function TopToolbar({ isEdgeToEdge }: { isEdgeToEdge: boolean }) {
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const reset = useWizardStore((s) => s.reset);
  const { language, t } = useLanguage();

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
        <Link
          href="/"
          onClick={() => reset()}
          className="flex items-center gap-1.5 hover:text-foreground transition-colors"
        >
          <Home size={16} />
          <span className="font-display font-medium text-sm tracking-tight hidden md:inline">
            Interior Flow 3D
          </span>
        </Link>
        <ChevronRight size={14} className="opacity-50" />
        <Link 
          href="/app" 
          onClick={() => reset()}
          className="hover:text-foreground transition-colors"
        >
          {mounted ? t("dashboard") : "Dashboard"}
        </Link>

        {projectId && (
          <>
            <ChevronRight size={14} className="opacity-50" />
            <Link 
              href={`/app/projects/${projectId}`} 
              className={`hover:text-foreground transition-colors ${!roomId ? "font-semibold text-foreground" : ""}`}
            >
              {mounted ? t("projects") : "Projects"}
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
              {mounted ? t("rooms") : "Rooms"}
            </Link>
          </>
        )}

        {layoutId && (
          <>
            <ChevronRight size={14} className="opacity-50" />
            <span className="font-semibold text-foreground tracking-tight font-display">
              {mounted ? t("layouts") : "Layouts"}
            </span>
          </>
        )}
      </div>

      <div className="flex items-center gap-4">
        {mounted && (
          <>
            <QuotaBadge />
            <LanguageToggle />
            <ThemeToggle />
            <AccountMenu />
          </>
        )}
      </div>
    </header>
  );
}