"use client";

import { useLanguage } from "@/lib/stores/useLanguage";

export function Footer() {
  const { t } = useLanguage();
  return (
    <footer className="border-t border-border py-8 px-6 text-center">
      <p className="text-xs text-muted-foreground">
        {t("footer_tagline")}
      </p>
    </footer>
  );
}
