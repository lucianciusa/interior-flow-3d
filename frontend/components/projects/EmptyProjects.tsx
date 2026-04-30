"use client";

import { EmptyState } from "@/components/ui/empty-state";
import { EmptyProjectsIllustration } from "@/components/ui/illustrations/EmptyProjects";
import { Button } from "@/components/ui/button";

export default function EmptyProjects({ onCreate }: { onCreate: () => void }) {
  return (
    <EmptyState
      illustration={<EmptyProjectsIllustration />}
      title="No tienes proyectos guardados"
      description="Un proyecto agrupa tus habitaciones y variantes de diseño. Crea uno para empezar o elige una plantilla a continuación."
      cta={<Button onClick={onCreate}>Crear tu primer proyecto</Button>}
    />
  );
}
