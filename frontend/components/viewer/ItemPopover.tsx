"use client";

import { useViewerStore } from "@/lib/stores/viewer";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useLanguage } from "@/lib/stores/useLanguage";

export default function ItemPopover() {
  const { t } = useLanguage();
  const item = useViewerStore((s) => s.selectedItem);
  const clear = useViewerStore((s) => s.setSelectedItem);

  if (!item) return null;

  return (
    <div className="pointer-events-auto absolute bottom-4 left-4 w-72 rounded-xl border border-border bg-card/95 p-4 shadow-lg backdrop-blur-sm">
      <div className="mb-1 flex items-start justify-between">
        <p className="font-semibold text-foreground leading-tight capitalize">
          {t(item.catalogId)}
        </p>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 ml-2 text-muted-foreground hover:text-foreground shrink-0"
          onClick={() => clear(null)}
          aria-label={t("close")}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <p className="mb-2 text-xs text-muted-foreground">{t(item.slot)}</p>
      <p className="mb-2 text-xs text-muted-foreground">
        {item.footprint.w}m × {item.footprint.d}m × {item.footprint.h}m
      </p>
      {item.rationale && <p className="text-sm italic text-foreground">{item.rationale}</p>}
    </div>
  );
}
