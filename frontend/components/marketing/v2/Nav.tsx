"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/lib/stores/auth";
import { supabase } from "@/lib/supabase";
import LoginModal from "@/components/auth/LoginModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User, LayoutDashboard, LogOut } from "lucide-react";
import { LanguageToggle } from "@/components/shell/LanguageToggle";
import type { marketingTranslations } from "@/lib/marketing-translations";

export function Nav({ t }: { t: typeof marketingTranslations.en.nav | typeof marketingTranslations.es.nav }) {
  const session = useAuthStore((s) => s.session);
  const ready = useAuthStore((s) => s.ready);
  const [loginOpen, setLoginOpen] = useState(false);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <nav className="nav">
      <div className="container nav-inner">
        <Link href="#top" className="nav-brand">
          <span className="nav-brand-mark" />
          Interior&nbsp;Flow&nbsp;3D
          <span className="nav-pill">v1.0</span>
        </Link>
        <div className="nav-links">
          <a href="#wizard">{t.wizard}</a>
          <a href="#styles">{t.styles}</a>
          <a href="#rooms">{t.rooms}</a>
          <a href="#how">{t.how}</a>
          <a href="#hierarchy">{t.projects}</a>
          <a href="#pricing">{t.pricing}</a>
        </div>
        <div className="nav-cta">
          <LanguageToggle />
          <ThemeToggle />

          {!ready ? (
            <div className="w-[80px]" /> // Spacer to avoid layout shift
          ) : session ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="btn btn-text btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <User size={14} />
                {t.account}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => window.location.href = "/app"} className="flex items-center gap-2 cursor-pointer w-full">
                  <LayoutDashboard size={14} />
                  {t.dashboard}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="flex items-center gap-2 text-red-600 focus:text-red-600 cursor-pointer">
                  <LogOut size={14} />
                  {t.signOut}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <button
              onClick={() => setLoginOpen(true)}
              className="btn btn-text btn-sm"
            >
              {t.signIn}
            </button>
          )}

          <a href="#wizard" className="btn btn-primary btn-sm">{t.tryFree}</a>
        </div>
      </div>
      <LoginModal open={loginOpen} onOpenChange={setLoginOpen} />
    </nav>
  );
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted && resolvedTheme === "dark";

  return (
    <button
      type="button"
      className="theme-toggle"
      aria-label="Toggle theme"
      title="Toggle theme"
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4l1.4-1.4M17 7l1.4-1.4" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      )}
    </button>
  );
}
