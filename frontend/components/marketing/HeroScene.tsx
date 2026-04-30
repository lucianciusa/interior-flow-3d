"use client";

import { Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Bounds, OrbitControls, PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";

import Furniture from "@/components/viewer/Furniture";
import Room from "@/components/viewer/Room";
import { HERO_LAYOUT, HERO_DIMS } from "@/lib/marketing-fixtures";

function AutoRotatingGroup({ children }: { children: React.ReactNode }) {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.15; // Slow, steady rotation
    }
  });

  return <group ref={groupRef}>{children}</group>;
}

export default function HeroScene() {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      className="h-full w-full touch-pan-y"
      eventPrefix="client"
    >
      <PerspectiveCamera makeDefault position={[6, 5, 6]} fov={45} />
      <OrbitControls
        makeDefault
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
        <Bounds fit clip margin={1.05}>
          <AutoRotatingGroup>
            <Room dims={HERO_DIMS} palette={HERO_LAYOUT.palette} hideWalls />
            {HERO_LAYOUT.items.map((item) => (
              <Furniture key={`${item.catalogId}-${item.slot}`} item={item} />
            ))}
          </AutoRotatingGroup>
        </Bounds>
      </Suspense>
    </Canvas>
  );
}
