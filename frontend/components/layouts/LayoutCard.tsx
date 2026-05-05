"use client";

import Link from "next/link";
import { Trash2 } from "lucide-react";
import { useState } from "react";

import { useDeleteLayout } from "@/lib/api";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { LayoutSummary } from "@/lib/types";
import { useLanguage } from "@/lib/stores/useLanguage";

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
}

export default function LayoutCard({
  layout,
  selected = false,
  onSelect,
  projectId,
  roomId,
  isCompareSelected,
  onToggleCompare,
}: {
  layout: LayoutSummary;
  selected?: boolean;
  onSelect?: (val: boolean) => void;
  projectId?: string;
  roomId?: string;
  isCompareSelected?: boolean;
  onToggleCompare?: (id: string) => void;
}) {
  const { t } = useLanguage();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { mutateAsync: deleteLayout, isPending } = useDeleteLayout();

  const handleDelete = async () => {
    try {
      await deleteLayout(layout.id);
      setConfirmOpen(false);
    } catch (e) {
      console.error(e);
    }
  };

  const fallback = "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&q=80&w=800";

  return (
    <>
      <div className="relative group">
        <Link
          href={`/app/projects/${layout.project_id}/rooms/${layout.room_id}/layouts/${layout.id}`}
          className="block overflow-hidden rounded-[14px] border border-border transition-shadow duration-150 hover:border-ring hover:shadow-[0_4px_16px_rgba(20,20,26,0.08)]"
        >
          <div className="aspect-[3/2] w-full bg-muted overflow-hidden">
            <img
              src={layout.thumbnail_url || fallback}
              alt={layout.name}
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
            />
          </div>
          <div className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-sm font-medium font-display tracking-tight text-foreground group-hover:text-primary transition-colors">
                  {layout.name}
                </div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">
                  {t(layout.room_type || "")} • {t(layout.style)}
                </div>
              </div>
            </div>
            <div className="text-[10px] text-muted-foreground mt-2">{fmtDate(layout.created_at)}</div>
          </div>
        </Link>

        {/* Checkbox */}
        <div className="absolute top-2 left-2 z-10">
          <input
            type="checkbox"
            checked={selected}
            onChange={(e) => onSelect?.(e.target.checked)}
            className="h-4 w-4 rounded border-border bg-background text-primary focus:ring-ring"
          />
        </div>

        {/* Delete button */}
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
