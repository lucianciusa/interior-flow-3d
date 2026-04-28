"use client";

import { useMemo } from "react";
import { useGLTF } from "@react-three/drei";

import { useViewerStore } from "@/lib/stores/viewer";
import type { ResolvedItem } from "@/lib/types";

type FurnitureProps = { item: ResolvedItem };

function GltfMesh({ model }: { model: string }) {
  const { scene } = useGLTF(model);
  return <primitive object={scene.clone()} castShadow />;
}

function PrimitiveMesh({ footprint }: { footprint: ResolvedItem["footprint"] }) {
  const args = useMemo(
    (): [number, number, number] => [footprint.w, footprint.h, footprint.d],
    [footprint.w, footprint.h, footprint.d],
  );
  return (
    <mesh castShadow>
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

  return (
    <group
      position={[px, py, pz]}
      rotation={[0, item.rotation_y, 0]}
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
        <GltfMesh model={item.model} />
      )}
      {isSelected && (
        <mesh>
          <boxGeometry
            args={[item.footprint.w + 0.05, item.footprint.h + 0.05, item.footprint.d + 0.05]}
          />
          <meshStandardMaterial color="#3B82F6" wireframe />
        </mesh>
      )}
    </group>
  );
}
