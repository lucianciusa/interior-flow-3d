"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { cn } from "@/lib/utils";
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
        <h2 className="text-xl font-semibold">Room dimensions</h2>
        <p className="mt-1 text-sm text-neutral-500">
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
            <label htmlFor={name} className="text-sm font-medium">
              {label}
            </label>
            <input
              id={name}
              type="number"
              inputMode="decimal"
              step={"step" in rest ? rest.step : "0.5"}
              {...register(name, { valueAsNumber: true })}
              className={cn(
                "rounded-md border px-3 py-2 text-sm",
                errors[name] ? "border-red-500" : "border-neutral-300",
              )}
            />
            <span className="text-xs text-neutral-400">{hint}</span>
            {errors[name] && (
              <span className="text-xs text-red-500">{errors[name]?.message}</span>
            )}
          </div>
        ))}
      </div>
      <button
        type="submit"
        className="self-end rounded-lg bg-neutral-900 px-6 py-2 text-sm font-medium text-white hover:bg-neutral-700"
      >
        Next
      </button>
    </form>
  );
}
