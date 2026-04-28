"use client";

import dynamic from "next/dynamic";
import { Suspense, useEffect } from "react";

import ResultSidebar from "@/components/sidebar/ResultSidebar";
import CameraPresets from "@/components/viewer/CameraPresets";
import ItemPopover from "@/components/viewer/ItemPopover";
import { useViewerStore } from "@/lib/stores/viewer";
import type { Layout, Preference, RoomDims, Style } from "@/lib/types";

const Scene = dynamic(() => import("@/components/viewer/Scene"), { ssr: false });

type ResultViewProps = {
  layout: Layout;
  dims: RoomDims;
  style: Style;
  preferences: Preference[];
  onRegenerate?: () => void;
  onAdjust?: () => void;
  onSave?: () => void;
  saveState?: "idle" | "saving" | "saved";
};

export default function ResultView({
  layout,
  dims,
  style,
  preferences,
  onRegenerate,
  onAdjust,
  onSave,
  saveState,
}: ResultViewProps) {
  const clearSelection = useViewerStore((s) => s.setSelectedItem);

  useEffect(() => {
    clearSelection(null);
  }, [clearSelection]);

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
      </div>
      <div className="w-80 shrink-0 border-l border-neutral-200">
        <ResultSidebar
          layout={layout}
          style={style}
          preferences={preferences}
          onRegenerate={onRegenerate}
          onAdjust={onAdjust}
          onSave={onSave}
          saveState={saveState}
        />
      </div>
    </div>
  );
}
