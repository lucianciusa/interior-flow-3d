"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { catalogQuery, useSwapItem } from "@/lib/api";
import { SLOT_LABELS } from "@/lib/slot-mappings";
import type { ResolvedItem } from "@/lib/types";

const SLOT_KIND_BY_PREFIX: Array<[string, string]> = [
  ["north_wall_", "wall"],
  ["south_wall_", "wall"],
  ["east_wall_", "wall"],
  ["west_wall_", "wall"],
  ["corner_", "corner"],
];

function slotKind(slot: string): string {
  for (const [prefix, kind] of SLOT_KIND_BY_PREFIX) {
    if (slot.startsWith(prefix)) return kind;
  }
  return "floor";
}

type Props = {
  item: ResolvedItem;
  layoutId: string;
  onClose: () => void;
};

export default function SwapPopover({ item, layoutId, onClose }: Props) {
  const catalog = useQuery(catalogQuery());
  const swap = useSwapItem(layoutId);
  const [error, setError] = useState<string | null>(null);

  const kind = slotKind(item.slot);
  const candidates = (catalog.data?.items ?? []).filter(
    (c) => c.id !== item.catalogId && c.allowedSlotKinds.includes(kind),
  );

  const doSwap = async (replacementId: string) => {
    setError(null);
    try {
      await swap.mutateAsync({ catalogId: item.catalogId, replacementId });
      onClose();
    } catch (e: unknown) {
      const status =
        e && typeof e === "object" && "status" in e
          ? (e as { status: number }).status
          : null;
      if (status === 409) setError("That item won't fit at this slot.");
      else setError(e instanceof Error ? e.message : "swap failed");
    }
  };

  return (
    <div className="pointer-events-auto absolute bottom-4 right-4 w-80 rounded-xl border border-neutral-200 bg-white/95 p-4 shadow-lg backdrop-blur-sm">
      <div className="mb-2 flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-neutral-400">Replace</p>
          <p className="font-semibold capitalize">
            {item.catalogId.replace(/_/g, " ")}
          </p>
          <p className="text-xs text-neutral-500">{SLOT_LABELS[item.slot]}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-neutral-400 hover:text-neutral-700"
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      {error && <p className="mb-2 text-xs text-red-600">{error}</p>}

      <ul className="max-h-64 overflow-y-auto">
        {candidates.length === 0 && (
          <li className="text-xs text-neutral-500">No compatible items.</li>
        )}
        {candidates.map((c) => (
          <li key={c.id}>
            <button
              type="button"
              onClick={() => doSwap(c.id)}
              disabled={swap.isPending}
              className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm hover:bg-neutral-100 disabled:opacity-50"
            >
              <span className="capitalize">{c.name}</span>
              <span className="text-xs text-neutral-400">
                {c.footprint.w}×{c.footprint.d}m
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
