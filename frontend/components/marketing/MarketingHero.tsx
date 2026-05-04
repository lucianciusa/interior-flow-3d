"use client";

import dynamic from "next/dynamic";
import { useReducedMotion } from "framer-motion";

const HeroScene = dynamic(() => import("./HeroScene"), { ssr: false });

import { useLanguage } from "@/lib/stores/useLanguage";

function HeroFallback() {
  const { t } = useLanguage();
  return (
    <div className="flex h-full items-center justify-center bg-gradient-to-br from-muted to-background">
      <div className="text-center">
        <div className="mx-auto mb-4 h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-primary">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        </div>
        <p className="text-sm text-muted-foreground">{t("preview_3d")}</p>
      </div>
    </div>
  );
}

export default function MarketingHero() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <section className="relative w-full aspect-[16/9] max-h-[70vh] overflow-hidden rounded-2xl border border-border bg-card shadow-lg">
      {prefersReducedMotion ? <HeroFallback /> : <HeroScene />}
    </section>
  );
}
