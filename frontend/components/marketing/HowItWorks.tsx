"use client";

import { useEffect, useState } from "react";
import { Sofa, Paintbrush, Layers } from "lucide-react";
import { useLanguage } from "@/lib/stores/useLanguage";

export default function HowItWorks() {
  const { t } = useLanguage();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const safeT = (key: string) => mounted ? t(key) : key;

  const STEPS = [
    {
      icon: Sofa,
      title: safeT("step1_title"),
      body: safeT("step1_body"),
    },
    {
      icon: Paintbrush,
      title: safeT("step2_title"),
      body: safeT("step2_body"),
    },
    {
      icon: Layers,
      title: safeT("step3_title"),
      body: safeT("step3_body"),
    },
  ];

  return (
    <section className="py-16">
      <h2 className="text-center text-2xl font-semibold tracking-tight font-display text-foreground mb-8">
        {safeT("how_it_works")}
      </h2>
      <div className="grid gap-6 sm:grid-cols-3">
        {STEPS.map((step) => (
          <div
            key={step.title}
            className="rounded-xl border border-border bg-card p-6 transition-colors hover:bg-muted/50"
          >
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <step.icon size={20} />
            </div>
            <h3 className="text-sm font-semibold text-foreground">{step.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{step.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
