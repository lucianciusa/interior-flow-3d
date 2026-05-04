"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import MarketingHero from "@/components/marketing/MarketingHero";
import HowItWorks from "@/components/marketing/HowItWorks";
import WhatsIncluded from "@/components/marketing/WhatsIncluded";
import PricingTeaser from "@/components/marketing/PricingTeaser";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/stores/useLanguage";

export default function MarketingPage() {
  const { t } = useLanguage();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Use a stable default during hydration to match server-rendered English
  const safeT = (key: string) => mounted ? t(key) : key;

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-16">
      {/* Hero section */}
      <section className="flex flex-col items-center gap-8 text-center">
        <h1 className="max-w-2xl text-5xl font-bold tracking-tight font-display text-foreground sm:text-6xl">
          {safeT("hero_title")}{" "}
          <span className="bg-gradient-to-r from-primary to-muted-foreground bg-clip-text text-transparent">
            {safeT("hero_subtitle")}
          </span>
        </h1>
        <p className="max-w-xl text-lg text-muted-foreground">
          {safeT("hero_desc")}
        </p>
        <Link 
          href="/app/new" 
          className={cn(buttonVariants({ size: "lg" }))}
        >
          {safeT("hero_cta")}
        </Link>
      </section>

      {/* 3D hero */}
      <div className="mt-12">
        <MarketingHero />
      </div>

      {/* Below-fold sections */}
      <HowItWorks />
      <WhatsIncluded />
      <PricingTeaser />
    </main>
  );
}
