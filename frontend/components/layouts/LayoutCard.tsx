"use client";

import Link from "next/link";
import { Trash2 } from "lucide-react";
import { useState } from "react";

import { useDeleteLayout, useUpdateLayout } from "@/lib/api";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { LayoutSummary } from "@/lib/types";

import { useLanguage } from "@/lib/stores/useLanguage";

type Props = {
  layout: LayoutSummary;
  projectId: string;
  roomId: string;
  isCompareSelected: boolean;
  onToggleCompare: (id: string) => void;
  selected?: boolean;
  onSelect?: (val: boolean) => void;
};

export default function LayoutCard({
  layout,
  projectId,
  roomId,
  isCompareSelected,
  onToggleCompare,
  selected = false,
  onSelect,
}: Props) {
  const { t } = useLanguage();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { mutateAsync: deleteLayout, isPending } = useDeleteLayout();
  const updateLayout = useUpdateLayout(layout.id);

  const setPrimary = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (layout.is_primary) return;
    void updateLayout.mutateAsync({ is_primary: true });
  };

  const handleDelete = async () => {
    try {
      await deleteLayout(layout.id);
      setConfirmOpen(false);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <>
      <div
        className={cn(
          "group relative overflow-hidden rounded-xl border transition",
          isCompareSelected
            ? "border-primary ring-2 ring-primary"
            : "border-border hover:border-ring hover:shadow-md",
        )}
      >
        <Link href={`/app/projects/${projectId}/rooms/${roomId}/layouts/${layout.id}`}>
          <div className="aspect-[3/2] w-full bg-muted overflow-hidden">
            {layout.thumbnail_url ? (
              <img 
                src={layout.thumbnail_url} 
                alt={layout.name} 
                className="h-full w-full object-cover transition-transform group-hover:scale-105" 
              />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-muted to-muted/50" />
            )}
          </div>
        </Link>
        
        {/* Selection Checkbox */}
        <div className="absolute top-2 left-2 z-10">
          <input
            type="checkbox"
            checked={selected}
            onChange={(e) => onSelect?.(e.target.checked)}
            className="h-4 w-4 rounded border-border bg-background text-primary focus:ring-ring"
          />
        </div>

        {/* Delete Button */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setConfirmOpen(true);
          }}
          className="absolute top-2 right-2 z-10 rounded-lg bg-background/80 p-2 text-muted-foreground backdrop-blur-sm transition hover:bg-destructive hover:text-destructive-foreground opacity-0 group-hover:opacity-100"
        >
          <Trash2 size={16} />
        </button>

        <div className="flex items-start justify-between gap-2 p-3">
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-foreground">{layout.name}</div>
            <div className="text-xs text-muted-foreground">
              {t(layout.style || "none")}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            {layout.is_primary ? (
              <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-medium uppercase text-primary-foreground">
                {t("primary")}
              </span>
            ) : (
              <button
                type="button"
                onClick={setPrimary}
                className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground hover:bg-muted transition-colors"
              >
                {t("set_primary")}
              </button>
            )}
            <label className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <input
                type="checkbox"
                checked={isCompareSelected}
                onChange={() => onToggleCompare(layout.id)}
              />
              {t("compare")}
            </label>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t("delete_layout")}
        description={t("delete_layout_desc").replace("${name}", layout.name)}
        onConfirm={handleDelete}
        isLoading={isPending}
      />
    </>
  );
}
