"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { Bounds, OrbitControls, PerspectiveCamera } from "@react-three/drei";

import Furniture from "@/components/viewer/Furniture";
import Room from "@/components/viewer/Room";
import { HERO_LAYOUT, HERO_DIMS } from "@/lib/marketing-fixtures";

export default function HeroScene() {
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
        autoRotate
        autoRotateSpeed={0.4}
        enableDamping
        enableZoom={false}
        enablePan={false}
        maxPolarAngle={Math.PI / 2.1}
      />
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[5, 8, 3]}
        intensity={1.0}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <Suspense fallback={null}>
        <Bounds fit clip observe margin={1.05}>
          <Room dims={HERO_DIMS} palette={HERO_LAYOUT.palette} />
          {HERO_LAYOUT.items.map((item) => (
            <Furniture key={`${item.catalogId}-${item.slot}`} item={item} />
          ))}
        </Bounds>
      </Suspense>
    </Canvas>
  );
}
