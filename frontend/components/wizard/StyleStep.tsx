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

import { STYLES } from "@/lib/constants";

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
              "group flex flex-col overflow-hidden rounded-xl border-2 text-left transition bg-card cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              value === s.id
                ? "border-primary ring-2 ring-primary/20"
                : "border-border hover:border-ring",
            )}
          >
            <div className="relative h-32 w-full overflow-hidden">
              <img
                src={s.image}
                alt={s.label}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
            </div>
            <div className="p-3">
              <p className="font-semibold text-foreground">{s.label}</p>
              <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{s.tagline}</p>
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
