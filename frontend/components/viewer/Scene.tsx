"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { Bounds, OrbitControls, PerspectiveCamera } from "@react-three/drei";

import { CameraController3D } from "@/components/viewer/CameraPresets";
import Furniture from "@/components/viewer/Furniture";
import Room from "@/components/viewer/Room";
import type { Layout, RoomDims } from "@/lib/types";

type SceneProps = {
  layout: Layout;
  dims: RoomDims;
};

export default function Scene({ layout, dims }: SceneProps) {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      className="h-full w-full"
    >
      <PerspectiveCamera makeDefault position={[6, 5, 6]} fov={45} />
      <OrbitControls
        makeDefault
        enablePan
        enableZoom
        maxDistance={15}
        minDistance={2}
        maxPolarAngle={Math.PI / 2.1}
      />
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[5, 8, 3]}
        intensity={1.0}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <CameraController3D />
      <Suspense fallback={null}>
        <Bounds clip observe margin={1.1}>
          <Room dims={dims} palette={layout.palette} />
          {layout.items.map((item) => (
            <Furniture key={`${item.catalogId}-${item.slot}`} item={item} />
          ))}
        </Bounds>
      </Suspense>
    </Canvas>
  );
}
