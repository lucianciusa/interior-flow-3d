"use client";

import { TemplateGallery } from "@/components/templates/TemplateGallery";
import { StyleGallery } from "@/components/templates/StyleGallery";
import { useLanguage } from "@/lib/stores/useLanguage";

export default function TemplatesPage() {
  const { t } = useLanguage();
  return (
    <div className="w-full space-y-12 pb-20">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight font-display text-foreground sm:text-4xl">
          {t("start_from_template")}
        </h1>
        <p className="text-muted-foreground max-w-2xl text-lg">
          {t("quick_generate_desc")}
        </p>
      </div>

      <TemplateGallery />
      
      <div className="border-t border-border pt-12">
        <StyleGallery />
      </div>
    </div>
  );
}
