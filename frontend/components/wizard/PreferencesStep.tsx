"use client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { Preference } from "@/lib/types";

type PreferencesStepProps = {
  value: Preference[];
  onChange: (prefs: Preference[]) => void;
  onGenerate: () => void;
  onBack: () => void;
  onBackToResult?: () => void;
  isGenerating: boolean;
};

import { useLanguage } from "@/lib/stores/useLanguage";

const PREFERENCES: ReadonlyArray<{ id: Preference }> = [
  { id: "more_seating" },
  { id: "more_open_space" },
  { id: "more_storage" },
];

export default function PreferencesStep({
  value,
  onChange,
  onGenerate,
  onBack,
  onBackToResult,
  isGenerating,
}: PreferencesStepProps) {
  const { t } = useLanguage();
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
        <h2 className="text-xl font-semibold tracking-tight font-display text-foreground">{t("any_preferences")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("preferences_desc")}
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
                {t(p.id)}
              </button>
            );
          })}
        </div>
      </fieldset>
      <div className="flex flex-col gap-2 mt-2">
        <div className="flex justify-between items-center">
          <Button variant="ghost" onClick={onBack}>
            {t("back")}
          </Button>
          <Button onClick={onGenerate} disabled={isGenerating}>
            {isGenerating ? t("generating") : t("generate")}
          </Button>
        </div>
        {onBackToResult && (
          <div className="flex justify-center">
            <Button variant="link" size="sm" className="text-muted-foreground" onClick={onBackToResult}>
              {t("back_to_result")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
