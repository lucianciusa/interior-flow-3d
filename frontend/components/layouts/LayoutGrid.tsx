"use client";

import LayoutCard from "@/components/layouts/LayoutCard";
import type { LayoutSummary } from "@/lib/types";

export default function LayoutGrid({
  layouts,
  selectedIds,
  onToggle,
}: {
  layouts: LayoutSummary[];
  selectedIds: Set<string>;
  onToggle: (id: string, val: boolean) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {layouts.map((l) => (
        <LayoutCard
          key={l.id}
          layout={l}
          selected={selectedIds.has(l.id)}
          onSelect={(val) => onToggle(l.id, val)}
        />
      ))}
    </div>
  );
}
