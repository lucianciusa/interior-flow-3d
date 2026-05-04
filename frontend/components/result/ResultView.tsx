"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
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
  captureRef?: React.MutableRefObject<(() => string) | null>;
};

import { useLanguage } from "@/lib/stores/useLanguage";

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
  captureRef,
}: ResultViewProps) {
  const { t } = useLanguage();
  const selected = useViewerStore((s) => s.selectedItem);
  const setSelected = useViewerStore((s) => s.setSelectedItem);
  const [swapOpen, setSwapOpen] = useState(false);
  const [hideWalls, setHideWalls] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);

  useEffect(() => {
    setSelected(null);
  }, [setSelected]);

  useEffect(() => {
    setSwapOpen(false);
  }, [selected]);

  // Shared route renders sidebar inline, app route uses shell's inspector space
  const isInline = mode === "shared";

  return (
    <div className="flex h-full">
      <div className="relative flex-1">
        <div className="absolute left-4 top-8 z-10 flex flex-col gap-2 pointer-events-auto">
          <CameraPresets />
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="bg-background border-border shadow-sm h-8 px-3"
              onClick={() => setHideWalls(!hideWalls)}
            >
              {hideWalls ? t("show_walls") : t("hide_walls")}
            </Button>
          </div>
        </div>
        <Suspense
          fallback={
            <div className="flex h-full items-center justify-center">
              <Skeleton className="h-[60vh] w-[80%] rounded-xl" />
            </div>
          }
        >
          <div className="fixed inset-0 z-0 pointer-events-auto">
            <Scene layout={layout} dims={dims} hideWalls={hideWalls} captureRef={captureRef} />
          </div>
        </Suspense>
        <ItemPopover 
          showReplace={true} 
          isSaved={!!layoutId}
          onReplace={() => {
            if (!layoutId) {
              onSave?.();
              return;
            }
            setSwapOpen((v) => !v);
          }}
          isReplacing={swapOpen}
        />
        {swapOpen && selected && layoutId && (
          <div className="pointer-events-auto">
            <SwapPopover
              item={selected}
              layoutId={layoutId}
              roomType={roomType}
              onClose={() => setSwapOpen(false)}
            />
          </div>
        )}
      </div>
      {/* Sidebars with Tab Toggles */}
      <div className="relative flex pointer-events-none">
        {(isInline || !isInline) && (
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="pointer-events-auto absolute top-1/2 -translate-y-1/2 right-full z-30 flex h-16 w-6 items-center justify-center rounded-l-md border border-r-0 bg-background shadow-sm transition-all hover:bg-muted"
            title={showSidebar ? t("hide_layout_info") : t("show_layout_info")}
          >
            {showSidebar ? (
              <ChevronRight size={16} className="text-muted-foreground" />
            ) : (
              <ChevronLeft size={16} className="text-muted-foreground" />
            )}
          </button>
        )}

        {isInline && showSidebar && (
          <div className="w-80 shrink-0 border-l border-border bg-background pointer-events-auto z-10 relative">
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
        {!isInline && showSidebar && (
          <div className="hidden lg:flex w-80 shrink-0 border-l border-border bg-background pointer-events-auto z-10 relative">
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
    </div>
  );
}
