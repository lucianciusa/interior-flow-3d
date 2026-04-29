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
      className="block overflow-hidden rounded-xl border border-neutral-200 transition hover:border-neutral-400 hover:shadow-sm"
    >
      <div className="aspect-[3/2] w-full bg-gradient-to-br from-neutral-100 to-neutral-200" />
      <div className="p-4">
        <div className="text-sm font-medium">{project.name}</div>
        <div className="text-xs text-neutral-500">{fmtDate(project.created_at)}</div>
      </div>
    </Link>
  );
}
