import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";

interface LockBadgeProps {
  className?: string;
  size?: "sm" | "default";
}

export function LockBadge({ className, size = "default" }: LockBadgeProps) {
  const iconSize = size === "sm" ? 10 : 12;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-primary text-primary-foreground font-semibold",
        size === "sm" ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-0.5 text-[10px]",
        className,
      )}
    >
      <Lock size={iconSize} className="opacity-80" />
      Pro
    </span>
  );
}
