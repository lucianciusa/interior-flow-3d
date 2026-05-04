"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import Link from "next/link";

export function Nav() {
  return (
    <nav className="nav">
      <div className="container nav-inner">
        <Link href="#top" className="nav-brand">
          <span className="nav-brand-mark" />
          Interior&nbsp;Flow&nbsp;3D
          <span className="nav-pill">v1.0</span>
        </Link>
        <div className="nav-links">
          <a href="#wizard">Wizard</a>
          <a href="#styles">Styles</a>
          <a href="#rooms">Rooms</a>
          <a href="#how">How it works</a>
          <a href="#hierarchy">Projects</a>
          <a href="#pricing">Pricing</a>
        </div>
        <div className="nav-cta">
          <ThemeToggle />
          <Link href="/app" className="btn btn-text btn-sm">Sign in</Link>
          <a href="#wizard" className="btn btn-primary btn-sm">Try it free</a>
        </div>
      </div>
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
