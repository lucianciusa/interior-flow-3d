import Link from "next/link";
import { ThemeToggle } from "@/components/shell/ThemeToggle";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Top nav strip */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/80 backdrop-blur px-6">
        <Link href="/" className="text-sm font-bold tracking-tight font-display text-foreground">
          Interior Flow 3D
        </Link>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <Link
            href="/app"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Sign in
          </Link>
        </div>
      </header>

      {/* Page content */}
      <div className="flex-1">{children}</div>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-6 text-center">
        <p className="text-xs text-muted-foreground">
          Interior Flow 3D — AI-powered interior design copilot. Free during beta.
        </p>
      </footer>
    </div>
  );
}
