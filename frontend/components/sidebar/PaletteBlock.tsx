"use client";
import { useLanguage } from "@/lib/stores/useLanguage";
import type { PaletteMap } from "@/lib/types";

type PaletteBlockProps = { palette: PaletteMap };

export default function PaletteBlock({ palette }: PaletteBlockProps) {
  const { t } = useLanguage();

  const LABELS: Record<keyof PaletteMap, string> = {
    wall: t("wall"),
    floor: t("floor"),
    accent: t("accent"),
  };
  
  // Actually I should add Wall, Floor, Accent to dictionary.
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {t("style_and_palette")}
      </h3>
      <div className="flex flex-col gap-2">
        {(Object.keys(palette) as Array<keyof PaletteMap>).map((key) => (
          <div key={key} className="flex items-center gap-3">
            <span
              className="h-8 w-8 flex-none rounded-md border border-border"
              style={{ backgroundColor: palette[key].hex }}
            />
            <div>
              <p className="text-xs text-muted-foreground capitalize">{LABELS[key]}</p>
              <p className="text-sm font-medium text-foreground">{t(palette[key].name)}</p>
            </div>
            <span className="ml-auto font-mono text-xs text-muted-foreground">
              {palette[key].hex}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
