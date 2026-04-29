"use client";

import Link from "next/link";

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

export default function ProjectCard({ project }: { project: ProjectRecord }) {
  return (
    <Link
      href={`/app/projects/${project.id}`}
      className="group block overflow-hidden rounded-xl border border-border transition hover:border-ring hover:shadow-md"
    >
      <div className="aspect-[3/2] w-full bg-gradient-to-br from-muted to-muted/50" />
      <div className="p-4">
        <div className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
          {project.name}
        </div>
        <div className="text-xs text-muted-foreground">{fmtDate(project.created_at)}</div>
      </div>
    </Link>
  );
}
