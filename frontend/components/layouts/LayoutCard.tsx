"use client";

import Link from "next/link";

import { useUpdateLayout } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { LayoutSummary } from "@/lib/types";

const STYLE_LABELS: Record<string, string> = {
  scandinavian: "Scandinavian",
  minimal: "Minimal",
  industrial: "Industrial",
};

type Props = {
  layout: LayoutSummary;
  projectId: string;
  roomId: string;
  isCompareSelected: boolean;
  onToggleCompare: (id: string) => void;
};

export default function LayoutCard({
  layout,
  projectId,
  roomId,
  isCompareSelected,
  onToggleCompare,
}: Props) {
  const updateLayout = useUpdateLayout(layout.id);

  const setPrimary = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (layout.is_primary) return;
    void updateLayout.mutateAsync({ is_primary: true });
  };

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border transition",
        isCompareSelected
          ? "border-neutral-900 ring-2 ring-neutral-900"
          : "border-neutral-200 hover:border-neutral-400 hover:shadow-sm",
      )}
    >
      <Link href={`/app/projects/${projectId}/rooms/${roomId}/layouts/${layout.id}`}>
        <div className="aspect-[3/2] w-full bg-gradient-to-br from-neutral-100 to-neutral-200" />
      </Link>
      <div className="flex items-start justify-between gap-2 p-3">
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{layout.name}</div>
          <div className="text-xs text-neutral-500">
            {STYLE_LABELS[layout.style] ?? layout.style}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          {layout.is_primary ? (
            <span className="rounded-full bg-neutral-900 px-2 py-0.5 text-[10px] font-medium uppercase text-white">
              Primary
            </span>
          ) : (
            <button
              type="button"
              onClick={setPrimary}
              className="rounded-full border border-neutral-300 px-2 py-0.5 text-[10px] text-neutral-600 hover:bg-neutral-50"
            >
              Set primary
            </button>
          )}
          <label className="flex items-center gap-1 text-[10px] text-neutral-500">
            <input
              type="checkbox"
              checked={isCompareSelected}
              onChange={() => onToggleCompare(layout.id)}
            />
            Compare
          </label>
        </div>
      </div>
    </div>
  );
}
