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
  selectedIds: Set<string>;
  onToggleSelection: (id: string, val: boolean) => void;
};

import { useLanguage } from "@/lib/stores/useLanguage";

export default function LayoutVariantGrid({
  layouts,
  projectId,
  roomId,
  compareIds,
  onToggleCompare,
  selectedIds,
  onToggleSelection,
}: Props) {
  const { t } = useLanguage();
  if (layouts.length === 0) {
    return (
      <EmptyState
        illustration={<EmptyLayoutsIllustration />}
        title={t("no_layouts_yet")}
        description={t("add_layout_desc")}
        cta={<></>}
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
          selected={selectedIds.has(l.id)}
          onSelect={(val) => onToggleSelection(l.id, val)}
        />
      ))}
    </div>
  );
}
