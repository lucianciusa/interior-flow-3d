"use client";
import { SLOT_LABELS } from "@/lib/slot-mappings";
import PaletteBlock from "@/components/sidebar/PaletteBlock";
import ExplanationBlock from "@/components/sidebar/ExplanationBlock";
import type { Layout, Style, Preference } from "@/lib/types";

type ResultSidebarProps = {
  layout: Layout;
  style: Style;
  preferences: Preference[];
  onRegenerate?: () => void;
  onAdjust?: () => void;
  onSave?: () => void;
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
  onRegenerate,
  onAdjust,
  onSave,
  saveState = "idle",
}: ResultSidebarProps) {
  return (
    <aside className="flex h-full flex-col gap-6 overflow-y-auto p-4">
      {/* Input chips */}
      <div className="flex flex-wrap gap-2">
        {[STYLE_LABELS[style], ...preferences.map((p) => PREF_LABELS[p])].map(
          (label) => (
            <span
              key={label}
              className="rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-xs font-medium text-neutral-700"
            >
              {label}
            </span>
          ),
        )}
        {layout.warnings.length > 0 && (
          <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
            {layout.warnings.length} warning
            {layout.warnings.length > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Item list */}
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-400">
          Layout
        </h3>
        <ul className="flex flex-col gap-2">
          {layout.items.map((item) => (
            <li key={`${item.catalogId}-${item.slot}`} className="flex flex-col">
              <span className="text-sm font-medium capitalize">
                {item.catalogId.replace(/_/g, " ")}
              </span>
              <span className="text-xs text-neutral-400">
                {SLOT_LABELS[item.slot]}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <PaletteBlock palette={layout.palette} />
      <ExplanationBlock text={layout.designExplanation} />

      {/* Action buttons */}
      <div className="mt-auto flex flex-col gap-2 pt-2">
        {onRegenerate && (
          <button
            type="button"
            onClick={onRegenerate}
            className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-50"
          >
            Regenerate
          </button>
        )}
        {onAdjust && (
          <button
            type="button"
            onClick={onAdjust}
            className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-50"
          >
            Adjust preferences
          </button>
        )}
        {onSave && (
          <button
            type="button"
            onClick={onSave}
            disabled={saveState === "saving" || saveState === "saved"}
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
          >
            {saveState === "saving"
              ? "Saving…"
              : saveState === "saved"
                ? "Saved"
                : "Save"}
          </button>
        )}
      </div>
    </aside>
  );
}
