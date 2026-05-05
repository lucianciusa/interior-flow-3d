"use client";
import { useState } from "react";
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
  onSave?: (name: string) => void;
  onShare?: () => void;
  onCompare?: () => void;
  saveState?: "idle" | "saving" | "saved";
};

import { useLanguage } from "@/lib/stores/useLanguage";

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
  const { t } = useLanguage();

  const STYLE_LABELS: Record<Style, string> = {
    scandinavian: t("scandinavian"),
    minimal: t("minimal"),
    industrial: t("industrial"),
    japandi: t("japandi"),
    mid_century: t("mid_century"),
  };

  const PREF_LABELS: Record<Preference, string> = {
    more_seating: t("more_seating"),
    more_open_space: t("more_open_space"),
    more_storage: t("more_storage"),
  };

  const showRegenerate = mode === "live" && onRegenerate;
  const showAdjust = mode === "live" && onAdjust;
  const showSave = mode === "live" && onSave;
  const showShare = mode === "saved" && onShare;
  const showCompare = mode === "saved" && onCompare;
  const [layoutName, setLayoutName] = useState("");

  const [showWarnings, setShowWarnings] = useState(false);

  return (
    <aside className="flex h-full flex-col gap-6 overflow-y-auto p-4 bg-transparent">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          {[STYLE_LABELS[style], ...preferences.map((p) => PREF_LABELS[p])].map((label) => (
            <span
              key={label}
              className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground"
            >
              {label}
            </span>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {t("layout_title")}
        </h3>
        <ul className="flex flex-col gap-2">
          {layout.items.map((item) => (
            <li key={`${item.catalogId}-${item.slot}`} className="flex flex-col">
              <span className="text-sm font-medium capitalize text-foreground">
                {t(item.catalogId)}
              </span>
              <span className="text-xs text-muted-foreground">{t(item.slot)}</span>
            </li>
          ))}
        </ul>
      </div>

      <PaletteBlock palette={layout.palette} />
      <ExplanationBlock text={layout.designExplanation} />

      <div className="mt-auto flex flex-col gap-2 pt-2">
        {showRegenerate && (
          <Button variant="outline" onClick={onRegenerate}>
            {t("regenerate")}
          </Button>
        )}
        {showAdjust && (
          <Button variant="outline" onClick={onAdjust}>
            {t("adjust_prefs")}
          </Button>
        )}
        {showShare && (
          <Button variant="outline" onClick={onShare}>
            {t("share_link")}
          </Button>
        )}
        {showCompare && (
          <Button variant="outline" onClick={onCompare}>
            {t("compare")}
          </Button>
        )}
        {showSave && (
          <div className="flex flex-col gap-2">
            {saveState === "idle" && (
              <input
                type="text"
                placeholder={t("enter_layout_name")}
                value={layoutName}
                onChange={(e) => setLayoutName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && layoutName.trim()) {
                    onSave?.(layoutName);
                  }
                }}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            )}
            <Button
              onClick={() => onSave?.(layoutName)}
              disabled={saveState === "saving" || saveState === "saved"}
            >
              {saveState === "saving"
                ? t("saving")
                : saveState === "saved"
                  ? t("saved")
                  : t("save")}
            </Button>
          </div>
        )}
      </div>
    </aside>
  );
}
