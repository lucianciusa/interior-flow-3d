"use client";

import Link from "next/link";
import { useAuthStore } from "@/lib/stores/auth";
import { AccountMenu } from "@/components/shell/AccountMenu";
import { useEffect, useState } from "react";

export function MarketingNav() {
  const session = useAuthStore((s) => s.session);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="w-20" />; // placeholder

  return (
    <div className="flex items-center gap-4">
      {session && (
        <Link
          href="/app"
          className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          Dashboard
        </Link>
      )}
      <AccountMenu />
    </div>
  );
}
