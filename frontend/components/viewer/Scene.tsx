"use client";

import { Suspense, useEffect, useMemo } from "react";
import * as THREE from "three";
import { Canvas, useThree } from "@react-three/fiber";
import { Bounds, OrbitControls, PerspectiveCamera, Environment, Instances, Instance, useGLTF } from "@react-three/drei";

import { configureLoaders } from "@/lib/loaders";
import { CameraController3D } from "@/components/viewer/CameraPresets";
import Furniture from "@/components/viewer/Furniture";
import Room from "@/components/viewer/Room";
import type { Layout, RoomDims } from "@/lib/types";

type SceneProps = {
  layout: Layout;
  dims: RoomDims;
  hideWalls?: boolean;
};

export default function Scene({ layout, dims, hideWalls = false }: SceneProps) {
  useEffect(() => {
    layout.items.forEach((item) => {
      if (!item.model.startsWith("primitive:")) {
        useGLTF.preload(item.model);
      }
    });
  }, [layout.items]);

  const { instanceGroups, individualItems } = useMemo(() => {
    const groups: Record<string, typeof layout.items> = {};
    layout.items.forEach((item) => {
      if (!item.model.startsWith("primitive:")) {
        if (!groups[item.model]) groups[item.model] = [];
        groups[item.model].push(item);
      }
    });

    const instanceGroups = Object.entries(groups).filter(([_, items]) => items.length >= 3);
    const individualItems = layout.items.filter(
      (item) => item.model.startsWith("primitive:") || groups[item.model].length < 3
    );

    return { instanceGroups, individualItems };
  }, [layout]);

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => configureLoaders(gl)}
      className="h-full w-full"
    >
      <ambientLight intensity={0.4} />
      <PerspectiveCamera makeDefault position={[6, 5, 6]} fov={45} />
      <SceneControls />
      <directionalLight
        position={[5, 8, 3]}
        intensity={1.0}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <CameraController3D />
      <Suspense fallback={null}>
        {process.env.NEXT_PUBLIC_HDRI_URL && (
           <Environment files={process.env.NEXT_PUBLIC_HDRI_URL} background={false} />
        )}
        <Bounds clip observe margin={1.1}>
          <Room dims={dims} palette={layout.palette} hideWalls={hideWalls} />
          {individualItems.map((item) => (
            <Furniture key={`${item.catalogId}-${item.slot}`} item={item} />
          ))}
          {instanceGroups.map(([model, items]) => (
            <InstanceGroup key={model} model={model} items={items} />
          ))}
        </Bounds>
      </Suspense>
    </Canvas>
  );
}

function SceneControls() {
  const camera = useThree((state) => state.camera);
  return (
    <OrbitControls
      camera={camera}
      makeDefault
      enablePan={false}
      maxDistance={15}
      minDistance={2}
      maxPolarAngle={Math.PI / 2.1}
      enableDamping
      dampingFactor={0.05}
      rotateSpeed={0.5}
    />
  );
}

function InstanceGroup({ model, items }: { model: string; items: any[] }) {
  const { scene } = useGLTF(model);
  const clonedScene = useMemo(() => {
    const clone = scene.clone();
    clone.traverse((obj: any) => {
      if (obj.isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });
    return clone;
  }, [scene]);
  
  return (
    <Instances range={items.length}>
      <primitive object={clonedScene} />
      {items.map((item, i) => (
        <Instance
          key={`${item.catalogId}-${item.slot}`}
          position={item.position}
          rotation={[0, item.rotation_y, 0]}
        />
      ))}
    </Instances>
  );
}
