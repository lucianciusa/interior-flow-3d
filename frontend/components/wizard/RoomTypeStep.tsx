"use client";

import { useLanguage } from "@/lib/stores/useLanguage";
import { Button } from "@/components/ui/button";
import type { RoomType } from "@/lib/types";

const TYPES: { id: RoomType; labelKey: string; }[] = [
  { id: "living_room", labelKey: "living_room" },
  { id: "bedroom", labelKey: "bedroom" },
  { id: "dining_room", labelKey: "dining_room" },
  { id: "home_office", labelKey: "home_office" },
];

type Props = {
  value: RoomType;
  onChange: (v: RoomType) => void;
  onNext: () => void;
  onBack?: () => void;
  backLabel?: string;
};

export default function RoomTypeStep({ value, onChange, onNext, onBack, backLabel }: Props) {
  const { t } = useLanguage();
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight font-display text-foreground">{t("room_type_title")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("room_type_subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {TYPES.map((t_item) => (
          <button
            key={t_item.id}
            type="button"
            onClick={() => onChange(t_item.id)}
            className={`flex flex-col items-start justify-center p-4 rounded-xl border-2 transition-all cursor-pointer ${
              value === t_item.id
                ? "border-primary bg-primary/5 shadow-sm"
                : "border-border bg-card hover:border-primary/30 hover:bg-accent/50"
            }`}
          >
            <span className="font-medium text-foreground">{t(t_item.labelKey)}</span>
          </button>
        ))}
      </div>

      <div className="flex justify-between items-center pt-4">
        {onBack ? (
          <Button variant="ghost" onClick={onBack}>
            {backLabel ?? t("back")}
          </Button>
        ) : (
          <div />
        )}
        <Button onClick={onNext}>{t("next")}</Button>
      </div>
    </div>
  );
}
