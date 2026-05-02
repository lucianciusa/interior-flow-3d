"use client";

import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { useListTemplates } from "@/lib/api";
import { useWizardStore } from "@/lib/stores/wizard";
import type { Template } from "@/lib/types";
import type { Style } from "@/lib/types";

function TemplateCard({ template, onUse }: { template: Template; onUse: () => void }) {
  const styleImage = `/images/styles/${template.style}.png`;

  return (
    <button
      type="button"
      onClick={onUse}
      className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-all hover:shadow-xl hover:border-primary/50"
    >
      <div className="relative h-40 w-full overflow-hidden">
        <img
          src={template.thumbnail_url || styleImage}
          alt={template.name}
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 transition-opacity group-hover:opacity-90" />
        
        {/* Overlay content */}
        <div className="absolute inset-x-0 bottom-0 p-4">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-medium text-primary-foreground backdrop-blur-md border border-primary/30 uppercase tracking-wider">
              {template.style}
            </span>
            <span className="text-[10px] text-white/70">
              {template.dims.width_m}m × {template.dims.length_m}m
            </span>
          </div>
          <h3 className="mt-1 text-sm font-bold text-white transition-colors group-hover:text-primary-foreground">
            {template.name}
          </h3>
        </div>

        {/* Hover action button */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
          <div className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-lg transform translate-y-4 transition-transform group-hover:translate-y-0">
            Use this template
          </div>
        </div>
      </div>
    </button>
  );
}

export function TemplateGallery() {
  const { data, isLoading } = useListTemplates();
  const router = useRouter();
  const reset = useWizardStore((s) => s.reset);
  const setDims = useWizardStore((s) => s.setDims);
  const setStyle = useWizardStore((s) => s.setStyle);
  const setRoomType = useWizardStore((s) => s.setRoomType);
  const setPhase = useWizardStore((s) => s.setPhase);
  const setIsTemplateFlow = useWizardStore((s) => s.setIsTemplateFlow);

  const handleUseTemplate = (t: Template) => {
    reset();
    setIsTemplateFlow(true);
    setRoomType(t.room_type as any);
    setDims(t.dims);
    setStyle(t.style as Style);
    setPhase("step3"); // Jump to preferences for a fast flow
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
          <TemplateCard key={t.id} template={t} onUse={() => handleUseTemplate(t)} />
        ))}
      </div>
    </section>
  );
}
