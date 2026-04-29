"use client";

import ProjectCard from "@/components/projects/ProjectCard";
import type { ProjectRecord } from "@/lib/types";

export default function ProjectGrid({ projects }: { projects: ProjectRecord[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {projects.map((p) => (
        <ProjectCard key={p.id} project={p} />
      ))}
    </div>
  );
}
