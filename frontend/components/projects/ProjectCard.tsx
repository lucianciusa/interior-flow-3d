"use client";

import Link from "next/link";
import { Trash2 } from "lucide-react";
import { useState } from "react";

import { useDeleteProject } from "@/lib/api";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { ProjectRecord } from "@/lib/types";

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

export default function ProjectCard({ 
  project,
  selected = false,
  onSelect,
}: { 
  project: ProjectRecord;
  selected?: boolean;
  onSelect?: (val: boolean) => void;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { mutateAsync: deleteProject, isPending } = useDeleteProject();

  const handleDelete = async () => {
    try {
      await deleteProject(project.id);
      setConfirmOpen(false);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <>
      <div className="relative group">
        <Link
          href={`/app/projects/${project.id}`}
          className="block overflow-hidden rounded-xl border border-border transition hover:border-ring hover:shadow-md"
        >
          <div className="aspect-[3/2] w-full bg-gradient-to-br from-muted to-muted/50" />
          <div className="p-4">
            <div className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
              {project.name}
            </div>
            <div className="text-xs text-muted-foreground">{fmtDate(project.created_at)}</div>
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
        title="Delete Project"
        description={`Are you sure you want to delete "${project.name}"? This will permanently remove all rooms and layouts within this project.`}
        onConfirm={handleDelete}
        isLoading={isPending}
      />
    </>
  );
}
