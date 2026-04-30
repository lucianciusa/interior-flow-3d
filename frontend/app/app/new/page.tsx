"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

import WizardShell from "@/components/wizard/WizardShell";
import { useWizardStore } from "@/lib/stores/wizard";

function SeedReader() {
  const params = useSearchParams();
  const setSeed = useWizardStore((s) => s.setSeed);
  useEffect(() => {
    const raw = params?.get("seed");
    if (!raw) return;
    const n = Number.parseInt(raw, 10);
    if (Number.isFinite(n) && n > 0) setSeed(n);
  }, [params, setSeed]);
  return null;
}

export default function NewLayoutPage() {
  return (
    <>
      <Suspense fallback={null}>
        <SeedReader />
      </Suspense>
      <Suspense fallback={null}>
        <WizardShell />
      </Suspense>
    </>
  );
}
