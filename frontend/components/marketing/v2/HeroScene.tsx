"use client";

import { Suspense, useMemo, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { 
  PerspectiveCamera, 
  Center,
  OrbitControls,
  Bounds
} from "@react-three/drei";
import * as THREE from "three";
import { WebGLFallback } from "@/components/ui/WebGLFallback";
import { HERO_LAYOUT, HERO_DIMS } from "@/lib/marketing-fixtures";
import Furniture from "@/components/viewer/Furniture";
import Room from "@/components/viewer/Room";

function Scene() {
  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 4, 8]} fov={50} />
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[5, 8, 3]}
        intensity={1.0}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />

      <Center top position={[0, -0.5, 0]}>
        <Bounds clip observe margin={1.2}>
          <Room dims={HERO_DIMS} palette={HERO_LAYOUT.palette} hideWalls={true} />
          <Suspense fallback={null}>
            {HERO_LAYOUT.items.map((item, idx) => (
              <Furniture key={`${item.catalogId}-${idx}`} item={item} />
            ))}
          </Suspense>
        </Bounds>
      </Center>

      <OrbitControls autoRotate autoRotateSpeed={1} enableZoom={false} enablePan={false} maxPolarAngle={Math.PI / 2 - 0.05} />
    </>
  );
}

export default function HeroScene() {
  return (
    <div className="h-full w-full relative bg-muted/5">
      <WebGLFallback
        fallback={
          <div className="flex h-full w-full items-center justify-center bg-muted/20">
            <div className="text-sm text-muted-foreground animate-pulse">
              Please check your internet connection to load 3D models.
            </div>
          </div>
        }
      >
        <Canvas
          shadows
          dpr={[1, 2]}
          gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}
          style={{ width: "100%", height: "100%", display: "block" }}
        >
          <Scene />
        </Canvas>
      </WebGLFallback>
    </div>
  );
}
