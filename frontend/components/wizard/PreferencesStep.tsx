"use client";
import { cn } from "@/lib/utils";
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
        <h2 className="text-xl font-semibold">Any preferences?</h2>
        <p className="mt-1 text-sm text-neutral-500">
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
                  "rounded-full border px-4 py-2 text-sm font-medium transition",
                  isSelected
                    ? "border-neutral-900 bg-neutral-900 text-white"
                    : "border-neutral-300 bg-white text-neutral-700 hover:border-neutral-500",
                  isDisabled && "cursor-not-allowed opacity-40",
                )}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </fieldset>
      <div className="flex justify-between">
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-neutral-500 hover:text-neutral-800"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onGenerate}
          disabled={isGenerating}
          className="rounded-lg bg-neutral-900 px-6 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-40"
        >
          {isGenerating ? "Generating\u2026" : "Generate"}
        </button>
      </div>
    </div>
  );
}
