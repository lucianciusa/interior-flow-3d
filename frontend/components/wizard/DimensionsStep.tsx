"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { RoomDims } from "@/lib/types";

const schema = z.object({
  width_m: z.number().min(2).max(12),
  length_m: z.number().min(2).max(12),
  height_m: z.number().min(2.2).max(4),
});

type DimensionsStepProps = {
  initial: RoomDims;
  onNext: (dims: RoomDims) => void;
};

export default function DimensionsStep({ initial, onNext }: DimensionsStepProps) {
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
        <h2 className="text-xl font-semibold tracking-tight font-display text-foreground">Room dimensions</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter approximate measurements in metres.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {(
          [
            { name: "width_m", label: "Width", hint: "2 – 12 m" },
            { name: "length_m", label: "Length", hint: "2 – 12 m" },
            { name: "height_m", label: "Height", hint: "2.2 – 4 m", step: "0.1" },
          ] as const
        ).map(({ name, label, hint, ...rest }) => (
          <div key={name} className="flex flex-col gap-1">
            <label htmlFor={name} className="text-sm font-medium text-foreground">
              {label}
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
            <span className="text-xs text-muted-foreground">{hint}</span>
            {errors[name] && (
               <span className="text-xs text-destructive">{errors[name]?.message}</span>
            )}
          </div>
        ))}
      </div>
      <Button type="submit" className="self-end">
        Next
      </Button>
    </form>
  );
}
