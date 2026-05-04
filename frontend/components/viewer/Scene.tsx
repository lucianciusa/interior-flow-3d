"use client";

import { Suspense, useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { Bounds, OrbitControls, PerspectiveCamera, useGLTF } from "@react-three/drei";

import { configureLoaders } from "@/lib/loaders";
import { CameraController3D } from "@/components/viewer/CameraPresets";
import Furniture from "@/components/viewer/Furniture";
import Room from "@/components/viewer/Room";
import type { Layout, RoomDims } from "@/lib/types";

type SceneProps = {
  layout: Layout;
  dims: RoomDims;
  hideWalls?: boolean;
  captureRef?: React.MutableRefObject<(() => string) | null>;
};

export default function Scene({ layout, dims, hideWalls = false, captureRef }: SceneProps) {
  // Preload models for faster rendering
  useEffect(() => {
    layout.items.forEach((item) => {
      if (!item.model.startsWith("primitive:")) {
        useGLTF.preload(item.model);
      }
    });
  }, [layout.items]);

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      gl={{ antialias: true, preserveDrawingBuffer: true, powerPreference: "high-performance" }}
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
      {captureRef && <CaptureHandler captureRef={captureRef} />}
      <Suspense fallback={null}>
        <Bounds clip observe margin={1.1}>
          <Room dims={dims} palette={layout.palette} hideWalls={hideWalls} />
          {layout.items.map((item) => (
            <Furniture key={`${item.catalogId}-${item.slot}`} item={item} />
          ))}
        </Bounds>
      </Suspense>
    </Canvas>
  );
}

function CaptureHandler({ captureRef }: { captureRef: React.MutableRefObject<(() => string) | null> }) {
  const { gl, scene, camera } = useThree();
  useEffect(() => {
    captureRef.current = () => {
      gl.render(scene, camera);
      return gl.domElement.toDataURL("image/webp", 0.5);
    };
  }, [gl, scene, camera, captureRef]);
  return null;
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
