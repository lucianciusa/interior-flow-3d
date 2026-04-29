"use client";

import dynamic from "next/dynamic";
import { Suspense, useState } from "react";

import CompareToolbar from "@/components/compare/CompareToolbar";
import { useGetLayout } from "@/lib/api";
import type { RoomDims } from "@/lib/types";

const Scene = dynamic(() => import("@/components/viewer/Scene"), { ssr: false });

type Props = {
  aId: string;
  bId: string;
  dims: RoomDims;
  onClose: () => void;
};

export default function CompareOverlay({ aId, bId, dims, onClose }: Props) {
  const a = useGetLayout(aId);
  const b = useGetLayout(bId);
  const [t, setT] = useState(0.5);

  const ready = a.data && b.data;
  const dimsMismatch =
    ready &&
    (Math.abs(a.data!.rooms.width_m - b.data!.rooms.width_m) > 0.01 ||
      Math.abs(a.data!.rooms.length_m - b.data!.rooms.length_m) > 0.01);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-40 flex flex-col bg-black text-white"
    >
      <CompareToolbar t={t} onChange={setT} onClose={onClose} />
      <div className="relative flex-1">
        {!ready && (
          <div className="flex h-full items-center justify-center text-sm text-white/60">
            Loading both layouts…
          </div>
        )}
        {dimsMismatch && (
          <div className="flex h-full items-center justify-center p-6 text-center text-sm text-amber-400">
            Cannot compare layouts with different room dimensions.
          </div>
        )}
        {ready && !dimsMismatch && a.data && b.data && (
          <>
            <div className="absolute inset-0" style={{ opacity: 1 - t }}>
              <Suspense fallback={null}>
                <Scene layout={a.data.layout} dims={dims} />
              </Suspense>
            </div>
            <div
              className="absolute inset-0"
              style={{ opacity: t, pointerEvents: t > 0.5 ? "auto" : "none" }}
            >
              <Suspense fallback={null}>
                <Scene layout={b.data.layout} dims={dims} />
              </Suspense>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
