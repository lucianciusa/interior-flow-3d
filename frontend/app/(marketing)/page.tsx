import Link from "next/link";

import MarketingHero from "@/components/marketing/MarketingHero";
import HowItWorks from "@/components/marketing/HowItWorks";
import WhatsIncluded from "@/components/marketing/WhatsIncluded";
import PricingTeaser from "@/components/marketing/PricingTeaser";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function MarketingPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-16">
      {/* Hero section */}
      <section className="flex flex-col items-center gap-8 text-center">
        <h1 className="max-w-2xl text-5xl font-bold tracking-tight font-display text-foreground sm:text-6xl">
          Design any room{" "}
          <span className="bg-gradient-to-r from-primary to-muted-foreground bg-clip-text text-transparent">
            in 30 seconds
          </span>
        </h1>
        <p className="max-w-xl text-lg text-muted-foreground">
          Interior Flow 3D turns room dimensions and a style into a 3D layout
          you can rotate, inspect, and save. No design skills needed.
        </p>
        <Link 
          href="/app/new" 
          className={cn(buttonVariants({ size: "lg" }))}
        >
          Try it free, no signup
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
