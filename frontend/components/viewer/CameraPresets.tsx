"use client";

import { useEffect } from "react";
import { useThree } from "@react-three/fiber";

import { cn } from "@/lib/utils";
import { useViewerStore, type CameraPreset } from "@/lib/stores/viewer";

type PresetDef = {
  id: CameraPreset;
  label: string;
  position: [number, number, number];
  target: [number, number, number];
};

const PRESETS: PresetDef[] = [
  { id: "top", label: "Top", position: [0, 12, 0.001], target: [0, 0, 0] },
  { id: "quarter", label: "3/4", position: [6, 5, 6], target: [0, 0, 0] },
  { id: "eye", label: "Eye", position: [0, 1.6, 8], target: [0, 1.0, 0] },
];

/** Renders inside <Canvas> — updates camera when preset changes. */
export function CameraController3D() {
  const { camera } = useThree();
  const preset = useViewerStore((s) => s.cameraPreset);

  useEffect(() => {
    const p = PRESETS.find((x) => x.id === preset);
    if (!p) return;
    camera.position.set(...p.position);
    camera.lookAt(...p.target);
  }, [preset, camera]);

  return null;
}

type CameraPresetsProps = { className?: string };

/** Renders outside <Canvas> — HTML buttons that write to Zustand. */
export default function CameraPresets({ className }: CameraPresetsProps) {
  const preset = useViewerStore((s) => s.cameraPreset);
  const setPreset = useViewerStore((s) => s.setCameraPreset);

  return (
    <div className={cn("flex gap-2", className)}>
      {PRESETS.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => setPreset(p.id)}
          className={cn(
            "rounded px-3 py-1 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            preset === p.id
              ? "bg-primary text-primary-foreground shadow-sm"
              : "bg-background/80 text-foreground hover:bg-background shadow-sm border border-border backdrop-blur-sm",
          )}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
