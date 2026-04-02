import { useGameStore } from "@/store/useGameStore";
import { Sky } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

function ToonMesh({
  geometry,
  position,
  rotation,
  color,
  scale = [1, 1, 1],
}: {
  geometry: THREE.BufferGeometry;
  position: [number, number, number];
  rotation?: [number, number, number];
  color: string;
  scale?: [number, number, number];
}) {
  const outlineScale: [number, number, number] = [
    scale[0] * 1.06,
    scale[1] * 1.06,
    scale[2] * 1.06,
  ];
  return (
    <group position={position} rotation={rotation}>
      <mesh geometry={geometry} scale={scale}>
        <meshToonMaterial color={color} />
      </mesh>
      <mesh geometry={geometry} scale={outlineScale}>
        <meshBasicMaterial color="#000000" side={THREE.BackSide} />
      </mesh>
    </group>
  );
}

// Rock prop
function Rock({
  position,
  scale,
  rotation,
}: {
  position: [number, number, number];
  scale: number;
  rotation?: number;
}) {
  const geo = useMemo(() => new THREE.DodecahedronGeometry(1, 0), []);
  return (
    <ToonMesh
      geometry={geo}
      position={position}
      rotation={[0, rotation ?? 0, 0]}
      color="#8B7355"
      scale={[scale * 1.2, scale * 0.7, scale]}
    />
  );
}

// Rubble pile: cluster of small rocks in dark grey
function RubblePile({ cx, cz }: { cx: number; cz: number }) {
  const pieces = useMemo(() => {
    const arr: Array<{ dx: number; dz: number; s: number; ry: number }> = [];
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2 + Math.random();
      const r = 0.3 + Math.random() * 0.7;
      arr.push({
        dx: Math.cos(angle) * r,
        dz: Math.sin(angle) * r,
        s: 0.15 + Math.random() * 0.2,
        ry: Math.random() * Math.PI,
      });
    }
    return arr;
  }, []);
  const geo = useMemo(() => new THREE.DodecahedronGeometry(1, 0), []);

  return (
    <>
      {pieces.map((p, i) => (
        <ToonMesh
          key={`rubble-${cx.toFixed(1)}-${cz.toFixed(1)}-${i}`}
          geometry={geo}
          position={[cx + p.dx, p.s * 0.5, cz + p.dz]}
          rotation={[0, p.ry, 0]}
          color="#4A4040"
          scale={[p.s * 1.3, p.s * 0.8, p.s]}
        />
      ))}
    </>
  );
}

// Barrel prop
function Barrel({ position }: { position: [number, number, number] }) {
  const geo = useMemo(() => new THREE.CylinderGeometry(0.5, 0.5, 1.2, 8), []);
  return (
    <ToonMesh
      geometry={geo}
      position={position}
      color="#E87A1D"
      scale={[1, 1, 1]}
    />
  );
}

// Crate prop
function Crate({ position }: { position: [number, number, number] }) {
  const geo = useMemo(() => new THREE.BoxGeometry(1.2, 1.2, 1.2), []);
  return (
    <ToonMesh
      geometry={geo}
      position={[position[0], position[1] + 0.6, position[2]]}
      color="#C4A35A"
      scale={[1, 1, 1]}
    />
  );
}

// Dirt road path
function DirtRoad({
  x,
  z,
  width,
  length,
  rotation = 0,
}: {
  x: number;
  z: number;
  width: number;
  length: number;
  rotation?: number;
}) {
  const geo = useMemo(
    () => new THREE.PlaneGeometry(width, length),
    [width, length],
  );
  return (
    <mesh
      geometry={geo}
      position={[x, 0.015, z]}
      rotation={[-Math.PI / 2, 0, rotation]}
      receiveShadow
    >
      <meshToonMaterial color="#7A6040" />
    </mesh>
  );
}

// Crater
function Crater({ x, z, r }: { x: number; z: number; r: number }) {
  const geo = useMemo(() => new THREE.CircleGeometry(r, 16), [r]);
  return (
    <mesh
      geometry={geo}
      position={[x, 0.005, z]}
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <meshToonMaterial color="#6B5540" />
    </mesh>
  );
}

// Scorch mark (blast burn on ground)
function ScorchMark({
  x,
  z,
  r,
  rot = 0,
}: { x: number; z: number; r: number; rot?: number }) {
  const geo = useMemo(() => new THREE.CircleGeometry(r, 12), [r]);
  return (
    <mesh
      geometry={geo}
      position={[x, 0.01, z]}
      rotation={[-Math.PI / 2, 0, rot]}
    >
      <meshToonMaterial color="#2A1A0A" />
    </mesh>
  );
}

// Tire track
function TireTrack({
  x,
  z,
  len,
  rot = 0,
}: { x: number; z: number; len: number; rot?: number }) {
  const geo = useMemo(() => new THREE.PlaneGeometry(0.6, len), [len]);
  return (
    <mesh
      geometry={geo}
      position={[x, 0.012, z]}
      rotation={[-Math.PI / 2, 0, rot]}
    >
      <meshToonMaterial color="#5A4530" />
    </mesh>
  );
}

// Dry grass patch
function GrassPatch({
  x,
  z,
  w,
  h,
  rot = 0,
}: { x: number; z: number; w: number; h: number; rot?: number }) {
  const geo = useMemo(() => new THREE.PlaneGeometry(w, h), [w, h]);
  return (
    <mesh
      geometry={geo}
      position={[x, 0.009, z]}
      rotation={[-Math.PI / 2, 0, rot]}
    >
      <meshToonMaterial color="#8A7A30" />
    </mesh>
  );
}

// Concrete barrier slab
function ConcreteBarrier({
  x,
  z,
  length,
  rotation = 0,
}: {
  x: number;
  z: number;
  length: number;
  rotation?: number;
}) {
  const geo = useMemo(() => new THREE.BoxGeometry(length, 1.5, 0.6), [length]);
  return (
    <group position={[x, 0.75, z]} rotation={[0, rotation, 0]}>
      <mesh geometry={geo}>
        <meshToonMaterial color="#6A6A6A" />
      </mesh>
      <mesh geometry={geo} scale={[1.04, 1.06, 1.5]}>
        <meshBasicMaterial color="#000000" side={THREE.BackSide} />
      </mesh>
    </group>
  );
}

// Fuel drum cluster (3 drums together)
function FuelDrumCluster({
  x,
  z,
  rot = 0,
}: { x: number; z: number; rot?: number }) {
  const geo = useMemo(() => new THREE.CylinderGeometry(0.45, 0.45, 1.1, 8), []);
  return (
    <group position={[x, 0, z]} rotation={[0, rot, 0]}>
      <ToonMesh geometry={geo} position={[0, 0.55, 0]} color="#C84020" />
      <ToonMesh geometry={geo} position={[0.9, 0.55, 0]} color="#C87820" />
      <ToonMesh geometry={geo} position={[0.45, 0.55, 0.78]} color="#A84020" />
    </group>
  );
}

// Ammo crate stack (2 stacked crates)
function AmmoCrateStack({
  x,
  z,
  rot = 0,
}: { x: number; z: number; rot?: number }) {
  const geoLarge = useMemo(() => new THREE.BoxGeometry(1.4, 0.9, 0.9), []);
  const geoSmall = useMemo(() => new THREE.BoxGeometry(1.0, 0.7, 0.8), []);
  return (
    <group position={[x, 0, z]} rotation={[0, rot, 0]}>
      <ToonMesh geometry={geoLarge} position={[0, 0.45, 0]} color="#5A6B3A" />
      <ToonMesh
        geometry={geoSmall}
        position={[0, 1.25, 0.05]}
        color="#4A5B2A"
      />
    </group>
  );
}

// Burned / destroyed static vehicle (tank-like wreck)
function BurnedTank({ x, z, rot = 0 }: { x: number; z: number; rot?: number }) {
  const bodyGeo = useMemo(() => new THREE.BoxGeometry(4.5, 1.4, 2.4), []);
  const turretGeo = useMemo(() => new THREE.BoxGeometry(2.0, 0.9, 1.6), []);
  const barrelGeo = useMemo(
    () => new THREE.CylinderGeometry(0.12, 0.12, 2.5, 7),
    [],
  );
  const trackGeo = useMemo(() => new THREE.BoxGeometry(4.6, 0.5, 0.55), []);
  return (
    <group position={[x, 0, z]} rotation={[0, rot, 0]}>
      {/* Body */}
      <ToonMesh geometry={bodyGeo} position={[0, 0.7, 0]} color="#3A3020" />
      {/* Left/right tracks */}
      <ToonMesh
        geometry={trackGeo}
        position={[0, 0.25, -1.35]}
        color="#2A2010"
      />
      <ToonMesh
        geometry={trackGeo}
        position={[0, 0.25, 1.35]}
        color="#2A2010"
      />
      {/* Turret */}
      <ToonMesh
        geometry={turretGeo}
        position={[0.2, 1.85, 0]}
        color="#4A3A20"
      />
      {/* Barrel (tilted down for wrecked look) */}
      <group position={[1.1, 2.2, 0]} rotation={[0, 0, -0.3]}>
        <ToonMesh
          geometry={barrelGeo}
          position={[0, 0, 0]}
          rotation={[0, 0, Math.PI / 2]}
          color="#2A2010"
        />
      </group>
    </group>
  );
}

// Burned truck wreck
function BurnedTruck({
  x,
  z,
  rot = 0,
}: { x: number; z: number; rot?: number }) {
  const cabGeo = useMemo(() => new THREE.BoxGeometry(2.2, 2.0, 2.2), []);
  const bedGeo = useMemo(() => new THREE.BoxGeometry(3.8, 1.0, 2.2), []);
  const wheelGeo = useMemo(
    () => new THREE.CylinderGeometry(0.5, 0.5, 0.3, 10),
    [],
  );
  return (
    <group position={[x, 0, z]} rotation={[0, rot, 0]}>
      {/* Bed */}
      <ToonMesh geometry={bedGeo} position={[-1.0, 0.5, 0]} color="#3A3020" />
      {/* Cab */}
      <ToonMesh geometry={cabGeo} position={[1.8, 1.0, 0]} color="#2A2020" />
      {/* Wheels */}
      <ToonMesh
        geometry={wheelGeo}
        position={[-2.0, 0.5, -1.2]}
        rotation={[Math.PI / 2, 0, 0]}
        color="#1A1A1A"
      />
      <ToonMesh
        geometry={wheelGeo}
        position={[-2.0, 0.5, 1.2]}
        rotation={[Math.PI / 2, 0, 0]}
        color="#1A1A1A"
      />
      <ToonMesh
        geometry={wheelGeo}
        position={[1.8, 0.5, -1.2]}
        rotation={[Math.PI / 2, 0, 0]}
        color="#1A1A1A"
      />
      <ToonMesh
        geometry={wheelGeo}
        position={[1.8, 0.5, 1.2]}
        rotation={[Math.PI / 2, 0, 0]}
        color="#1A1A1A"
      />
    </group>
  );
}

// Water tower
function WaterTower({ x, z }: { x: number; z: number }) {
  const legGeo = useMemo(
    () => new THREE.CylinderGeometry(0.15, 0.15, 8, 6),
    [],
  );
  const tankGeo = useMemo(
    () => new THREE.CylinderGeometry(2.2, 2.2, 3.5, 10),
    [],
  );
  const roofGeo = useMemo(() => new THREE.ConeGeometry(2.4, 1.5, 10), []);
  const ringGeo = useMemo(() => new THREE.TorusGeometry(2.2, 0.08, 6, 20), []);
  const legPositions: [number, number][] = [
    [1.5, 0],
    [-1.5, 0],
    [0, 1.5],
    [0, -1.5],
  ];
  return (
    <group position={[x, 0, z]}>
      {legPositions.map(([lx, lz]) => (
        <ToonMesh
          key={`leg-${lx}-${lz}`}
          geometry={legGeo}
          position={[lx, 4, lz]}
          color="#7A6040"
        />
      ))}
      {/* Horizontal braces */}
      <ToonMesh
        geometry={new THREE.BoxGeometry(3.2, 0.12, 0.12)}
        position={[0, 6, 0]}
        color="#6A5030"
      />
      <ToonMesh
        geometry={new THREE.BoxGeometry(0.12, 0.12, 3.2)}
        position={[0, 6, 0]}
        color="#6A5030"
      />
      {/* Tank */}
      <ToonMesh geometry={tankGeo} position={[0, 9.75, 0]} color="#8A8A7A" />
      <mesh geometry={ringGeo} position={[x, 9.0, z]}>
        <meshToonMaterial color="#6A6A5A" />
      </mesh>
      <mesh geometry={ringGeo} position={[x, 10.5, z]}>
        <meshToonMaterial color="#6A6A5A" />
      </mesh>
      {/* Roof */}
      <ToonMesh geometry={roofGeo} position={[0, 12.25, 0]} color="#5A5A4A" />
    </group>
  );
}

// Guard post / watchtower
function WatchTower({ x, z, rot = 0 }: { x: number; z: number; rot?: number }) {
  const postGeo = useMemo(
    () => new THREE.CylinderGeometry(0.12, 0.14, 6, 7),
    [],
  );
  const platformGeo = useMemo(() => new THREE.BoxGeometry(2.8, 0.2, 2.8), []);
  const railGeo = useMemo(() => new THREE.BoxGeometry(2.8, 0.8, 0.1), []);
  const roofGeo = useMemo(() => new THREE.BoxGeometry(3.2, 0.15, 3.2), []);
  const roofPostGeo = useMemo(
    () => new THREE.CylinderGeometry(0.06, 0.06, 1.5, 5),
    [],
  );
  return (
    <group position={[x, 0, z]} rotation={[0, rot, 0]}>
      {/* 4 corner legs */}
      {(
        [
          [-1, -1],
          [1, -1],
          [-1, 1],
          [1, 1],
        ] as [number, number][]
      ).map(([lx, lz]) => (
        <ToonMesh
          key={`wt-leg-${lx}-${lz}`}
          geometry={postGeo}
          position={[lx, 3, lz]}
          color="#7A6040"
        />
      ))}
      {/* Platform */}
      <ToonMesh geometry={platformGeo} position={[0, 6.1, 0]} color="#8A7050" />
      {/* 4 side rails */}
      <ToonMesh geometry={railGeo} position={[0, 6.5, -1.35]} color="#7A6040" />
      <ToonMesh geometry={railGeo} position={[0, 6.5, 1.35]} color="#7A6040" />
      <ToonMesh
        geometry={new THREE.BoxGeometry(0.1, 0.8, 2.8)}
        position={[-1.35, 6.5, 0]}
        color="#7A6040"
      />
      <ToonMesh
        geometry={new THREE.BoxGeometry(0.1, 0.8, 2.8)}
        position={[1.35, 6.5, 0]}
        color="#7A6040"
      />
      {/* Roof posts */}
      {(
        [
          [-1, -1],
          [1, -1],
          [-1, 1],
          [1, 1],
        ] as [number, number][]
      ).map(([lx, lz]) => (
        <ToonMesh
          key={`wt-rp-${lx}-${lz}`}
          geometry={roofPostGeo}
          position={[lx, 7.55, lz]}
          color="#7A6040"
        />
      ))}
      <ToonMesh geometry={roofGeo} position={[0, 8.35, 0]} color="#5A4030" />
    </group>
  );
}

// Sandbag wall segment (static decoration)
function SandbagWall({
  x,
  z,
  len,
  rot = 0,
}: { x: number; z: number; len: number; rot?: number }) {
  const bagGeo = useMemo(() => new THREE.BoxGeometry(0.8, 0.4, 0.5), []);
  const count = Math.round(len / 0.85);
  return (
    <group position={[x, 0, z]} rotation={[0, rot, 0]}>
      {Array.from({ length: count }).map((_, i) => {
        const bx = (i - (count - 1) / 2) * 0.85;
        const jitter = ((i * 17) % 7) * 0.01 - 0.03;
        return (
          <ToonMesh
            key={`sb-${bx.toFixed(2)}`}
            geometry={bagGeo}
            position={[bx, 0.2 + jitter, 0]}
            rotation={[0, jitter * 2, 0]}
            color="#C4A84A"
          />
        );
      })}
      {/* Second row offset */}
      {Array.from({ length: count - 1 }).map((_, i) => {
        const bx = (i - (count - 2) / 2) * 0.85;
        const jitter = ((i * 13) % 7) * 0.01;
        return (
          <ToonMesh
            key={`sb2-${bx.toFixed(2)}`}
            geometry={bagGeo}
            position={[bx, 0.62 + jitter, 0]}
            rotation={[0, jitter * 3, 0]}
            color="#B89840"
          />
        );
      })}
    </group>
  );
}

// Military tent
function MilitaryTent({
  x,
  z,
  rot = 0,
}: { x: number; z: number; rot?: number }) {
  // Main tarp body (flattened box) — kept for potential future use
  const _bodyGeo = useMemo(() => new THREE.BoxGeometry(5, 0.1, 3.5), []);
  // Ridge pole
  const ridgeGeo = useMemo(
    () => new THREE.CylinderGeometry(0.06, 0.06, 5, 6),
    [],
  );
  // Side panel triangles approximated with flat boxes — kept for potential future use
  const _sideGeo = useMemo(() => new THREE.BoxGeometry(0.1, 2, 3.5), []);
  return (
    <group position={[x, 0, z]} rotation={[0, rot, 0]}>
      {/* Tent roof - two angled planes */}
      <mesh position={[0, 1.5, -0.875]} rotation={[Math.PI / 5, 0, 0]}>
        <planeGeometry args={[5, 2.2]} />
        <meshToonMaterial color="#6B7A4A" side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 1.5, 0.875]} rotation={[-Math.PI / 5, 0, 0]}>
        <planeGeometry args={[5, 2.2]} />
        <meshToonMaterial color="#5A6A3A" side={THREE.DoubleSide} />
      </mesh>
      {/* Ridge pole */}
      <ToonMesh
        geometry={ridgeGeo}
        position={[0, 2.1, 0]}
        rotation={[0, 0, Math.PI / 2]}
        color="#7A6040"
      />
      {/* Corner poles */}
      {(
        [
          [-2.4, -1.6],
          [2.4, -1.6],
          [-2.4, 1.6],
          [2.4, 1.6],
        ] as [number, number][]
      ).map(([px, pz]) => (
        <ToonMesh
          key={`tent-pole-${px}-${pz}`}
          geometry={new THREE.CylinderGeometry(0.05, 0.05, 2.2, 5)}
          position={[px, 1.1, pz]}
          color="#8A7050"
        />
      ))}
      {/* Ground cloth */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[5, 3.5]} />
        <meshToonMaterial color="#4A5A2A" />
      </mesh>
    </group>
  );
}

// Street lamp
function StreetLamp({ x, z }: { x: number; z: number }) {
  const poleGeo = useMemo(
    () => new THREE.CylinderGeometry(0.08, 0.12, 7, 7),
    [],
  );
  const armGeo = useMemo(
    () => new THREE.CylinderGeometry(0.05, 0.05, 2, 5),
    [],
  );
  const headGeo = useMemo(() => new THREE.BoxGeometry(0.5, 0.25, 0.4), []);
  return (
    <group position={[x, 0, z]}>
      <ToonMesh geometry={poleGeo} position={[0, 3.5, 0]} color="#4A4A4A" />
      {/* Arm */}
      <group position={[0, 7.0, 0]} rotation={[0, 0, -Math.PI / 8]}>
        <ToonMesh
          geometry={armGeo}
          position={[1.0, 0, 0]}
          rotation={[0, 0, Math.PI / 2]}
          color="#3A3A3A"
        />
        <ToonMesh
          geometry={headGeo}
          position={[2.0, -0.15, 0]}
          color="#FFCC44"
        />
      </group>
    </group>
  );
}

// Jeep wreck
function JeepWreck({ x, z, rot = 0 }: { x: number; z: number; rot?: number }) {
  const bodyGeo = useMemo(() => new THREE.BoxGeometry(3.2, 1.1, 1.8), []);
  const cabGeo = useMemo(() => new THREE.BoxGeometry(1.6, 0.9, 1.7), []);
  const wheelGeo = useMemo(
    () => new THREE.CylinderGeometry(0.45, 0.45, 0.25, 8),
    [],
  );
  return (
    <group position={[x, 0, z]} rotation={[0, rot, 0]}>
      <ToonMesh geometry={bodyGeo} position={[0, 0.55, 0]} color="#4A5530" />
      <ToonMesh geometry={cabGeo} position={[0.4, 1.4, 0]} color="#3A4520" />
      {[
        [-1.2, -1.0],
        [-1.2, 1.0],
        [1.1, -1.0],
        [1.1, 1.0],
      ].map(([wx, wz]) => (
        <ToonMesh
          key={`jw-${wx}-${wz}`}
          geometry={wheelGeo}
          position={[wx, 0.45, wz]}
          rotation={[Math.PI / 2, 0, 0]}
          color="#1A1A1A"
        />
      ))}
    </group>
  );
}

// Ammo boxes scattered
function AmmoBox({ position }: { position: [number, number, number] }) {
  const geo = useMemo(() => new THREE.BoxGeometry(0.9, 0.5, 0.6), []);
  return (
    <ToonMesh
      geometry={geo}
      position={[position[0], position[1] + 0.25, position[2]]}
      color="#4A6030"
    />
  );
}

// Sandbag nest (circular arrangement for gun position)
function SandbagNest({ x, z }: { x: number; z: number }) {
  const bagGeo = useMemo(() => new THREE.BoxGeometry(0.8, 0.45, 0.5), []);
  const count = 8;
  return (
    <group position={[x, 0, z]}>
      {Array.from({ length: count }).map((_, i) => {
        const angle = (i / count) * Math.PI * 2;
        const r = 1.6;
        return (
          <ToonMesh
            key={`sbn-${angle.toFixed(3)}`}
            geometry={bagGeo}
            position={[Math.cos(angle) * r, 0.22, Math.sin(angle) * r]}
            rotation={[0, angle + Math.PI / 2, 0]}
            color="#C4A84A"
          />
        );
      })}
      {/* Second layer offset */}
      {Array.from({ length: count }).map((_, i) => {
        const angle = (i / count) * Math.PI * 2 + Math.PI / count;
        const r = 1.6;
        return (
          <ToonMesh
            key={`sbn2-${angle.toFixed(3)}`}
            geometry={bagGeo}
            position={[Math.cos(angle) * r, 0.65, Math.sin(angle) * r]}
            rotation={[0, angle + Math.PI / 2, 0]}
            color="#B89840"
          />
        );
      })}
    </group>
  );
}

// Rising smoke ambient emitter
function AmbientSmoke({ x, z }: { x: number; z: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const particlesRef = useRef<
    Array<{
      mesh: THREE.Mesh;
      vy: number;
      life: number;
      maxLife: number;
      vx: number;
      vz: number;
    }>
  >([]);
  const timeRef = useRef(0);

  useMemo(() => {
    // pre-create particles
    const particles: Array<{
      mesh: THREE.Mesh;
      vy: number;
      life: number;
      maxLife: number;
      vx: number;
      vz: number;
    }> = [];
    for (let i = 0; i < 6; i++) {
      const geo = new THREE.SphereGeometry(0.3 + Math.random() * 0.4, 5, 4);
      const mat = new THREE.MeshBasicMaterial({
        color: "#3A3A3A",
        transparent: true,
        opacity: 0,
      });
      const mesh = new THREE.Mesh(geo, mat);
      particles.push({
        mesh,
        vy: 0.5 + Math.random() * 0.5,
        life: Math.random() * 3,
        maxLife: 3 + Math.random() * 2,
        vx: (Math.random() - 0.5) * 0.3,
        vz: (Math.random() - 0.5) * 0.3,
      });
    }
    particlesRef.current = particles;
    return particles;
  }, []);

  useFrame((_, delta) => {
    timeRef.current += delta;
    const group = groupRef.current;
    if (!group) return;

    for (const p of particlesRef.current) {
      p.life += delta;
      if (p.life > p.maxLife) {
        p.life = 0;
        p.mesh.position.set(
          x + (Math.random() - 0.5) * 1.0,
          0.5,
          z + (Math.random() - 0.5) * 1.0,
        );
        if (!p.mesh.parent) group.add(p.mesh);
      }

      const t = p.life / p.maxLife;
      p.mesh.position.x += p.vx * delta;
      p.mesh.position.y += p.vy * delta;
      p.mesh.position.z += p.vz * delta;
      p.mesh.scale.setScalar(0.5 + t * 2);

      // fade in and out
      const opacity =
        t < 0.2 ? (t / 0.2) * 0.4 : t > 0.7 ? ((1 - t) / 0.3) * 0.4 : 0.4;
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = opacity;
    }
  });

  return <group ref={groupRef} />;
}

export function Environment() {
  const groundRef = useRef<THREE.Mesh>(null);
  const fogRef = useRef<THREE.Fog | null>(null);
  const ambientLightRef = useRef<THREE.AmbientLight>(null);
  const { skyFlashIntensity, setSkyFlashIntensity } = useGameStore();

  useFrame((_state, delta) => {
    const intensity = useGameStore.getState().skyFlashIntensity;
    if (intensity > 0) {
      const decayRate = intensity > 0.5 ? 2.5 : 0.12;
      setSkyFlashIntensity(Math.max(0, intensity - delta * decayRate));
    }

    if (fogRef.current) {
      const fog = fogRef.current;
      const normalR = 0.769;
      const normalG = 0.447;
      const normalB = 0.165;
      const flashR = 1.0;
      const flashG = 0.333;
      const flashB = 0.0;
      const i = Math.min(1, intensity * 1.5);
      fog.color.setRGB(
        normalR + (flashR - normalR) * i,
        normalG + (flashG - normalG) * i,
        normalB + (flashB - normalB) * i,
      );
    }

    if (ambientLightRef.current) {
      const baseIntensity = 0.5;
      const peakIntensity = 4.0;
      ambientLightRef.current.intensity =
        baseIntensity +
        (peakIntensity - baseIntensity) * Math.min(1, intensity * 2);
    }
  });

  void skyFlashIntensity;

  const groundGeo = useMemo(() => new THREE.PlaneGeometry(300, 300), []);

  const terrainPatches = useMemo<
    Array<{
      x: number;
      z: number;
      w: number;
      h: number;
      rot: number;
      col: string;
    }>
  >(
    () => [
      { x: -25, z: 15, w: 40, h: 30, rot: 0.3, col: "#B89A55" },
      { x: 30, z: -20, w: 35, h: 28, rot: -0.5, col: "#BFA060" },
      { x: -50, z: -30, w: 30, h: 22, rot: 1.1, col: "#C4A355" },
      { x: 45, z: 35, w: 38, h: 25, rot: -0.2, col: "#B09050" },
      { x: -10, z: 55, w: 28, h: 22, rot: 0.7, col: "#AA8845" },
      { x: 20, z: -55, w: 32, h: 20, rot: -1.0, col: "#BFA060" },
      { x: -60, z: 20, w: 25, h: 18, rot: 0.9, col: "#B89A55" },
      { x: 60, z: -40, w: 22, h: 20, rot: -0.6, col: "#C2A060" },
      { x: 5, z: -15, w: 18, h: 14, rot: 0.2, col: "#BBA258" },
      { x: -35, z: 45, w: 20, h: 16, rot: -0.8, col: "#B09A50" },
    ],
    [],
  );

  const rockPositions: Array<[[number, number, number], number]> = [
    [[-15, 0.35, -8], 0.8],
    [[12, 0.35, 15], 1.2],
    [[-20, 0.35, 20], 0.6],
    [[25, 0.35, -18], 1.0],
    [[-8, 0.35, -25], 0.7],
    [[18, 0.35, -10], 0.5],
    [[-30, 0.35, 5], 1.1],
    [[5, 0.35, 28], 0.9],
    [[28, 0.35, 28], 0.75],
    [[-22, 0.35, -30], 1.3],
    [[40, 0.35, -5], 0.6],
    [[-40, 0.35, 15], 0.9],
    [[-55, 0.35, -10], 0.7],
    [[60, 0.35, 10], 1.0],
    [[-15, 0.35, 50], 0.8],
    [[35, 0.35, 55], 0.9],
    [[-45, 0.35, 55], 1.1],
    [[70, 0.35, -35], 0.7],
    [[-70, 0.35, -30], 1.0],
    [[65, 0.35, 50], 0.8],
  ];

  const barrelPositions: [number, number, number][] = [
    [-12, 0.6, 10],
    [8, 0.6, -14],
    [20, 0.6, 5],
    [-5, 0.6, 18],
    [15, 0.6, -22],
    [-35, 0.6, -5],
    [50, 0.6, -20],
    [-28, 0.6, 32],
    [38, 0.6, 30],
    [-48, 0.6, -20],
  ];

  const cratePositions: [number, number, number][] = [
    [-18, 0, -12],
    [10, 0, 20],
    [-25, 0, 8],
    [22, 0, -8],
    [40, 0, 15],
    [-45, 0, 25],
    [32, 0, -30],
    [-12, 0, -38],
    [55, 0, 20],
    [-60, 0, -5],
  ];

  const perimeterBarriers = useMemo<
    Array<{ x: number; z: number; len: number; rot: number }>
  >(
    () => [
      { x: -55, z: -78, len: 22, rot: 0 },
      { x: -25, z: -80, len: 28, rot: 0.06 },
      { x: 8, z: -79, len: 25, rot: -0.04 },
      { x: 40, z: -77, len: 20, rot: 0.08 },
      { x: 65, z: -76, len: 16, rot: -0.1 },
      { x: -60, z: 78, len: 20, rot: 0.05 },
      { x: -32, z: 80, len: 26, rot: -0.07 },
      { x: 0, z: 79, len: 22, rot: 0.04 },
      { x: 30, z: 77, len: 20, rot: 0.09 },
      { x: 60, z: 78, len: 18, rot: -0.05 },
      { x: -79, z: -55, len: 18, rot: Math.PI / 2 + 0.05 },
      { x: -81, z: -25, len: 24, rot: Math.PI / 2 - 0.04 },
      { x: -80, z: 8, len: 20, rot: Math.PI / 2 + 0.07 },
      { x: -78, z: 38, len: 22, rot: Math.PI / 2 - 0.06 },
      { x: -77, z: 65, len: 16, rot: Math.PI / 2 + 0.03 },
      { x: 80, z: -60, len: 18, rot: Math.PI / 2 - 0.04 },
      { x: 78, z: -30, len: 22, rot: Math.PI / 2 + 0.06 },
      { x: 81, z: 5, len: 20, rot: Math.PI / 2 - 0.08 },
      { x: 79, z: 35, len: 24, rot: Math.PI / 2 + 0.04 },
      { x: 78, z: 65, len: 18, rot: Math.PI / 2 - 0.05 },
    ],
    [],
  );

  return (
    <>
      {/* Sky */}
      <Sky
        distance={450000}
        sunPosition={[1, 0.3, 0]}
        inclination={0.55}
        azimuth={0.2}
        mieCoefficient={0.01}
        mieDirectionalG={0.9}
        rayleigh={3}
        turbidity={10}
      />

      {/* Fog */}
      <fog
        ref={fogRef as React.Ref<THREE.Fog>}
        attach="fog"
        args={["#C4722A", 60, 130]}
      />

      {/* Lighting */}
      <ambientLight ref={ambientLightRef} color="#E8A060" intensity={0.5} />
      <directionalLight
        color="#FFB347"
        intensity={1.8}
        position={[30, 50, 20]}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <directionalLight
        color="#FF6B35"
        intensity={0.5}
        position={[-20, 10, -30]}
      />
      <hemisphereLight args={["#FF8C42", "#4A2C0A", 0.3]} />

      {/* Main ground plane */}
      <mesh
        ref={groundRef}
        geometry={groundGeo}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        receiveShadow
      >
        <meshToonMaterial color="#C4A35A" />
      </mesh>

      {/* Terrain variation overlays */}
      {terrainPatches.map((patch) => (
        <mesh
          key={`terrain-${patch.x.toFixed(0)}-${patch.z.toFixed(0)}`}
          position={[patch.x, 0.008, patch.z]}
          rotation={[-Math.PI / 2, 0, patch.rot]}
          receiveShadow
        >
          <planeGeometry args={[patch.w, patch.h]} />
          <meshToonMaterial color={patch.col} />
        </mesh>
      ))}

      {/* Dry grass patches */}
      <GrassPatch x={-18} z={22} w={8} h={5} rot={0.4} />
      <GrassPatch x={28} z={-15} w={6} h={4} rot={-0.6} />
      <GrassPatch x={-40} z={-25} w={10} h={7} rot={1.2} />
      <GrassPatch x={50} z={30} w={7} h={5} rot={0.2} />
      <GrassPatch x={-5} z={-45} w={9} h={6} rot={-0.9} />
      <GrassPatch x={42} z={-48} w={8} h={4} rot={0.7} />
      <GrassPatch x={-55} z={35} w={11} h={6} rot={-0.3} />
      <GrassPatch x={15} z={60} w={7} h={5} rot={0.5} />
      <GrassPatch x={-30} z={60} w={9} h={4} rot={-1.1} />
      <GrassPatch x={65} z={-10} w={6} h={8} rot={0.9} />

      {/* Tire tracks */}
      <TireTrack x={-2} z={15} len={30} rot={0.1} />
      <TireTrack x={2} z={15} len={30} rot={0.1} />
      <TireTrack x={-30} z={-5} len={25} rot={Math.PI / 2 + 0.15} />
      <TireTrack x={22} z={-35} len={20} rot={-0.3} />
      <TireTrack x={40} z={20} len={18} rot={0.7} />

      {/* Scorch marks (pre-existing damage) */}
      <ScorchMark x={-18} z={30} r={3.5} rot={0.4} />
      <ScorchMark x={25} z={-20} r={2.8} rot={-0.6} />
      <ScorchMark x={-5} z={-40} r={4.2} rot={1.1} />
      <ScorchMark x={50} z={18} r={3.0} rot={0.2} />
      <ScorchMark x={-42} z={-38} r={2.5} rot={-0.8} />
      <ScorchMark x={60} z={-30} r={3.8} rot={0.5} />

      {/* Dirt roads */}
      <DirtRoad x={0} z={0} width={6} length={160} rotation={0} />
      <DirtRoad x={0} z={0} width={6} length={160} rotation={Math.PI / 2} />
      <DirtRoad x={-30} z={20} width={4} length={80} rotation={0.35} />
      <DirtRoad x={25} z={-25} width={4} length={70} rotation={-0.5} />
      <DirtRoad x={40} z={40} width={5} length={60} rotation={0.8} />
      <DirtRoad x={-45} z={-20} width={4} length={55} rotation={-0.2} />

      {/* Craters */}
      <Crater x={15} z={-12} r={3.5} />
      <Crater x={-22} z={28} r={2.8} />
      <Crater x={10} z={35} r={2.2} />
      <Crater x={-40} z={-18} r={4.0} />
      <Crater x={30} z={50} r={3.2} />
      <Crater x={-8} z={-55} r={2.5} />
      <Crater x={55} z={-40} r={3.8} />
      <Crater x={-60} z={30} r={2.2} />
      <Crater x={35} z={-60} r={2.9} />

      {/* Rubble piles */}
      <RubblePile cx={-32} cz={-12} />
      <RubblePile cx={18} cz={-38} />
      <RubblePile cx={42} cz={22} />
      <RubblePile cx={-14} cz={42} />
      <RubblePile cx={55} cz={-15} />
      <RubblePile cx={-50} cz={50} />
      <RubblePile cx={28} cz={62} />
      <RubblePile cx={-65} cz={-20} />
      <RubblePile cx={70} cz={25} />

      {/* Rocks */}
      {rockPositions.map(([pos, scale], i) => (
        <Rock
          key={`rock-${pos[0].toFixed(1)}-${pos[2].toFixed(1)}`}
          position={pos}
          scale={scale}
          rotation={(i * 1.3) % (Math.PI * 2)}
        />
      ))}

      {/* Barrels */}
      {barrelPositions.map((pos) => (
        <Barrel
          key={`barrel-${pos[0].toFixed(1)}-${pos[2].toFixed(1)}`}
          position={pos}
        />
      ))}

      {/* Crates */}
      {cratePositions.map((pos) => (
        <Crate
          key={`crate-${pos[0].toFixed(1)}-${pos[2].toFixed(1)}`}
          position={pos}
        />
      ))}

      {/* Fuel drum clusters */}
      <FuelDrumCluster x={-22} z={-8} rot={0.3} />
      <FuelDrumCluster x={30} z={12} rot={-0.5} />
      <FuelDrumCluster x={48} z={-28} rot={1.1} />
      <FuelDrumCluster x={-35} z={38} rot={0.7} />
      <FuelDrumCluster x={18} z={-50} rot={-0.2} />
      <FuelDrumCluster x={-62} z={15} rot={0.9} />

      {/* Ammo crate stacks */}
      <AmmoCrateStack x={-14} z={16} rot={0.2} />
      <AmmoCrateStack x={26} z={-10} rot={-0.4} />
      <AmmoCrateStack x={-38} z={-30} rot={0.8} />
      <AmmoCrateStack x={44} z={38} rot={-0.6} />
      <AmmoCrateStack x={-50} z={-42} rot={1.3} />
      <AmmoCrateStack x={62} z={-5} rot={0.1} />
      <AmmoCrateStack x={-25} z={-62} rot={-0.7} />

      {/* Ammo boxes scattered */}
      <AmmoBox position={[-8, 0, -18]} />
      <AmmoBox position={[14, 0, 8]} />
      <AmmoBox position={[-28, 0, 15]} />
      <AmmoBox position={[35, 0, -22]} />
      <AmmoBox position={[-45, 0, 30]} />
      <AmmoBox position={[55, 0, 10]} />
      <AmmoBox position={[-15, 0, -55]} />

      {/* Sandbag walls */}
      <SandbagWall x={-20} z={-5} len={5} rot={0.1} />
      <SandbagWall x={28} z={8} len={4} rot={-0.2} />
      <SandbagWall x={-8} z={22} len={6} rot={Math.PI / 2 + 0.1} />
      <SandbagWall x={42} z={-15} len={5} rot={0.3} />
      <SandbagWall x={-50} z={-10} len={4.5} rot={-0.4} />
      <SandbagWall x={15} z={48} len={5} rot={0.2} />
      <SandbagWall x={-35} z={52} len={4} rot={Math.PI / 4} />
      <SandbagWall x={60} z={40} len={5} rot={-0.1} />

      {/* Sandbag nests (gun positions) */}
      <SandbagNest x={-25} z={-20} />
      <SandbagNest x={30} z={-35} />
      <SandbagNest x={-45} z={28} />
      <SandbagNest x={52} z={-42} />

      {/* Military tents */}
      <MilitaryTent x={-60} z={-50} rot={0.3} />
      <MilitaryTent x={65} z={45} rot={-0.5} />
      <MilitaryTent x={-65} z={48} rot={1.1} />
      <MilitaryTent x={58} z={-62} rot={-0.2} />
      <MilitaryTent x={-20} z={70} rot={0.7} />
      <MilitaryTent x={20} z={-72} rot={-0.4} />

      {/* Street lamps along roads */}
      <StreetLamp x={-4} z={-25} />
      <StreetLamp x={-4} z={-12} />
      <StreetLamp x={-4} z={0} />
      <StreetLamp x={-4} z={12} />
      <StreetLamp x={-4} z={25} />
      <StreetLamp x={-25} z={4} />
      <StreetLamp x={-12} z={4} />
      <StreetLamp x={12} z={4} />
      <StreetLamp x={25} z={4} />
      <StreetLamp x={38} z={4} />

      {/* Burned tanks */}
      <BurnedTank x={-28} z={-40} rot={0.6} />
      <BurnedTank x={35} z={25} rot={-1.1} />
      <BurnedTank x={-48} z={18} rot={2.3} />
      <BurnedTank x={55} z={-30} rot={0.8} />
      <BurnedTank x={-20} z={58} rot={-0.4} />
      <BurnedTank x={28} z={-58} rot={1.5} />

      {/* Burned trucks */}
      <BurnedTruck x={-15} z={-30} rot={0.3} />
      <BurnedTruck x={40} z={-45} rot={-0.7} />
      <BurnedTruck x={-55} z={-35} rot={1.8} />
      <BurnedTruck x={62} z={20} rot={-1.2} />
      <BurnedTruck x={-62} z={-52} rot={0.5} />

      {/* Jeep wrecks */}
      <JeepWreck x={-10} z={-20} rot={0.9} />
      <JeepWreck x={20} z={30} rot={-0.3} />
      <JeepWreck x={-38} z={10} rot={2.1} />
      <JeepWreck x={48} z={-8} rot={0.5} />
      <JeepWreck x={-22} z={48} rot={-1.4} />
      <JeepWreck x={60} z={55} rot={0.7} />
      <JeepWreck x={-58} z={42} rot={-0.2} />

      {/* Water towers */}
      <WaterTower x={-65} z={-65} />
      <WaterTower x={68} z={62} />

      {/* Watch towers */}
      <WatchTower x={-75} z={-75} rot={Math.PI / 4} />
      <WatchTower x={75} z={-75} rot={-Math.PI / 4} />
      <WatchTower x={-75} z={75} rot={Math.PI * 0.75} />
      <WatchTower x={75} z={75} rot={-Math.PI * 0.75} />
      <WatchTower x={0} z={-76} rot={0} />
      <WatchTower x={0} z={76} rot={Math.PI} />
      <WatchTower x={-76} z={0} rot={-Math.PI / 2} />
      <WatchTower x={76} z={0} rot={Math.PI / 2} />

      {/* Perimeter concrete barrier walls */}
      {perimeterBarriers.map((b) => (
        <ConcreteBarrier
          key={`barrier-${b.x.toFixed(0)}-${b.z.toFixed(0)}`}
          x={b.x}
          z={b.z}
          length={b.len}
          rotation={b.rot}
        />
      ))}

      {/* Ambient smoke from burned vehicles */}
      <AmbientSmoke x={-28} z={-40} />
      <AmbientSmoke x={35} z={25} />
      <AmbientSmoke x={-48} z={18} />
      <AmbientSmoke x={55} z={-30} />
      <AmbientSmoke x={-15} z={-30} />
      <AmbientSmoke x={40} z={-45} />
      <AmbientSmoke x={-10} z={-20} />
      <AmbientSmoke x={20} z={30} />
    </>
  );
}
