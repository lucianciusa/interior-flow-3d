"use client";

import dynamic from "next/dynamic";
import { Suspense, useEffect, useState } from "react";

import ResultSidebar from "@/components/sidebar/ResultSidebar";
import SwapPopover from "@/components/swap/SwapPopover";
import CameraPresets from "@/components/viewer/CameraPresets";
import ItemPopover from "@/components/viewer/ItemPopover";
import { useViewerStore } from "@/lib/stores/viewer";
import type { Layout, Preference, RoomDims, Style } from "@/lib/types";

const Scene = dynamic(() => import("@/components/viewer/Scene"), { ssr: false });

export type ResultViewMode = "live" | "saved" | "shared";

type ResultViewProps = {
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

  useEffect(() => {
    setSelected(null);
  }, [setSelected]);

  const showSwap = mode === "saved" && layoutId;

  return (
    <div className="flex h-screen">
      <div className="relative flex-1">
        <div className="absolute left-4 top-4 z-10">
          <CameraPresets />
        </div>
        <Suspense
          fallback={
            <div className="flex h-full items-center justify-center text-neutral-400">
              Loading 3D scene&hellip;
            </div>
          }
        >
          <Scene layout={layout} dims={dims} />
        </Suspense>
        <ItemPopover />
        {showSwap && selected && (
          <>
            <button
              type="button"
              onClick={() => setSwapOpen((v) => !v)}
              className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white"
            >
              {swapOpen ? "Hide replacements" : "Replace this item"}
            </button>
            {swapOpen && layoutId && (
              <SwapPopover
                item={selected}
                layoutId={layoutId}
                onClose={() => setSwapOpen(false)}
              />
            )}
          </>
        )}
      </div>
      {mode !== "shared" && (
        <div className="w-80 shrink-0 border-l border-neutral-200">
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
