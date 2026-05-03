"use client";

import { useLanguage } from "@/lib/stores/useLanguage";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return (
    <Button
      variant="ghost"
      size="sm"
      className="w-10 px-0 font-medium text-xs"
      onClick={() => setLanguage(language === "en" ? "es" : "en")}
    >
      {language === "en" ? "EN" : "ES"}
    </Button>
  );
}
