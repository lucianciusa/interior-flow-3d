"use client";
import { useLanguage } from "@/lib/stores/useLanguage";

type ExplanationBlockProps = { text: string };

export default function ExplanationBlock({ text }: ExplanationBlockProps) {
  const { t } = useLanguage();
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {t("design_rationale")}
      </h3>
      <p className="text-sm italic leading-relaxed text-foreground">{text}</p>
    </div>
  );
}
