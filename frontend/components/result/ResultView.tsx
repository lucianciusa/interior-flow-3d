"use client";

import dynamic from "next/dynamic";
import { Suspense, useEffect, useState } from "react";

import ResultSidebar from "@/components/sidebar/ResultSidebar";
import SwapPopover from "@/components/swap/SwapPopover";
import CameraPresets from "@/components/viewer/CameraPresets";
import ItemPopover from "@/components/viewer/ItemPopover";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useViewerStore } from "@/lib/stores/viewer";
import type { Layout, Preference, RoomDims, RoomType, Style } from "@/lib/types";

const Scene = dynamic(() => import("@/components/viewer/Scene"), { ssr: false });

export type ResultViewMode = "live" | "saved" | "shared";

type ResultViewProps = {
  roomType: RoomType;
  layout: Layout;
  dims: RoomDims;
  style: Style;
  preferences: Preference[];
  mode?: ResultViewMode;
  layoutId?: string | null;
  onRegenerate?: () => void;
  onAdjust?: () => void;
  onSave?: () => void;
  onShare?: () => void;
  onCompare?: () => void;
  saveState?: "idle" | "saving" | "saved";
};

export default function ResultView({
  roomType,
  layout,
  dims,
  style,
  preferences,
  mode = "live",
  layoutId = null,
  onRegenerate,
  onAdjust,
  onSave,
  onShare,
  onCompare,
  saveState,
}: ResultViewProps) {
  const selected = useViewerStore((s) => s.selectedItem);
  const setSelected = useViewerStore((s) => s.setSelectedItem);
  const [swapOpen, setSwapOpen] = useState(false);
  const [hideWalls, setHideWalls] = useState(false);

  useEffect(() => {
    setSelected(null);
  }, [setSelected]);

  const showSwap = mode === "saved" && layoutId;

  // Shared route renders sidebar inline, app route uses shell's inspector space
  const isInline = mode === "shared";

  return (
    <div className="flex h-full">
      <div className="relative flex-1">
        <div className="absolute left-4 top-4 z-10 flex items-center gap-2">
          <CameraPresets />
          <Button
            variant="outline"
            size="sm"
            className="bg-background/80 backdrop-blur-sm border-border shadow-sm h-8"
            onClick={() => setHideWalls(!hideWalls)}
          >
            {hideWalls ? "Show walls" : "Hide walls"}
          </Button>
        </div>
        <Suspense
          fallback={
            <div className="flex h-full items-center justify-center">
              <Skeleton className="h-[60vh] w-[80%] rounded-xl" />
            </div>
          }
        >
          <Scene layout={layout} dims={dims} hideWalls={hideWalls} />
        </Suspense>
        <ItemPopover />
        {showSwap && selected && (
          <>
            <Button
              size="sm"
              onClick={() => setSwapOpen((v) => !v)}
              className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2"
            >
              {swapOpen ? "Hide replacements" : "Replace this item"}
            </Button>
            {swapOpen && layoutId && (
              <SwapPopover
                item={selected}
                layoutId={layoutId}
                roomType={roomType}
                onClose={() => setSwapOpen(false)}
              />
            )}
          </>
        )}
      </div>
      {isInline && (
        <div className="w-80 shrink-0 border-l border-border">
          <ResultSidebar
            layout={layout}
            style={style}
            preferences={preferences}
            mode={mode}
            onRegenerate={onRegenerate}
            onAdjust={onAdjust}
            onSave={onSave}
            onShare={onShare}
            onCompare={onCompare}
            saveState={saveState}
          />
        </div>
      )}
      {!isInline && (
        <div className="hidden lg:flex w-80 shrink-0 border-l border-border">
          <ResultSidebar
            layout={layout}
            style={style}
            preferences={preferences}
            mode={mode}
            onRegenerate={onRegenerate}
            onAdjust={onAdjust}
            onSave={onSave}
            onShare={onShare}
            onCompare={onCompare}
            saveState={saveState}
          />
        </div>
      )}
    </div>
  );
}
