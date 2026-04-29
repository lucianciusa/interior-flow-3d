"use client";
import { SLOT_LABELS } from "@/lib/slot-mappings";
import PaletteBlock from "@/components/sidebar/PaletteBlock";
import ExplanationBlock from "@/components/sidebar/ExplanationBlock";
import { Button } from "@/components/ui/button";
import type { Layout, Style, Preference } from "@/lib/types";
import type { ResultViewMode } from "@/components/result/ResultView";

type ResultSidebarProps = {
  layout: Layout;
  style: Style;
  preferences: Preference[];
  mode?: ResultViewMode;
  onRegenerate?: () => void;
  onAdjust?: () => void;
  onSave?: () => void;
  onShare?: () => void;
  onCompare?: () => void;
  saveState?: "idle" | "saving" | "saved";
};

const STYLE_LABELS: Record<Style, string> = {
  scandinavian: "Scandinavian",
  minimal: "Minimal",
  industrial: "Industrial",
};

const PREF_LABELS: Record<Preference, string> = {
  more_seating: "More seating",
  more_open_space: "More open space",
  more_storage: "More storage",
};

export default function ResultSidebar({
  layout,
  style,
  preferences,
  mode = "live",
  onRegenerate,
  onAdjust,
  onSave,
  onShare,
  onCompare,
  saveState = "idle",
}: ResultSidebarProps) {
  const showRegenerate = mode === "live" && onRegenerate;
  const showAdjust = mode === "live" && onAdjust;
  const showSave = mode === "live" && onSave;
  const showShare = mode === "saved" && onShare;
  const showCompare = mode === "saved" && onCompare;

  return (
    <aside className="flex h-full flex-col gap-6 overflow-y-auto p-4 bg-background">
      <div className="flex flex-wrap gap-2">
        {[STYLE_LABELS[style], ...preferences.map((p) => PREF_LABELS[p])].map((label) => (
          <span
            key={label}
            className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground"
          >
            {label}
          </span>
        ))}
        {layout.warnings.length > 0 && (
          <span className="rounded-full border border-destructive/20 bg-destructive/5 px-3 py-1 text-xs font-medium text-destructive">
            {layout.warnings.length} warning
            {layout.warnings.length > 1 ? "s" : ""}
          </span>
        )}
      </div>

      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Layout
        </h3>
        <ul className="flex flex-col gap-2">
          {layout.items.map((item) => (
            <li key={`${item.catalogId}-${item.slot}`} className="flex flex-col">
              <span className="text-sm font-medium capitalize text-foreground">
                {item.catalogId.replace(/_/g, " ")}
              </span>
              <span className="text-xs text-muted-foreground">{SLOT_LABELS[item.slot]}</span>
            </li>
          ))}
        </ul>
      </div>

      <PaletteBlock palette={layout.palette} />
      <ExplanationBlock text={layout.designExplanation} />

      <div className="mt-auto flex flex-col gap-2 pt-2">
        {showRegenerate && (
          <Button variant="outline" onClick={onRegenerate}>
            Regenerate
          </Button>
        )}
        {showAdjust && (
          <Button variant="outline" onClick={onAdjust}>
            Adjust preferences
          </Button>
        )}
        {showShare && (
          <Button variant="outline" onClick={onShare}>
            Share link
          </Button>
        )}
        {showCompare && (
          <Button variant="outline" onClick={onCompare}>
            Compare
          </Button>
        )}
        {showSave && (
          <Button
            onClick={onSave}
            disabled={saveState === "saving" || saveState === "saved"}
          >
            {saveState === "saving"
              ? "Saving…"
              : saveState === "saved"
                ? "Saved"
                : "Save"}
          </Button>
        )}
      </div>
    </aside>
  );
}
