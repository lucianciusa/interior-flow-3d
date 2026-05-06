"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LayoutDashboard, Plus } from "lucide-react";
import { useWizardStore } from "@/lib/stores/wizard";
import { useLanguage } from "@/lib/stores/useLanguage";

export function LeftRail() {
  const [mounted, setMounted] = useState(false);
  const { t } = useLanguage();
  const reset = useWizardStore((s) => s.reset);

  useEffect(() => setMounted(true), []);

  return (
    <nav className="flex h-full w-16 flex-col items-center justify-between border-r bg-background py-4 relative z-10">
      <div className="flex flex-col items-center gap-4">
        {/* Create New Action */}
        <Link
          href="/app/new"
          title={mounted ? t("new_project") : "New project"}
          onClick={() => {
            reset();
          }}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-all hover:ring-2 hover:ring-ring hover:ring-offset-2"
        >
          <Plus size={20} />
        </Link>
        
        {/* Nav Items */}
        <div className="flex flex-col gap-2 mt-4">
          <Link
            href="/app"
            title={mounted ? t("dashboard") : "Dashboard"}
            onClick={() => reset()}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <LayoutDashboard size={20} />
          </Link>
        </div>
      </div>

      <div className="flex flex-col items-center gap-4">
        {/* Placeholder for future links. E.g. templates, gallery */}
      </div>
    </nav>
  );
}