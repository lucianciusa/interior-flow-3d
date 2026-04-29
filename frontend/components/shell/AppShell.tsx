"use client";

import { usePathname } from "next/navigation";
import { ReactNode } from "react";

import { LeftRail } from "./LeftRail";
import { RightInspector } from "./RightInspector";
import { TopToolbar } from "./TopToolbar";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isResultPage = pathname?.includes("/result");

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      {/* 1. Left Rail (Icon-only nav) space */}
      <LeftRail />

      <div className="flex flex-1 flex-col overflow-hidden relative">
        {/* 2. Top Toolbar */}
        <TopToolbar isEdgeToEdge={isResultPage} />

        {/* Main Content Area */}
        <main
          className={`flex-1 overflow-auto ${
            isResultPage ? "p-0" : "p-6 sm:p-8"
          }`}
        >
          {isResultPage ? (
            children
          ) : (
            <div className="mx-auto max-w-5xl">{children}</div>
          )}
        </main>
      </div>

      {/* 3. Right Inspector (page-specific panels) */}
      <RightInspector isFloating={isResultPage} />
    </div>
  );
}