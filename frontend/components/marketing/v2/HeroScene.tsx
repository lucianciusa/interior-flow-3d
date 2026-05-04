"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";
import { useTheme } from "next-themes";
import { WebGLFallback } from "@/components/ui/WebGLFallback";

type Palette = {
  wallA: number; wallB: number; floor: number;
  sofa: number; sofaAccent: number;
  wood: number; woodDark: number;
  accent: number; sage: number;
  shelf: number; fabric: number;
  ambient: number; key: number;
};

const PALETTES: Record<"light" | "dark", Palette> = {
  light: {
    wallA: 0xf1ece3, wallB: 0xe8e2d6, floor: 0xd9cfbe,
    sofa: 0x7c5bff, sofaAccent: 0x5c3fe0,
    wood: 0xb89b7a, woodDark: 0x8b7355,
    accent: 0xe8855a, sage: 0x7b8c6f,
    shelf: 0x4a4548, fabric: 0xc9a86a,
    ambient: 0xffefd8, key: 0xfff4e0,
  },
  dark: {
    wallA: 0x1a1a24, wallB: 0x14141c, floor: 0x2a2530,
    sofa: 0x9b7dff, sofaAccent: 0x7c5bff,
    wood: 0x6b5942, woodDark: 0x4a3f2f,
    accent: 0xf0a07a, sage: 0x9dae91,
    shelf: 0x6b6675, fabric: 0xddbe83,
    ambient: 0x4a3f60, key: 0xc9b5ff,
  },
};

function Books({ p }: { p: Palette }) {
  const books = useMemo(() => {
    const out: Array<{ x: number; y: number; z: number; w: number; h: number; color: number }> = [];
    const colors = [p.accent, p.sage, p.fabric, p.sofa, p.woodDark];
    let seed = 1;
    const rand = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    for (let row = 0; row < 4; row++) {
      let z = -0.55;
      while (z < 0.5) {
        const w = 0.06 + rand() * 0.05;
        const h = 0.18 + rand() * 0.12;
        out.push({
          x: 0.05,
          y: 0.35 + row * 0.55 + h / 2,
          z: z + w / 2,
          w,
          h,
          color: colors[Math.floor(rand() * colors.length)],
        });
        z += w + 0.005;
      }
    }
    return out;
  }, [p]);

  return (
    <>
      {books.map((b, i) => (
        <mesh key={i} position={[b.x, b.y, b.z]} castShadow receiveShadow>
          <boxGeometry args={[0.18, b.h, b.w]} />
          <meshStandardMaterial color={b.color} roughness={0.7} />
        </mesh>
      ))}
      {[0, 1, 2, 3].map((row) => (
        <mesh key={`plank-${row}`} position={[0, 0.32 + row * 0.55, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.22, 0.03, 1.25]} />
          <meshStandardMaterial color={p.woodDark} roughness={0.7} />
        </mesh>
      ))}
    </>
  );
}

function Plant({ p }: { p: Palette }) {
  const leaves = useMemo(() => {
    let seed = 7;
    const rand = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    return Array.from({ length: 5 }, () => ({
      x: (rand() - 0.5) * 0.3,
      y: 0.5 + rand() * 0.5,
      z: (rand() - 0.5) * 0.3,
      r: 0.25 + rand() * 0.1,
    }));
  }, []);
  return (
    <group position={[2.5, 0, -2.0]}>
      <mesh position={[0, 0.16, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.22, 0.22, 0.32, 16]} />
        <meshStandardMaterial color={p.woodDark} roughness={0.7} />
      </mesh>
      {leaves.map((l, i) => (
        <mesh key={i} position={[l.x, l.y, l.z]} castShadow>
          <sphereGeometry args={[l.r, 8, 8]} />
          <meshStandardMaterial color={p.sage} roughness={0.85} />
        </mesh>
      ))}
    </group>
  );
}

function OrbitCam() {
  const camRef = useRef<THREE.PerspectiveCamera>(null);
  const tRef = useRef(0);
  useFrame((_, delta) => {
    if (!camRef.current) return;
    tRef.current += delta * 0.06;
    const angle = tRef.current;
    const r = 6.5;
    camRef.current.position.x = Math.cos(angle) * r;
    camRef.current.position.z = Math.sin(angle) * r;
    camRef.current.position.y = 4.2 + Math.sin(tRef.current * 0.7) * 0.4;
    camRef.current.lookAt(0, 0.8, -0.3);
  });
  return <PerspectiveCamera ref={camRef} makeDefault fov={38} near={0.1} far={100} position={[6, 4.5, 7]} />;
}

function Scene() {
  const { resolvedTheme } = useTheme();
  const p = PALETTES[(resolvedTheme === "dark" ? "dark" : "light") as "light" | "dark"];
  const ROOM_W = 6, ROOM_D = 5, ROOM_H = 3.2;

  return (
    <>
      <OrbitCam />
      <ambientLight color={p.ambient} intensity={0.55} />
      <directionalLight
        color={p.key}
        intensity={1.4}
        position={[5, 8, 4]}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
        shadow-camera-near={0.5}
        shadow-camera-far={30}
        shadow-bias={-0.0005}
      />
      <directionalLight color={0xcfe0ff} intensity={0.35} position={[-5, 3, -2]} />

      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[ROOM_W, ROOM_D]} />
        <meshStandardMaterial color={p.floor} roughness={0.85} />
      </mesh>

      {/* Back wall */}
      <mesh position={[0, ROOM_H / 2, -ROOM_D / 2]} receiveShadow>
        <planeGeometry args={[ROOM_W, ROOM_H]} />
        <meshStandardMaterial color={p.wallA} roughness={0.95} />
      </mesh>

      {/* Left wall */}
      <mesh position={[-ROOM_W / 2, ROOM_H / 2, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[ROOM_D, ROOM_H]} />
        <meshStandardMaterial color={p.wallB} roughness={0.95} />
      </mesh>

      {/* Sofa */}
      <group position={[0, 0, -1.7]}>
        <mesh position={[0, 0.25, 0]} castShadow receiveShadow>
          <boxGeometry args={[2.6, 0.5, 1.0]} />
          <meshStandardMaterial color={p.sofa} roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.65, -0.4]} castShadow receiveShadow>
          <boxGeometry args={[2.6, 0.65, 0.2]} />
          <meshStandardMaterial color={p.sofaAccent} roughness={0.7} />
        </mesh>
        <mesh position={[-1.2, 0.55, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.2, 0.55, 1.0]} />
          <meshStandardMaterial color={p.sofaAccent} roughness={0.7} />
        </mesh>
        <mesh position={[1.2, 0.55, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.2, 0.55, 1.0]} />
          <meshStandardMaterial color={p.sofaAccent} roughness={0.7} />
        </mesh>
        {[-1, 0, 1].map((i) => (
          <mesh key={i} position={[i * 0.8, 0.59, 0.05]} castShadow receiveShadow>
            <boxGeometry args={[0.7, 0.18, 0.85]} />
            <meshStandardMaterial color={p.sofa} roughness={0.85} />
          </mesh>
        ))}
      </group>

      {/* Coffee table */}
      <group position={[0, 0, -0.2]}>
        <mesh position={[0, 0.42, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.4, 0.08, 0.7]} />
          <meshStandardMaterial color={p.wood} roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.2, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.3, 0.04, 0.6]} />
          <meshStandardMaterial color={p.woodDark} roughness={0.7} />
        </mesh>
        {[
          [-0.6, -0.3], [0.6, -0.3], [-0.6, 0.3], [0.6, 0.3],
        ].map(([x, z], i) => (
          <mesh key={i} position={[x, 0.2, z]} castShadow receiveShadow>
            <boxGeometry args={[0.05, 0.4, 0.05]} />
            <meshStandardMaterial color={p.woodDark} roughness={0.7} />
          </mesh>
        ))}
      </group>

      {/* Rug */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, -0.6]} receiveShadow>
        <planeGeometry args={[3.2, 2.2]} />
        <meshStandardMaterial color={p.fabric} roughness={1.0} />
      </mesh>

      {/* Armchair */}
      <group position={[2.0, 0, 0.8]} rotation={[0, -Math.PI / 4, 0]}>
        <mesh position={[0, 0.225, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.95, 0.45, 0.95]} />
          <meshStandardMaterial color={p.accent} roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.6, -0.4]} castShadow receiveShadow>
          <boxGeometry args={[0.95, 0.7, 0.18]} />
          <meshStandardMaterial color={p.accent} roughness={0.7} />
        </mesh>
      </group>

      {/* Bookshelf */}
      <group position={[-2.85, 0, 0]}>
        <mesh position={[0, 1.2, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.25, 2.4, 1.3]} />
          <meshStandardMaterial color={p.wood} roughness={0.7} />
        </mesh>
        <Books p={p} />
      </group>

      {/* Floor lamp */}
      <group position={[-2.4, 0, -1.9]}>
        <mesh position={[0, 0.8, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.025, 0.025, 1.6, 16]} />
          <meshStandardMaterial color={p.shelf} roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.02, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.18, 0.18, 0.04, 24]} />
          <meshStandardMaterial color={p.shelf} roughness={0.7} />
        </mesh>
        <mesh position={[0, 1.7, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.28, 0.4, 24, 1, true]} />
          <meshStandardMaterial
            color={0xfff4e0}
            roughness={0.7}
            side={THREE.DoubleSide}
            emissive={0xffe8b5}
            emissiveIntensity={0.3}
          />
        </mesh>
        <pointLight position={[0, 1.55, 0]} color={0xffe0a0} intensity={0.6} distance={4} decay={2} />
      </group>

      <Plant p={p} />

      {/* Side table + small lamp */}
      <group position={[-1.7, 0, -1.0]}>
        <mesh position={[0, 0.55, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.28, 0.28, 0.04, 24]} />
          <meshStandardMaterial color={p.wood} roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.275, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.04, 0.04, 0.55, 16]} />
          <meshStandardMaterial color={p.woodDark} roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.62, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.08, 0.08, 0.08, 16]} />
          <meshStandardMaterial color={p.shelf} roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.74, 0]}>
          <coneGeometry args={[0.13, 0.16, 16, 1, true]} />
          <meshStandardMaterial color={0xfff4e0} roughness={0.7} side={THREE.DoubleSide} />
        </mesh>
      </group>

      {/* Wall art */}
      <mesh position={[-0.9, 1.9, -ROOM_D / 2 + 0.03]} castShadow>
        <boxGeometry args={[0.7, 0.5, 0.04]} />
        <meshStandardMaterial color={p.accent} roughness={0.7} />
      </mesh>
      <mesh position={[0.0, 2.0, -ROOM_D / 2 + 0.03]} castShadow>
        <boxGeometry args={[0.5, 0.4, 0.04]} />
        <meshStandardMaterial color={p.sage} roughness={0.7} />
      </mesh>
      <mesh position={[0.7, 1.9, -ROOM_D / 2 + 0.03]} castShadow>
        <boxGeometry args={[0.4, 0.3, 0.04]} />
        <meshStandardMaterial color={p.fabric} roughness={0.7} />
      </mesh>
    </>
  );
}

export default function HeroScene() {
  return (
    <WebGLFallback
      fallback={
        <div className="flex h-full w-full items-center justify-center text-center text-sm text-muted-foreground">
          [3D Preview Not Available]
        </div>
      }
    >
      <Canvas
        shadows
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        style={{ width: "100%", height: "100%", display: "block" }}
      >
        <Scene />
      </Canvas>
    </WebGLFallback>
  );
}
