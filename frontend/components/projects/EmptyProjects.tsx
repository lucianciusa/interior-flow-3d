"use client";

import { EmptyState } from "@/components/ui/empty-state";
import { EmptyProjectsIllustration } from "@/components/ui/illustrations/EmptyProjects";
import { Button } from "@/components/ui/button";

import { useLanguage } from "@/lib/stores/useLanguage";

export default function EmptyProjects({ onCreate }: { onCreate: () => void }) {
  const { t } = useLanguage();
  return (
    <EmptyState
      illustration={<EmptyProjectsIllustration />}
      title={t("no_projects_yet")}
      description={t("create_first_project")}
      cta={<Button onClick={onCreate}>{t("new_project_btn")}</Button>}
    />
  );
}
