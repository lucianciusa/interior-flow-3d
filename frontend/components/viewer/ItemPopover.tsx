"use client";

import { useViewerStore } from "@/lib/stores/viewer";
import { SLOT_LABELS } from "@/lib/slot-mappings";

export default function ItemPopover() {
  const item = useViewerStore((s) => s.selectedItem);
  const clear = useViewerStore((s) => s.setSelectedItem);

  if (!item) return null;

  return (
    <div className="pointer-events-auto absolute bottom-4 left-4 w-72 rounded-xl border border-neutral-200 bg-white/95 p-4 shadow-lg backdrop-blur-sm">
      <div className="mb-1 flex items-start justify-between">
        <p className="font-semibold leading-tight capitalize">
          {item.catalogId.replace(/_/g, " ")}
        </p>
        <button
          type="button"
          onClick={() => clear(null)}
          className="ml-2 text-neutral-400 hover:text-neutral-700"
          aria-label="Close"
        >
          ✕
        </button>
      </div>
      <p className="mb-2 text-xs text-neutral-500">{SLOT_LABELS[item.slot]}</p>
      <p className="mb-2 text-xs text-neutral-500">
        {item.footprint.w}m × {item.footprint.d}m × {item.footprint.h}m
      </p>
      {item.rationale && <p className="text-sm italic text-neutral-700">{item.rationale}</p>}
    </div>
  );
}
