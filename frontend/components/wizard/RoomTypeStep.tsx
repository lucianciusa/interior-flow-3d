"use client";

import type { RoomType } from "@/lib/types";
import { Button } from "@/components/ui/button";

const TYPES: { id: RoomType; label: string; }[] = [
  { id: "living_room", label: "Living Room" },
  { id: "bedroom", label: "Bedroom" },
  { id: "dining_room", label: "Dining Room" },
  { id: "home_office", label: "Home Office" },
];

type Props = {
  value: RoomType;
  onChange: (v: RoomType) => void;
  onNext: () => void;
};

export default function RoomTypeStep({ value, onChange, onNext }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight font-display text-foreground">Room Type</h2>
        <p className="mt-1 text-sm text-muted-foreground">What kind of room are you designing?</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {TYPES.map((t) => (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={`flex flex-col items-start justify-center p-4 rounded-xl border-2 transition-all ${
              value === t.id
                ? "border-primary bg-primary/5 shadow-sm"
                : "border-border bg-card hover:border-primary/30 hover:bg-accent/50"
            }`}
          >
            <span className="font-medium text-foreground">{t.label}</span>
          </button>
        ))}
      </div>

      <div className="flex justify-end pt-4">
        <Button onClick={onNext}>Next</Button>
      </div>
    </div>
  );
}
