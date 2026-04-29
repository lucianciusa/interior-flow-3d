"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { X } from "lucide-react";

import { catalogQuery, useSwapItem } from "@/lib/api";
import { SLOT_LABELS } from "@/lib/slot-mappings";
import { ROOM_TYPES } from "@/lib/room-types";
import type { ResolvedItem, RoomType } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { LockBadge } from "@/components/ui/lock-badge";
import { UpgradeModal } from "@/components/ui/upgrade-modal";

type Props = {
  item: ResolvedItem;
  layoutId: string;
  roomType: RoomType;
  onClose: () => void;
};

export default function SwapPopover({ item, layoutId, roomType, onClose }: Props) {
  const catalog = useQuery(catalogQuery());
  const swap = useSwapItem(layoutId);
  const [error, setError] = useState<string | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const acceptedTags = ROOM_TYPES[roomType].slot_accepted_tags[item.slot] || [];
  const candidates = (catalog.data?.items ?? []).filter(
    (c) => 
      c.id !== item.catalogId && 
      c.room_types.includes(roomType) &&
      c.tags.some((tag) => acceptedTags.includes(tag))
  );

  const doSwap = async (c: any) => {
    if (c.is_premium) {
      setUpgradeOpen(true);
      return;
    }
    setError(null);
    try {
      await swap.mutateAsync({ catalogId: item.catalogId, replacementId: c.id });
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
    <>
      <div className="pointer-events-auto absolute bottom-16 left-1/2 -translate-x-1/2 w-80 rounded-xl border border-border bg-card/95 p-4 shadow-xl backdrop-blur-sm">
        <div className="mb-2 flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Replace</p>
            <p className="font-semibold text-foreground capitalize">
              {item.catalogId.replace(/_/g, " ")}
            </p>
            <p className="text-xs text-muted-foreground">{SLOT_LABELS[item.slot]}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 ml-2 text-muted-foreground hover:text-foreground shrink-0"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {error && <p className="mb-2 text-xs text-destructive">{error}</p>}

        <ul className="max-h-64 overflow-y-auto pr-2">
          {candidates.length === 0 && (
            <li className="text-xs text-muted-foreground">No compatible items.</li>
          )}
          {candidates.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => doSwap(c)}
                disabled={swap.isPending && !c.is_premium}
                className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset disabled:opacity-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="capitalize text-foreground font-medium">{c.name}</span>
                  {c.is_premium && <LockBadge size="sm" />}
                </div>
                <span className="text-xs text-muted-foreground">
                  {c.footprint.w}×{c.footprint.d}m
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
      <UpgradeModal open={upgradeOpen} onOpenChange={setUpgradeOpen} />
    </>
  );
}
