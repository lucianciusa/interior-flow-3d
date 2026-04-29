import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  illustration: ReactNode;
  title: string;
  description: string;
  cta: ReactNode;
  className?: string;
}

export function EmptyState({
  illustration,
  title,
  description,
  cta,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-border p-12 text-center",
        className,
      )}
    >
      <div className="mb-4 text-muted-foreground">{illustration}</div>
      <h2 className="text-lg font-semibold tracking-tight font-display text-foreground">
        {title}
      </h2>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">{description}</p>
      <div className="mt-6">{cta}</div>
    </div>
  );
}
