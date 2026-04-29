"use client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { Preference } from "@/lib/types";

type PreferencesStepProps = {
  value: Preference[];
  onChange: (prefs: Preference[]) => void;
  onGenerate: () => void;
  onBack: () => void;
  isGenerating: boolean;
};

const PREFERENCES: ReadonlyArray<{ id: Preference; label: string }> = [
  { id: "more_seating", label: "More seating" },
  { id: "more_open_space", label: "More open space" },
  { id: "more_storage", label: "More storage" },
];

export default function PreferencesStep({
  value,
  onChange,
  onGenerate,
  onBack,
  isGenerating,
}: PreferencesStepProps) {
  const toggle = (pref: Preference) => {
    if (value.includes(pref)) {
      onChange(value.filter((p) => p !== pref));
    } else if (value.length < 2) {
      onChange([...value, pref]);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight font-display text-foreground">Any preferences?</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Pick up to 2. Skip to let the AI decide.
        </p>
      </div>
      <fieldset>
        <legend className="sr-only">Design preferences</legend>
        <div className="flex flex-wrap gap-3">
          {PREFERENCES.map((p) => {
            const isSelected = value.includes(p.id);
            const isDisabled = !isSelected && value.length >= 2;
            return (
              <button
                key={p.id}
                type="button"
                role="checkbox"
                aria-checked={isSelected}
                disabled={isDisabled}
                onClick={() => toggle(p.id)}
                className={cn(
                  "rounded-full border px-4 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  isSelected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-foreground hover:border-ring hover:bg-muted",
                  isDisabled && "cursor-not-allowed opacity-40",
                )}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </fieldset>
      <div className="flex justify-between items-center mt-2">
        <Button variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button onClick={onGenerate} disabled={isGenerating}>
          {isGenerating ? "Generating\u2026" : "Generate"}
        </Button>
      </div>
    </div>
  );
}
