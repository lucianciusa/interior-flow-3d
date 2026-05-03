import Link from "next/link";
import { ThemeToggle } from "@/components/shell/ThemeToggle";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { LanguageToggle } from "@/components/shell/LanguageToggle";
import { Footer } from "@/components/marketing/Footer";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Top nav strip */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/80 backdrop-blur px-6">
        <Link href="/" className="text-sm font-bold tracking-tight font-display text-foreground">
          Interior Flow 3D
        </Link>
        <div className="flex items-center gap-4">
          <LanguageToggle />
          <ThemeToggle />
          <MarketingNav />
        </div>
      </header>

      {/* Page content */}
      <div className="flex-1">{children}</div>

      {/* Footer */}
      <Footer />
    </div>
  );
}
