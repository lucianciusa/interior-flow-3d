"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { RoomDims, RoomType } from "@/lib/types";
import { ROOM_TYPES } from "@/lib/room-types";

type DimensionsStepProps = {
  roomType: RoomType;
  initial: RoomDims;
  onNext: (dims: RoomDims) => void;
  onBack: () => void;
};

import { useLanguage } from "@/lib/stores/useLanguage";

export default function DimensionsStep({ roomType, initial, onNext, onBack }: DimensionsStepProps) {
  const { t } = useLanguage();
  const bounds = ROOM_TYPES[roomType].dim_bounds;
  const schema = z.object({
    width_m: z.number().min(bounds.width_m[0]).max(bounds.width_m[1]),
    length_m: z.number().min(bounds.length_m[0]).max(bounds.length_m[1]),
    height_m: z.number().min(bounds.height_m[0]).max(bounds.height_m[1]),
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RoomDims>({
    resolver: zodResolver(schema),
    defaultValues: initial,
  });

  return (
    <form onSubmit={handleSubmit(onNext)} className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight font-display text-foreground">{t("room_dimensions")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("dimensions_desc")}
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {(
          [
            { name: "width_m", labelKey: "width" },
            { name: "length_m", labelKey: "length" },
            { name: "height_m", labelKey: "height", step: "0.1" },
          ] as const
        ).map(({ name, labelKey, ...rest }) => (
          <div key={name} className="flex flex-col gap-1">
            <label htmlFor={name} className="text-sm font-medium text-foreground">
              {t(labelKey)}
            </label>
            <input
              id={name}
              type="number"
              inputMode="decimal"
              step={"step" in rest ? rest.step : "0.5"}
              {...register(name, { valueAsNumber: true })}
              className={cn(
                "flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                errors[name] ? "border-destructive focus-visible:ring-destructive" : "border-input",
              )}
            />
            <span className="text-xs text-muted-foreground">{`${bounds[name][0]} – ${bounds[name][1]} m`}</span>
            {errors[name] && (
               <span className="text-xs text-destructive">{errors[name]?.message}</span>
            )}
          </div>
        ))}
      </div>
      <div className="flex justify-between items-center w-full">
        <Button type="button" variant="outline" onClick={onBack}>
          {t("back")}
        </Button>
        <Button type="submit" className="self-end">
          {t("next")}
        </Button>
      </div>
    </form>
  );
}
