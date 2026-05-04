"use client";

import { usePathname } from "next/navigation";
import { ReactNode, useState } from "react";

import { LeftRail } from "./LeftRail";
import { RightInspector } from "./RightInspector";
import { TopToolbar } from "./TopToolbar";
import { useWizardStore } from "@/lib/stores/wizard";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const phase = useWizardStore((s) => s.phase);
  
  const isLayoutPage = pathname?.includes("/layouts/");
  const isResultPage = pathname?.includes("/result");
  const isFullWidthPage = isResultPage || isLayoutPage || (phase === "result" && pathname?.includes("/app/new"));

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background text-foreground">
      {/* 2. Top Toolbar - Now at the very top of the layout */}
      <div className="pointer-events-auto z-20">
        <TopToolbar isEdgeToEdge={false} />
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        <LeftRail />

        <div className="flex flex-1 flex-col overflow-hidden relative">
          {/* Main Content Area */}
          <main
            className={`flex-1 overflow-auto ${
              isFullWidthPage ? "p-0 pointer-events-none" : "p-6 sm:p-8"
            }`}
          >
            {isFullWidthPage ? (
              children
            ) : (
              <div className="mx-auto max-w-5xl">{children}</div>
            )}
          </main>
        </div>

        {/* 3. Right Inspector (page-specific panels) */}
        <div className="pointer-events-auto z-10 h-full w-80 shrink-0">
          <RightInspector isFloating={isResultPage} />
        </div>
      </div>
    </div>
  );
}