"use client";

import { useQuotaStore } from "@/lib/stores/quota";
import { useAuthStore } from "@/lib/stores/auth";
import { Lock } from "lucide-react";

export function QuotaBadge() {
  const session = useAuthStore((s) => s.session);
  const ready = useAuthStore((s) => s.ready);
  const { generations, limit } = useQuotaStore();

  if (!ready) return null;

  if (session) {
    return (
      <div className="flex h-8 items-center gap-1.5 rounded-full border bg-muted/50 px-3 text-xs font-medium text-muted-foreground shadow-sm">
        Free plan
      </div>
    );
  }

  const remaining = Math.max(0, limit - generations);

  return (
    <div className="flex h-8 items-center gap-2 rounded-full border bg-muted/50 px-3 text-xs font-medium shadow-sm">
      <span className="text-muted-foreground">
        {remaining} free var{remaining === 1 ? "" : "s"}
      </span>
      <button className="flex h-5 items-center gap-1 rounded-full bg-primary pl-1.5 pr-2 text-[10px] font-semibold text-primary-foreground hover:opacity-90">
        <Lock size={10} className="opacity-80" />
        Pro
      </button>
    </div>
  );
}