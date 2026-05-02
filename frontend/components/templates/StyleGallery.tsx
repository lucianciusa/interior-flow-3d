"use client";

import { useRouter } from "next/navigation";
import { STYLES } from "@/lib/constants";
import { useWizardStore } from "@/lib/stores/wizard";
import type { Style } from "@/lib/types";

export function StyleGallery() {
  const router = useRouter();
  const reset = useWizardStore((s) => s.reset);
  const setStyle = useWizardStore((s) => s.setStyle);
  const setPhase = useWizardStore((s) => s.setPhase);
  const setIsTemplateFlow = useWizardStore((s) => s.setIsTemplateFlow);

  const handleSelectStyle = (styleId: Style) => {
    reset();
    setIsTemplateFlow(true);
    setStyle(styleId);
    setPhase("step0"); // Start from room type selection but with style pre-set
    router.push("/app/new");
  };

  return (
    <section className="mt-16">
      <div className="mb-10 flex flex-col items-center text-center gap-2">
        <h2 className="text-3xl font-bold tracking-tight font-display text-foreground sm:text-4xl">
          Start from a photo
        </h2>
        <p className="max-w-lg text-muted-foreground">
          Choose a design style that resonates with you and we'll help you create the perfect layout.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-5">
        {STYLES.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => handleSelectStyle(s.id)}
            className="group flex flex-col items-center gap-4 transition-all"
          >
            <div className="relative h-32 w-32 sm:h-40 sm:w-40">
              {/* Outer ring */}
              <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-primary/20 via-transparent to-primary/20 opacity-0 transition-opacity group-hover:opacity-100" />
              
              <div className="relative h-full w-full overflow-hidden rounded-full border-4 border-background shadow-xl ring-1 ring-border transition-all duration-500 group-hover:scale-[1.02] group-hover:ring-primary/50">
                <img
                  src={s.image}
                  alt={s.label}
                  className="h-full w-full object-cover transition-transform duration-1000 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-black/10 transition-opacity group-hover:opacity-0" />
              </div>
              
              {/* Swatch floating indicator */}
              <div className="absolute -bottom-1 left-1/2 flex -translate-x-1/2 gap-1 rounded-full bg-background/80 p-1.5 shadow-lg backdrop-blur-md border border-border opacity-0 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-1">
                {s.swatches.map((hex) => (
                  <span
                    key={hex}
                    className="h-3 w-3 rounded-full border border-white/20"
                    style={{ backgroundColor: hex }}
                  />
                ))}
              </div>
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors">
                {s.label}
              </h3>
              <p className="mt-0.5 text-[10px] uppercase tracking-widest text-muted-foreground font-medium">
                Explore aesthetic
              </p>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
