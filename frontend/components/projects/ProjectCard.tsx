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

import { useLanguage } from "@/lib/stores/useLanguage";

export default function ProjectCard({ 
  project,
  selected = false,
  onSelect,
}: { 
  project: ProjectRecord;
  selected?: boolean;
  onSelect?: (val: boolean) => void;
}) {
  const { t } = useLanguage();
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

  const HOUSE_IMAGES = [
    "https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=800",
  ];

  // Deterministic fallback based on project ID
  const fallbackIndex = project.id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) % HOUSE_IMAGES.length;
  const fallback = HOUSE_IMAGES[fallbackIndex];

  return (
    <>
      <div className="relative group">
        <Link
          href={`/app/projects/${project.id}`}
          className="block overflow-hidden rounded-[14px] border border-border transition-shadow duration-150 hover:border-ring hover:shadow-[0_4px_16px_rgba(20,20,26,0.08)]"
        >
          <div className="aspect-[3/2] w-full bg-muted overflow-hidden">
            <img 
              src={project.thumbnail_url || fallback} 
              alt={project.name} 
              className="h-full w-full object-cover transition-transform group-hover:scale-105" 
            />
          </div>
          <div className="p-4">
            <div className="text-sm font-medium font-display tracking-tight text-foreground group-hover:text-primary transition-colors">
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
        title={t("delete_project")}
        description={t("delete_project_desc").replace("${name}", project.name)}
        onConfirm={handleDelete}
        isLoading={isPending}
      />
    </>
  );
}
