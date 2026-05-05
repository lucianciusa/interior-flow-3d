"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";

import { useViewerStore } from "@/lib/stores/viewer";
import type { ResolvedItem } from "@/lib/types";

type FurnitureProps = { item: ResolvedItem };

function GltfMesh({ model, footprint }: { model: string; footprint: ResolvedItem["footprint"] }) {
  const { scene } = useGLTF(model);
  const scaledScene = useMemo(() => {
    const clone = scene.clone();
    
    // Calculate bounding box to determine natural size
    const box = new THREE.Box3().setFromObject(clone);
    const size = new THREE.Vector3();
    box.getSize(size);
    
    // Avoid division by zero
    const sx = size.x > 0 ? footprint.w / size.x : 1;
    const sy = size.y > 0 ? footprint.h / size.y : 1;
    const sz = size.z > 0 ? footprint.d / size.z : 1;
    
    clone.scale.set(sx, sy, sz);

    // Re-center model if its origin isn't at the bottom-center
    const newBox = new THREE.Box3().setFromObject(clone);
    const center = new THREE.Vector3();
    newBox.getCenter(center);
    clone.position.x -= center.x;
    clone.position.z -= center.z;
    clone.position.y -= newBox.min.y; // Sit on ground

    clone.traverse((obj: any) => {
      if (obj.isMesh) {
        if (!obj.geometry) {
          obj.geometry = new THREE.BufferGeometry();
        }
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });
    return clone;
  }, [scene, footprint.w, footprint.h, footprint.d]);

  return <primitive object={scaledScene} />;
}

function PrimitiveMesh({ footprint }: { footprint: ResolvedItem["footprint"] }) {
  const args = useMemo(
    (): [number, number, number] => [footprint.w, footprint.h, footprint.d],
    [footprint.w, footprint.h, footprint.d],
  );
  return (
    <mesh castShadow position={[0, footprint.h / 2, 0]}>
      <boxGeometry args={args} />
      <meshStandardMaterial color="#8B7355" />
    </mesh>
  );
}

export default function Furniture({ item }: FurnitureProps) {
  const setSelected = useViewerStore((s) => s.setSelectedItem);
  const selected = useViewerStore((s) => s.selectedItem);
  const isSelected =
    selected?.catalogId === item.catalogId && selected?.slot === item.slot;

  const [px, py, pz] = item.position;
  const isPrimitive = item.model.startsWith("primitive:");

  // Only the bed models in the catalog are exported facing -Z instead of +Z
  const isInvertedModel = item.catalogId.startsWith("bed_");
  
  const rotY = item.rotation_y + (isInvertedModel ? Math.PI : 0);

  return (
    <group
      position={[px, py, pz]}
      rotation={[0, rotY, 0]}
      onClick={(e) => {
        e.stopPropagation();
        setSelected(isSelected ? null : item);
      }}
      onPointerOver={() => {
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "auto";
      }}
    >
      {isPrimitive ? (
        <PrimitiveMesh footprint={item.footprint} />
      ) : (
        <GltfMesh model={item.model} footprint={item.footprint} />
      )}
      {isSelected && (
        <mesh position={[0, item.footprint.h / 2, 0]}>
          <boxGeometry
            args={[item.footprint.w + 0.05, item.footprint.h + 0.05, item.footprint.d + 0.05]}
          />
          <meshStandardMaterial color="#3B82F6" wireframe />
        </mesh>
      )}
    </group>
  );
}
