"use client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { Style } from "@/lib/types";

type StyleStepProps = {
  value: Style | null;
  onChange: (style: Style) => void;
  onNext: () => void;
  onBack: () => void;
};

const STYLES: ReadonlyArray<{
  id: Style;
  label: string;
  tagline: string;
  gradient: string;
  swatches: [string, string, string];
}> = [
  {
    id: "scandinavian",
    label: "Scandinavian",
    tagline: "Light woods, soft textiles, cozy warmth",
    gradient: "from-[#F4F1EC] via-[#D6BFA0] to-[#A7B79A]",
    swatches: ["#F4F1EC", "#D6BFA0", "#A7B79A"],
  },
  {
    id: "minimal",
    label: "Minimal",
    tagline: "Calm surfaces, intentional negative space",
    gradient: "from-[#FAFAFA] via-[#E5E5E5] to-[#1A1A1A]",
    swatches: ["#FAFAFA", "#E5E5E5", "#1A1A1A"],
  },
  {
    id: "industrial",
    label: "Industrial",
    tagline: "Raw metal, concrete, exposed structure",
    gradient: "from-[#C4C0BA] via-[#3A3A3A] to-[#C8943A]",
    swatches: ["#C4C0BA", "#3A3A3A", "#C8943A"],
  },
];

export default function StyleStep({ value, onChange, onNext, onBack }: StyleStepProps) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight font-display text-foreground">Choose a style</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          The AI will honour this aesthetic throughout.
        </p>
      </div>
      <div
        role="radiogroup"
        aria-label="Design style"
        className="grid grid-cols-1 gap-4 sm:grid-cols-3"
      >
        {STYLES.map((s) => (
          <button
            key={s.id}
            type="button"
            role="radio"
            aria-checked={value === s.id}
            onClick={() => onChange(s.id)}
            className={cn(
              "flex flex-col overflow-hidden rounded-xl border-2 text-left transition bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              value === s.id
                ? "border-primary ring-2 ring-primary/20"
                : "border-border hover:border-ring",
            )}
          >
            <div className={cn("h-28 w-full bg-gradient-to-br", s.gradient)} />
            <div className="p-3">
              <p className="font-semibold text-foreground">{s.label}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{s.tagline}</p>
              <div className="mt-2 flex gap-1">
                {s.swatches.map((hex) => (
                  <span
                    key={hex}
                    className="h-4 w-4 rounded-full border border-border shadow-sm"
                    style={{ backgroundColor: hex }}
                  />
                ))}
              </div>
            </div>
          </button>
        ))}
      </div>
      <div className="flex justify-between items-center mt-2">
        <Button variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button onClick={onNext} disabled={!value}>
          Next
        </Button>
      </div>
    </div>
  );
}
