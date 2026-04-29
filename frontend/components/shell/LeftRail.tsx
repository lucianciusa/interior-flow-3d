import Link from "next/link";
import { LayoutDashboard, Settings, User } from "lucide-react";

export function LeftRail() {
  return (
    <nav className="flex w-16 flex-col items-center justify-between border-r bg-muted/40 py-4">
      <div className="flex flex-col items-center gap-4">
        {/* Placeholder Logo */}
        <Link
          href="/app"
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-all hover:ring-2 hover:ring-ring hover:ring-offset-2"
        >
          <LayoutDashboard size={20} />
        </Link>
        
        {/* Nav Items */}
        <div className="flex flex-col gap-2 mt-4">
          <Link
            href="/app"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <LayoutDashboard size={20} />
          </Link>
        </div>
      </div>

      <div className="flex flex-col items-center gap-4">
        {/* Placeholder for future links. E.g. templates, gallery */}
      </div>
    </nav>
  );
}