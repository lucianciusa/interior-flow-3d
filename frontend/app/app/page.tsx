"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

import CameraPresets from "@/components/viewer/CameraPresets";
import ItemPopover from "@/components/viewer/ItemPopover";
import type { Layout, RoomDims } from "@/lib/types";

const Scene = dynamic(() => import("@/components/viewer/Scene"), { ssr: false });

const FIXTURE_DIMS: RoomDims = { width_m: 5, length_m: 6, height_m: 2.6 };

// Pre-resolved positions (computed from slot_resolver math, not recalculated client-side).
// north_wall_center t=0.5: x=0, z=-(6/2 - 0.50/2 - 0.07) = -(2.68)
// corner_NW: x=-(5/2 - 0.50/2 - 0.05)=-(2.2), z=-(6/2 - 0.50/2 - 0.05)=-(2.7)
const FIXTURE_LAYOUT: Layout = {
  style: "scandinavian",
  palette: {
    wall: { name: "Soft White", hex: "#F4F1EC" },
    floor: { name: "Light Oak", hex: "#D6BFA0" },
    accent: { name: "Sage", hex: "#A7B79A" },
  },
  items: [
    {
      catalogId: "side_table",
      slot: "north_wall_center",
      facing: "auto",
      rationale: "I placed the side table along the back wall to keep the center open.",
      position: [0, 0.275, -2.68],
      rotation_y: 0,
      footprint: { w: 0.5, d: 0.5, h: 0.55 },
      model: "primitive:side_table",
    },
    {
      catalogId: "corner_shelf",
      slot: "corner_NW",
      facing: "auto",
      rationale: "I tucked the corner shelf into the back-left corner to maximize storage without blocking traffic.",
      position: [-2.2, 0.75, -2.7],
      rotation_y: Math.PI / 4,
      footprint: { w: 0.5, d: 0.5, h: 1.5 },
      model: "primitive:corner_shelf",
    },
  ],
  designExplanation:
    "I created this Scandinavian layout to maximize openness while providing functional storage along the back wall. The side table keeps surfaces clear and the corner shelf uses dead space efficiently.",
  seed: 42,
  warnings: [],
};

export default function AppPage() {
  return (
    <main className="flex h-screen flex-col">
      <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-2">
        <h1 className="font-semibold tracking-tight">Interior Flow 3D — Phase 1 Viewer</h1>
        <CameraPresets />
      </div>
      <div className="relative flex-1">
        <Suspense
          fallback={
            <div className="flex h-full items-center justify-center text-neutral-400">
              Loading…
            </div>
          }
        >
          <Scene layout={FIXTURE_LAYOUT} dims={FIXTURE_DIMS} />
        </Suspense>
        <ItemPopover />
      </div>
    </main>
  );
}
