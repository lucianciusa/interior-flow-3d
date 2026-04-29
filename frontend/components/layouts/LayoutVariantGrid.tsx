"use client";

import LayoutCard from "@/components/layouts/LayoutCard";
import type { LayoutSummary } from "@/lib/types";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyLayoutsIllustration } from "@/components/ui/illustrations/EmptyLayouts";

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
      <EmptyState
        illustration={<EmptyLayoutsIllustration />}
        title="No layouts yet"
        description="Generate your first 3D layout to see it here."
      />
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
