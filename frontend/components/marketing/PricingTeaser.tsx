"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/stores/useLanguage";

export default function PricingTeaser() {
  const { t } = useLanguage();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const safeT = (key: string) => mounted ? t(key) : key;

  return (
    <section className="py-16 text-center">
      <div className="mx-auto max-w-lg rounded-2xl border border-border bg-card p-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
          {safeT("pricing")}
        </p>
        <h2 className="text-2xl font-semibold tracking-tight font-display text-foreground">
          {safeT("free_beta")}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {safeT("pro_coming_soon")}
        </p>
        <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-muted px-4 py-2 text-xs font-medium text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-green-500" />
          {safeT("free_gen_limit")}
        </div>
      </div>
    </section>
  );
}
