"use client";

import { EmptyState } from "@/components/ui/empty-state";
import { EmptyProjectsIllustration } from "@/components/ui/illustrations/EmptyProjects";
import { Button } from "@/components/ui/button";

export default function EmptyProjects({ onCreate }: { onCreate: () => void }) {
  return (
    <EmptyState
      illustration={<EmptyProjectsIllustration />}
      title="No projects yet"
      description="A project groups your rooms and layout variants. Create one to get started, or pick a template below."
      cta={<Button onClick={onCreate}>Create your first project</Button>}
    />
  );
}
