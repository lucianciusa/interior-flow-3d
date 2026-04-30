"use client";

import { useMemo } from "react";
import { DoubleSide } from "three";

import type { PaletteMap, RoomDims } from "@/lib/types";

type RoomProps = {
  dims: RoomDims;
  palette: PaletteMap;
  hideWalls?: boolean;
};

export default function Room({ dims, palette, hideWalls = false }: RoomProps) {
  const { width_m: w, length_m: roomL, height_m: h } = dims;

  const wallColor = useMemo(() => palette.wall.hex, [palette.wall.hex]);
  const floorColor = useMemo(() => palette.floor.hex, [palette.floor.hex]);

  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[w, roomL]} />
        <meshStandardMaterial color={floorColor} roughness={0.85} metalness={0.05} envMapIntensity={0.6} />
      </mesh>

      {!hideWalls && (
        <>
          {/* North wall (back, -Z face) */}
          <mesh position={[0, h / 2, -roomL / 2]} receiveShadow>
            <planeGeometry args={[w, h]} />
            <meshStandardMaterial color={wallColor} side={DoubleSide} roughness={0.85} metalness={0.05} envMapIntensity={0.6} />
          </mesh>

          {/* South wall (+Z face) */}
          <mesh position={[0, h / 2, roomL / 2]} rotation={[0, Math.PI, 0]} receiveShadow>
            <planeGeometry args={[w, h]} />
            <meshStandardMaterial color={wallColor} side={DoubleSide} roughness={0.85} metalness={0.05} envMapIntensity={0.6} />
          </mesh>

          {/* East wall (+X face) */}
          <mesh position={[w / 2, h / 2, 0]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
            <planeGeometry args={[roomL, h]} />
            <meshStandardMaterial color={wallColor} side={DoubleSide} roughness={0.85} metalness={0.05} envMapIntensity={0.6} />
          </mesh>

          {/* West wall (-X face) */}
          <mesh position={[-w / 2, h / 2, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
            <planeGeometry args={[roomL, h]} />
            <meshStandardMaterial color={wallColor} side={DoubleSide} roughness={0.85} metalness={0.05} envMapIntensity={0.6} />
          </mesh>
        </>
      )}
    </group>
  );
}
