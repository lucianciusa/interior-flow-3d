"use client";

import LayoutCard from "@/components/layouts/LayoutCard";
import type { LayoutSummary } from "@/lib/types";

type Props = {
  layouts: LayoutSummary[];
  projectId: string;
  roomId: string;
  compareIds: string[];
  onToggleCompare: (id: string) => void;
};

export default function LayoutVariantGrid({
  layouts,
  projectId,
  roomId,
  compareIds,
  onToggleCompare,
}: Props) {
  if (layouts.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-neutral-300 p-8 text-center">
        <p className="text-sm text-neutral-500">No layouts yet for this room.</p>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {layouts.map((l) => (
        <LayoutCard
          key={l.id}
          layout={l}
          projectId={projectId}
          roomId={roomId}
          isCompareSelected={compareIds.includes(l.id)}
          onToggleCompare={onToggleCompare}
        />
      ))}
    </div>
  );
}
