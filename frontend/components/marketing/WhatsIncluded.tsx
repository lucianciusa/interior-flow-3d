"use client";

import { useEffect, useState } from "react";
import { Home, Palette, BookOpen } from "lucide-react";
import { useLanguage } from "@/lib/stores/useLanguage";

export default function WhatsIncluded() {
  const { t } = useLanguage();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const safeT = (key: string) => mounted ? t(key) : key;

  const CARDS = [
    {
      icon: Home,
      title: safeT("room_types_feat"),
      body: safeT("room_types_desc"),
    },
    {
      icon: Palette,
      title: safeT("styles_feat"),
      body: safeT("styles_desc"),
    },
    {
      icon: BookOpen,
      title: safeT("catalog_feat"),
      body: safeT("catalog_desc"),
    },
  ];

  return (
    <section className="py-16">
      <h2 className="text-center text-2xl font-semibold tracking-tight font-display text-foreground mb-8">
        {safeT("whats_included")}
      </h2>
      <div className="grid gap-6 sm:grid-cols-3">
        {CARDS.map((card) => (
          <div
            key={card.title}
            className="rounded-xl border border-border bg-card p-6 transition-colors hover:bg-muted/50"
          >
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <card.icon size={20} />
            </div>
            <h3 className="text-sm font-semibold text-foreground">{card.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{card.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
