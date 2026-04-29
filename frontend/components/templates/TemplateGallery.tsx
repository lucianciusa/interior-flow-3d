"use client";

import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { useListTemplates } from "@/lib/api";
import { useWizardStore } from "@/lib/stores/wizard";
import type { Template } from "@/lib/types";
import type { Style } from "@/lib/types";

function TemplateCard({ template, onUse }: { template: Template; onUse: () => void }) {
  return (
    <button
      type="button"
      onClick={onUse}
      className="group flex flex-col items-start rounded-xl border border-border bg-card p-5 text-left transition-all hover:shadow-md hover:border-ring"
    >
      {/* Thumbnail placeholder */}
      <div className="mb-3 h-24 w-full rounded-lg bg-muted flex items-center justify-center">
        <span className="text-xs text-muted-foreground capitalize">{template.style}</span>
      </div>
      <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
        {template.name}
      </h3>
      <p className="mt-1 text-xs text-muted-foreground">
        {template.dims.width_m}m × {template.dims.length_m}m × {template.dims.height_m}m
      </p>
    </button>
  );
}

export function TemplateGallery() {
  const { data, isLoading } = useListTemplates();
  const router = useRouter();
  const setDims = useWizardStore((s) => s.setDims);
  const setStyle = useWizardStore((s) => s.setStyle);

  const useTemplate = (t: Template) => {
    setDims(t.dims);
    setStyle(t.style as Style);
    router.push("/app/new");
  };

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-44 rounded-xl" />
        ))}
      </div>
    );
  }

  if (!data?.items?.length) return null;

  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold tracking-tight font-display text-foreground mb-4">
        Start from a template
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.items.map((t) => (
          <TemplateCard key={t.id} template={t} onUse={() => useTemplate(t)} />
        ))}
      </div>
    </section>
  );
}
