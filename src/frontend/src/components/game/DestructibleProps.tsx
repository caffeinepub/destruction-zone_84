import type { DestructiblePropState } from "@/store/useGameStore";
import { useGameStore } from "@/store/useGameStore";
import { playChunkDestroy } from "@/utils/soundManager";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

// ── Global debris performance cap for props ──────────────────────────────
let propDebrisCount = 0;
const MAX_PROP_DEBRIS = 80;

interface DebrisPiece {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  angularVelocity: THREE.Vector3;
  life: number;
  maxLife: number;
}

// ── Shared geometry/material cache ──────────────────────────────────────

const DARK_BROWN = "#3A2A1A";
const FENCE_COLOR = "#5A4A3A";
const FOLIAGE_DARK = "#2D5A1B";
const FOLIAGE_LIGHT = "#3D7A25";
const DEBRIS_COLORS_PROP = [
  "#3A3530",
  "#2E2820",
  "#4A3E30",
  "#5A4E3A",
  "#6A5A4A",
];

// ── Helper: hash a string id to a float 0–1 ─────────────────────────────
function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (Math.imul(31, h) + id.charCodeAt(i)) | 0;
  }
  return (h >>> 0) / 0xffffffff;
}

// ═══════════════════════════════════════════════════════════════════════
//  TREE
// ═══════════════════════════════════════════════════════════════════════

function TreeProp({ prop }: { prop: DestructiblePropState }) {
  const h = hashId(prop.id);
  const trunkRadius = 0.2 + h * 0.08;
  const trunkHeight = 3.5 + h * 1.5;

  const trunkGeo = useMemo(
    () =>
      new THREE.CylinderGeometry(
        trunkRadius * 0.7,
        trunkRadius,
        trunkHeight,
        7,
      ),
    [trunkRadius, trunkHeight],
  );
  const foliage1Geo = useMemo(
    () => new THREE.ConeGeometry(1.5 + h * 0.5, 2.5, 7),
    [h],
  );
  const foliage2Geo = useMemo(
    () => new THREE.ConeGeometry(1.2 + h * 0.4, 2.2, 7),
    [h],
  );
  const foliage3Geo = useMemo(
    () => new THREE.ConeGeometry(0.9 + h * 0.3, 1.8, 6),
    [h],
  );

  const trunkMat = useMemo(
    () => new THREE.MeshToonMaterial({ color: DARK_BROWN }),
    [],
  );
  const foliageDarkMat = useMemo(
    () => new THREE.MeshToonMaterial({ color: FOLIAGE_DARK }),
    [],
  );
  const foliageLightMat = useMemo(
    () => new THREE.MeshToonMaterial({ color: FOLIAGE_LIGHT }),
    [],
  );
  const outlineMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({ color: "#000000", side: THREE.BackSide }),
    [],
  );

  const groupRef = useRef<THREE.Group>(null);
  const debrisGroupRef = useRef<THREE.Group>(null);
  const debrisRef = useRef<DebrisPiece[]>([]);
  const fallingRef = useRef<{
    vx: number;
    vy: number;
    vz: number;
    avx: number;
    avy: number;
    avz: number;
    startTime: number;
  } | null>(null);
  const prevIntact = useRef(prop.intact);
  const destroyedRef = useRef(false);

  // Detect destruction
  if (prevIntact.current && !prop.intact && !destroyedRef.current) {
    destroyedRef.current = true;
    setTimeout(() => playChunkDestroy(), Math.random() * 60);

    fallingRef.current = {
      vx: (Math.random() - 0.5) * 4,
      vy: 0.5,
      vz: (Math.random() - 0.5) * 4,
      avx: (Math.random() - 0.5) * 3,
      avy: (Math.random() - 0.5) * 1,
      avz: (Math.random() - 0.5) * 3,
      startTime: Date.now(),
    };

    // Spawn foliage debris
    if (debrisGroupRef.current) {
      const count = 6 + Math.floor(Math.random() * 3);
      const canSpawn = Math.min(count, MAX_PROP_DEBRIS - propDebrisCount);
      for (let i = 0; i < canSpawn; i++) {
        const r = 0.15 + Math.random() * 0.35;
        const geo = new THREE.SphereGeometry(r, 5, 4);
        const col = Math.random() > 0.5 ? FOLIAGE_DARK : FOLIAGE_LIGHT;
        const mat = new THREE.MeshBasicMaterial({
          color: col,
          transparent: true,
          opacity: 1,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(
          prop.position[0] + (Math.random() - 0.5) * 2,
          prop.position[1] + trunkHeight * 0.7 + Math.random() * 2,
          prop.position[2] + (Math.random() - 0.5) * 2,
        );
        debrisGroupRef.current.add(mesh);
        propDebrisCount++;
        debrisRef.current.push({
          mesh,
          velocity: new THREE.Vector3(
            (Math.random() - 0.5) * 12,
            Math.random() * 8 + 3,
            (Math.random() - 0.5) * 12,
          ),
          angularVelocity: new THREE.Vector3(
            (Math.random() - 0.5) * 8,
            (Math.random() - 0.5) * 8,
            (Math.random() - 0.5) * 8,
          ),
          life: 0,
          maxLife: 2.5 + Math.random() * 1,
        });
      }
    }
  }
  prevIntact.current = prop.intact;

  useFrame((_, delta) => {
    // Animate falling tree
    if (groupRef.current && fallingRef.current) {
      const f = fallingRef.current;
      f.vy -= 8 * delta;

      groupRef.current.position.x += f.vx * delta;
      groupRef.current.position.y += f.vy * delta;
      groupRef.current.position.z += f.vz * delta;
      groupRef.current.rotation.x += f.avx * delta;
      groupRef.current.rotation.y += f.avy * delta;
      groupRef.current.rotation.z += f.avz * delta;

      if (groupRef.current.position.y < -0.5) {
        groupRef.current.position.y = -0.5;
        f.vy *= -0.1;
        f.vx *= 0.4;
        f.vz *= 0.4;
        f.avx *= 0.3;
        f.avz *= 0.3;
      }

      const elapsed = (Date.now() - f.startTime) / 1000;
      if (elapsed > 2) {
        groupRef.current.visible = false;
      }
    }

    // Animate debris
    for (const d of debrisRef.current) {
      if (d.life >= d.maxLife) continue;
      d.life += delta;
      d.velocity.y -= 12 * delta;
      d.mesh.position.x += d.velocity.x * delta;
      d.mesh.position.y += d.velocity.y * delta;
      d.mesh.position.z += d.velocity.z * delta;
      d.mesh.rotation.x += d.angularVelocity.x * delta;
      d.mesh.rotation.y += d.angularVelocity.y * delta;
      d.mesh.rotation.z += d.angularVelocity.z * delta;
      if (d.mesh.position.y < 0.1) {
        d.mesh.position.y = 0.1;
        d.velocity.y *= -0.2;
        d.velocity.x *= 0.5;
        d.velocity.z *= 0.5;
      }
      const timeLeft = d.maxLife - d.life;
      if (timeLeft < 1) {
        (d.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(
          0,
          timeLeft,
        );
      }
      if (d.life >= d.maxLife) {
        d.mesh.visible = false;
        propDebrisCount = Math.max(0, propDebrisCount - 1);
      }
    }
  });

  // Cracked tilt
  const crackRotZ = prop.cracked && prop.intact ? 0.12 : 0;

  return (
    <>
      <group
        ref={groupRef}
        position={prop.position}
        rotation={[0, prop.rotation, crackRotZ]}
        visible={prop.intact || !!fallingRef.current}
      >
        {/* Trunk */}
        <mesh
          geometry={trunkGeo}
          material={trunkMat}
          position={[0, trunkHeight / 2, 0]}
        />
        <mesh
          geometry={trunkGeo}
          position={[0, trunkHeight / 2, 0]}
          scale={[1.08, 1.02, 1.08]}
        >
          <meshBasicMaterial color="#000000" side={THREE.BackSide} />
        </mesh>

        {/* Foliage layers */}
        <mesh
          geometry={foliage1Geo}
          material={foliageDarkMat}
          position={[0, trunkHeight + 0.5, 0]}
        />
        <mesh
          geometry={foliage1Geo}
          position={[0, trunkHeight + 0.5, 0]}
          scale={[1.06, 1.04, 1.06]}
        >
          {outlineMat && <primitive object={outlineMat} attach="material" />}
        </mesh>
        <mesh
          geometry={foliage2Geo}
          material={foliageLightMat}
          position={[0, trunkHeight + 1.5, 0]}
        />
        <mesh
          geometry={foliage3Geo}
          material={foliageDarkMat}
          position={[0, trunkHeight + 2.6, 0]}
        />
      </group>
      <group ref={debrisGroupRef} />
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  FENCE SEGMENT
// ═══════════════════════════════════════════════════════════════════════

const FENCE_LENGTH = 2.5;
const FENCE_POST_H = 1.2;
const FENCE_POST_W = 0.12;

function FenceProp({ prop }: { prop: DestructiblePropState }) {
  const postGeo = useMemo(
    () => new THREE.BoxGeometry(FENCE_POST_W, FENCE_POST_H, FENCE_POST_W),
    [],
  );
  const railGeo = useMemo(
    () => new THREE.BoxGeometry(FENCE_LENGTH, 0.06, 0.06),
    [],
  );
  const postMat = useMemo(
    () => new THREE.MeshToonMaterial({ color: FENCE_COLOR }),
    [],
  );
  const railMat = useMemo(
    () => new THREE.MeshToonMaterial({ color: FENCE_COLOR }),
    [],
  );

  const groupRef = useRef<THREE.Group>(null);
  const debrisGroupRef = useRef<THREE.Group>(null);
  const debrisRef = useRef<DebrisPiece[]>([]);
  const fallingRef = useRef<{
    vx: number;
    vy: number;
    vz: number;
    avx: number;
    avz: number;
    startTime: number;
  } | null>(null);
  const prevIntact = useRef(prop.intact);
  const destroyedRef = useRef(false);

  if (prevIntact.current && !prop.intact && !destroyedRef.current) {
    destroyedRef.current = true;
    setTimeout(() => playChunkDestroy(), Math.random() * 60);

    fallingRef.current = {
      vx: (Math.random() - 0.5) * 6,
      vy: 2,
      vz: (Math.random() - 0.5) * 6,
      avx: (Math.random() - 0.5) * 5,
      avz: (Math.random() - 0.5) * 5,
      startTime: Date.now(),
    };

    // Spawn debris
    if (debrisGroupRef.current) {
      const count = 4 + Math.floor(Math.random() * 3);
      const canSpawn = Math.min(count, MAX_PROP_DEBRIS - propDebrisCount);
      for (let i = 0; i < canSpawn; i++) {
        const bw = 0.06 + Math.random() * 0.2;
        const bh = 0.06 + Math.random() * 0.3;
        const geo = new THREE.BoxGeometry(bw, bh, bw);
        const col =
          DEBRIS_COLORS_PROP[
            Math.floor(Math.random() * DEBRIS_COLORS_PROP.length)
          ];
        const mat = new THREE.MeshBasicMaterial({
          color: col,
          transparent: true,
          opacity: 1,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(
          prop.position[0] + (Math.random() - 0.5) * FENCE_LENGTH,
          prop.position[1] + Math.random() * FENCE_POST_H,
          prop.position[2] + (Math.random() - 0.5) * 0.3,
        );
        debrisGroupRef.current.add(mesh);
        propDebrisCount++;
        debrisRef.current.push({
          mesh,
          velocity: new THREE.Vector3(
            (Math.random() - 0.5) * 10,
            Math.random() * 6 + 2,
            (Math.random() - 0.5) * 10,
          ),
          angularVelocity: new THREE.Vector3(
            (Math.random() - 0.5) * 10,
            (Math.random() - 0.5) * 10,
            (Math.random() - 0.5) * 10,
          ),
          life: 0,
          maxLife: 2.0 + Math.random() * 0.8,
        });
      }
    }
  }
  prevIntact.current = prop.intact;

  useFrame((_, delta) => {
    if (groupRef.current && fallingRef.current) {
      const f = fallingRef.current;
      f.vy -= 9 * delta;
      groupRef.current.position.x += f.vx * delta;
      groupRef.current.position.y += f.vy * delta;
      groupRef.current.position.z += f.vz * delta;
      groupRef.current.rotation.x += f.avx * delta;
      groupRef.current.rotation.z += f.avz * delta;
      if (groupRef.current.position.y < -0.3) {
        groupRef.current.position.y = -0.3;
        f.vy = 0;
        f.vx *= 0.3;
        f.vz *= 0.3;
      }
      const elapsed = (Date.now() - f.startTime) / 1000;
      if (elapsed > 1.8) groupRef.current.visible = false;
    }

    for (const d of debrisRef.current) {
      if (d.life >= d.maxLife) continue;
      d.life += delta;
      d.velocity.y -= 12 * delta;
      d.mesh.position.x += d.velocity.x * delta;
      d.mesh.position.y += d.velocity.y * delta;
      d.mesh.position.z += d.velocity.z * delta;
      d.mesh.rotation.x += d.angularVelocity.x * delta;
      d.mesh.rotation.y += d.angularVelocity.y * delta;
      d.mesh.rotation.z += d.angularVelocity.z * delta;
      if (d.mesh.position.y < 0.05) {
        d.mesh.position.y = 0.05;
        d.velocity.y *= -0.15;
        d.velocity.x *= 0.4;
        d.velocity.z *= 0.4;
      }
      const timeLeft = d.maxLife - d.life;
      if (timeLeft < 0.8) {
        (d.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(
          0,
          timeLeft / 0.8,
        );
      }
      if (d.life >= d.maxLife) {
        d.mesh.visible = false;
        propDebrisCount = Math.max(0, propDebrisCount - 1);
      }
    }
  });

  const crackRotZ = prop.cracked && prop.intact ? 0.08 : 0;
  const halfLen = FENCE_LENGTH / 2;

  return (
    <>
      <group
        ref={groupRef}
        position={[
          prop.position[0],
          prop.position[1] + FENCE_POST_H / 2,
          prop.position[2],
        ]}
        rotation={[0, prop.rotation, crackRotZ]}
        visible={prop.intact || !!fallingRef.current}
      >
        {/* Left post */}
        <mesh
          geometry={postGeo}
          material={postMat}
          position={[-halfLen + FENCE_POST_W / 2, 0, 0]}
        />
        {/* Right post */}
        <mesh
          geometry={postGeo}
          material={postMat}
          position={[halfLen - FENCE_POST_W / 2, 0, 0]}
        />
        {/* Rails */}
        <mesh
          geometry={railGeo}
          material={railMat}
          position={[0, FENCE_POST_H * 0.3, 0]}
        />
        <mesh geometry={railGeo} material={railMat} position={[0, 0, 0]} />
        <mesh
          geometry={railGeo}
          material={railMat}
          position={[0, -FENCE_POST_H * 0.3, 0]}
        />
        {/* Outline */}
        <mesh
          geometry={postGeo}
          position={[-halfLen + FENCE_POST_W / 2, 0, 0]}
          scale={[1.1, 1.04, 1.1]}
        >
          <meshBasicMaterial color="#000000" side={THREE.BackSide} />
        </mesh>
        <mesh
          geometry={postGeo}
          position={[halfLen - FENCE_POST_W / 2, 0, 0]}
          scale={[1.1, 1.04, 1.1]}
        >
          <meshBasicMaterial color="#000000" side={THREE.BackSide} />
        </mesh>
      </group>
      <group ref={debrisGroupRef} />
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  POWER POLE
// ═══════════════════════════════════════════════════════════════════════

function PowerPoleProp({
  prop,
  allProps,
}: { prop: DestructiblePropState; allProps: DestructiblePropState[] }) {
  const h = hashId(prop.id);
  const poleHeight = 7 + h * 2;
  const crossbarWidth = 3.0;

  const poleGeo = useMemo(
    () => new THREE.CylinderGeometry(0.1, 0.15, poleHeight, 7),
    [poleHeight],
  );
  const crossbarGeo = useMemo(
    () => new THREE.BoxGeometry(crossbarWidth, 0.15, 0.15),
    // crossbarWidth is a component-level constant (3.0), never changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const insulatorGeo = useMemo(
    () => new THREE.CylinderGeometry(0.06, 0.06, 0.2, 6),
    [],
  );

  const poleMat = useMemo(
    () => new THREE.MeshToonMaterial({ color: DARK_BROWN }),
    [],
  );
  const crossbarMat = useMemo(
    () => new THREE.MeshToonMaterial({ color: DARK_BROWN }),
    [],
  );
  const insulatorMat = useMemo(
    () => new THREE.MeshToonMaterial({ color: "#E8E4D0" }),
    [],
  );

  // Find next pole in same line for wire drawing
  const linePrefix = prop.id.replace(/-\d+$/, "");
  const currentIdx = Number.parseInt(prop.id.split("-").pop() ?? "0", 10);
  const nextPole = allProps.find(
    (p) => p.type === "powerpole" && p.id === `${linePrefix}-${currentIdx + 1}`,
  );

  // Wire geometry: sagging catenary from this pole to next
  const wireGeo = useMemo(() => {
    if (!nextPole) return null;
    const start = new THREE.Vector3(
      prop.position[0],
      prop.position[1] + poleHeight - 0.3,
      prop.position[2],
    );
    const end = new THREE.Vector3(
      nextPole.position[0],
      nextPole.position[1] + poleHeight - 0.3,
      nextPole.position[2],
    );
    const mid = new THREE.Vector3().lerpVectors(start, end, 0.5);
    mid.y -= 1.2; // sag

    const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
    return new THREE.TubeGeometry(curve, 12, 0.018, 4, false);
  }, [nextPole, prop.position, poleHeight]);

  const groupRef = useRef<THREE.Group>(null);
  const debrisGroupRef = useRef<THREE.Group>(null);
  const debrisRef = useRef<DebrisPiece[]>([]);
  const fallingRef = useRef<{
    vx: number;
    vy: number;
    vz: number;
    avx: number;
    avz: number;
    startTime: number;
  } | null>(null);
  const prevIntact = useRef(prop.intact);
  const destroyedRef = useRef(false);

  if (prevIntact.current && !prop.intact && !destroyedRef.current) {
    destroyedRef.current = true;
    setTimeout(() => playChunkDestroy(), Math.random() * 60);

    fallingRef.current = {
      vx: (Math.random() - 0.5) * 3,
      vy: 0.5,
      vz: (Math.random() - 0.5) * 3,
      avx: (Math.random() > 0.5 ? 1 : -1) * (1.2 + Math.random() * 0.8),
      avz: (Math.random() - 0.5) * 0.5,
      startTime: Date.now(),
    };

    // Spawn debris
    if (debrisGroupRef.current) {
      const count = 5 + Math.floor(Math.random() * 4);
      const canSpawn = Math.min(count, MAX_PROP_DEBRIS - propDebrisCount);
      for (let i = 0; i < canSpawn; i++) {
        const bw = 0.08 + Math.random() * 0.15;
        const bh = 0.1 + Math.random() * 0.5;
        const geo = new THREE.BoxGeometry(bw, bh, bw);
        const mat = new THREE.MeshBasicMaterial({
          color: DARK_BROWN,
          transparent: true,
          opacity: 1,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(
          prop.position[0] + (Math.random() - 0.5) * 2,
          prop.position[1] + Math.random() * poleHeight,
          prop.position[2] + (Math.random() - 0.5) * 2,
        );
        debrisGroupRef.current.add(mesh);
        propDebrisCount++;
        debrisRef.current.push({
          mesh,
          velocity: new THREE.Vector3(
            (Math.random() - 0.5) * 8,
            Math.random() * 7 + 2,
            (Math.random() - 0.5) * 8,
          ),
          angularVelocity: new THREE.Vector3(
            (Math.random() - 0.5) * 6,
            (Math.random() - 0.5) * 6,
            (Math.random() - 0.5) * 6,
          ),
          life: 0,
          maxLife: 2.5 + Math.random() * 1,
        });
      }
    }
  }
  prevIntact.current = prop.intact;

  useFrame((_, delta) => {
    if (groupRef.current && fallingRef.current) {
      const f = fallingRef.current;
      f.vy -= 9 * delta;
      groupRef.current.position.x += f.vx * delta;
      groupRef.current.position.y += f.vy * delta;
      groupRef.current.position.z += f.vz * delta;
      groupRef.current.rotation.x += f.avx * delta;
      groupRef.current.rotation.z += f.avz * delta;

      // Clamp to ground
      if (groupRef.current.position.y < -poleHeight * 0.4) {
        groupRef.current.position.y = -poleHeight * 0.4;
        f.vy = 0;
        f.vx *= 0.2;
        f.vz *= 0.2;
        f.avx *= 0.1;
      }
      const elapsed = (Date.now() - f.startTime) / 1000;
      if (elapsed > 3) groupRef.current.visible = false;
    }

    for (const d of debrisRef.current) {
      if (d.life >= d.maxLife) continue;
      d.life += delta;
      d.velocity.y -= 12 * delta;
      d.mesh.position.x += d.velocity.x * delta;
      d.mesh.position.y += d.velocity.y * delta;
      d.mesh.position.z += d.velocity.z * delta;
      d.mesh.rotation.x += d.angularVelocity.x * delta;
      d.mesh.rotation.y += d.angularVelocity.y * delta;
      d.mesh.rotation.z += d.angularVelocity.z * delta;
      if (d.mesh.position.y < 0.1) {
        d.mesh.position.y = 0.1;
        d.velocity.y *= -0.15;
        d.velocity.x *= 0.4;
        d.velocity.z *= 0.4;
      }
      const timeLeft = d.maxLife - d.life;
      if (timeLeft < 1) {
        (d.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(
          0,
          timeLeft,
        );
      }
      if (d.life >= d.maxLife) {
        d.mesh.visible = false;
        propDebrisCount = Math.max(0, propDebrisCount - 1);
      }
    }
  });

  const crackRotZ = prop.cracked && prop.intact ? 0.06 : 0;

  return (
    <>
      <group
        ref={groupRef}
        position={[prop.position[0], prop.position[1], prop.position[2]]}
        rotation={[0, prop.rotation, crackRotZ]}
        visible={prop.intact || !!fallingRef.current}
      >
        {/* Main pole */}
        <mesh
          geometry={poleGeo}
          material={poleMat}
          position={[0, poleHeight / 2, 0]}
        />
        <mesh
          geometry={poleGeo}
          position={[0, poleHeight / 2, 0]}
          scale={[1.1, 1.005, 1.1]}
        >
          <meshBasicMaterial color="#000000" side={THREE.BackSide} />
        </mesh>

        {/* Crossbar */}
        <mesh
          geometry={crossbarGeo}
          material={crossbarMat}
          position={[0, poleHeight - 0.5, 0]}
        />
        <mesh
          geometry={crossbarGeo}
          position={[0, poleHeight - 0.5, 0]}
          scale={[1.06, 1.2, 1.2]}
        >
          <meshBasicMaterial color="#000000" side={THREE.BackSide} />
        </mesh>

        {/* Insulators */}
        {([-crossbarWidth * 0.38, 0, crossbarWidth * 0.38] as const).map(
          (xOff) => (
            <mesh
              key={`ins-${xOff.toFixed(3)}`}
              geometry={insulatorGeo}
              material={insulatorMat}
              position={[xOff, poleHeight - 0.3, 0]}
            />
          ),
        )}
      </group>

      {/* Wire to next pole (world space, only when both are intact) */}
      {wireGeo && prop.intact && nextPole?.intact && (
        <mesh geometry={wireGeo}>
          <meshBasicMaterial color="#1A1A1A" />
        </mesh>
      )}

      <group ref={debrisGroupRef} />
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  VEHICLE PROP (jeep / truck that collapses + burns)
// ═══════════════════════════════════════════════════════════════════════

function VehicleProp({ prop }: { prop: DestructiblePropState }) {
  const h = hashId(prop.id);
  const isTruck = h > 0.5;

  const bodyGeo = useMemo(
    () =>
      new THREE.BoxGeometry(
        isTruck ? 4.0 : 3.0,
        isTruck ? 1.0 : 1.2,
        isTruck ? 2.0 : 1.8,
      ),
    [isTruck],
  );
  const cabGeo = useMemo(
    () =>
      new THREE.BoxGeometry(
        isTruck ? 2.0 : 1.6,
        isTruck ? 1.8 : 1.0,
        isTruck ? 2.0 : 1.7,
      ),
    [isTruck],
  );
  const wheelGeo = useMemo(
    () => new THREE.CylinderGeometry(0.45, 0.45, 0.28, 8),
    [],
  );

  const groupRef = useRef<THREE.Group>(null);
  const debrisGroupRef = useRef<THREE.Group>(null);
  const debrisRef = useRef<DebrisPiece[]>([]);
  const fallingRef = useRef<{
    vx: number;
    vy: number;
    vz: number;
    avx: number;
    avz: number;
    startTime: number;
  } | null>(null);
  const prevIntact = useRef(prop.intact);
  const destroyedRef = useRef(false);

  if (prevIntact.current && !prop.intact && !destroyedRef.current) {
    destroyedRef.current = true;
    setTimeout(() => playChunkDestroy(), Math.random() * 60);

    fallingRef.current = {
      vx: (Math.random() - 0.5) * 5,
      vy: 2.5,
      vz: (Math.random() - 0.5) * 5,
      avx: (Math.random() - 0.5) * 2,
      avz: (Math.random() - 0.5) * 3,
      startTime: Date.now(),
    };

    if (debrisGroupRef.current) {
      const count = 8 + Math.floor(Math.random() * 5);
      const canSpawn = Math.min(count, MAX_PROP_DEBRIS - propDebrisCount);
      for (let i = 0; i < canSpawn; i++) {
        const bw = 0.2 + Math.random() * 0.6;
        const bh = 0.1 + Math.random() * 0.4;
        const geo = new THREE.BoxGeometry(bw, bh, bw);
        const colors = ["#2A2010", "#3A3020", "#4A3A20", "#1A1A0A"];
        const col = colors[Math.floor(Math.random() * colors.length)];
        const mat = new THREE.MeshBasicMaterial({
          color: col,
          transparent: true,
          opacity: 1,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(
          prop.position[0] + (Math.random() - 0.5) * 3,
          prop.position[1] + 0.5 + Math.random() * 1.5,
          prop.position[2] + (Math.random() - 0.5) * 3,
        );
        debrisGroupRef.current.add(mesh);
        propDebrisCount++;
        debrisRef.current.push({
          mesh,
          velocity: new THREE.Vector3(
            (Math.random() - 0.5) * 14,
            Math.random() * 9 + 3,
            (Math.random() - 0.5) * 14,
          ),
          angularVelocity: new THREE.Vector3(
            (Math.random() - 0.5) * 8,
            (Math.random() - 0.5) * 8,
            (Math.random() - 0.5) * 8,
          ),
          life: 0,
          maxLife: 2.5 + Math.random() * 1.5,
        });
      }
    }
  }
  prevIntact.current = prop.intact;

  useFrame((_, delta) => {
    if (groupRef.current && fallingRef.current) {
      const f = fallingRef.current;
      f.vy -= 9 * delta;
      groupRef.current.position.x += f.vx * delta;
      groupRef.current.position.y += f.vy * delta;
      groupRef.current.position.z += f.vz * delta;
      groupRef.current.rotation.x += f.avx * delta;
      groupRef.current.rotation.z += f.avz * delta;
      if (groupRef.current.position.y < -0.4) {
        groupRef.current.position.y = -0.4;
        f.vy = 0;
        f.vx *= 0.3;
        f.vz *= 0.3;
        f.avx *= 0.2;
        f.avz *= 0.2;
      }
      const elapsed = (Date.now() - f.startTime) / 1000;
      if (elapsed > 2.5) groupRef.current.visible = false;
    }

    for (const d of debrisRef.current) {
      if (d.life >= d.maxLife) continue;
      d.life += delta;
      d.velocity.y -= 12 * delta;
      d.mesh.position.x += d.velocity.x * delta;
      d.mesh.position.y += d.velocity.y * delta;
      d.mesh.position.z += d.velocity.z * delta;
      d.mesh.rotation.x += d.angularVelocity.x * delta;
      d.mesh.rotation.y += d.angularVelocity.y * delta;
      d.mesh.rotation.z += d.angularVelocity.z * delta;
      if (d.mesh.position.y < 0.1) {
        d.mesh.position.y = 0.1;
        d.velocity.y *= -0.15;
        d.velocity.x *= 0.4;
        d.velocity.z *= 0.4;
      }
      const timeLeft = d.maxLife - d.life;
      if (timeLeft < 1) {
        (d.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(
          0,
          timeLeft,
        );
      }
      if (d.life >= d.maxLife) {
        d.mesh.visible = false;
        propDebrisCount = Math.max(0, propDebrisCount - 1);
      }
    }
  });

  const bodyColor = isTruck ? "#4A5530" : "#3A4520";
  const wheelPositions: [number, number][] = isTruck
    ? [
        [-1.2, -1.0],
        [-1.2, 1.0],
        [1.8, -1.0],
        [1.8, 1.0],
      ]
    : [
        [-1.1, -0.95],
        [-1.1, 0.95],
        [1.1, -0.95],
        [1.1, 0.95],
      ];

  return (
    <>
      <group
        ref={groupRef}
        position={prop.position}
        rotation={[0, prop.rotation, 0]}
        visible={prop.intact || !!fallingRef.current}
      >
        <mesh geometry={bodyGeo} position={[0, isTruck ? 0.5 : 0.6, 0]}>
          <meshToonMaterial color={bodyColor} />
        </mesh>
        <mesh
          geometry={bodyGeo}
          position={[0, isTruck ? 0.5 : 0.6, 0]}
          scale={[1.04, 1.06, 1.04]}
        >
          <meshBasicMaterial color="#000000" side={THREE.BackSide} />
        </mesh>
        {isTruck && (
          <>
            <mesh geometry={cabGeo} position={[1.5, 1.4, 0]}>
              <meshToonMaterial color="#2A2020" />
            </mesh>
            <mesh
              geometry={cabGeo}
              position={[1.5, 1.4, 0]}
              scale={[1.05, 1.06, 1.05]}
            >
              <meshBasicMaterial color="#000000" side={THREE.BackSide} />
            </mesh>
          </>
        )}
        {wheelPositions.map(([wx, wz]) => (
          <group key={`v-wheel-${wx}-${wz}`}>
            <mesh
              geometry={wheelGeo}
              position={[wx, 0.45, wz]}
              rotation={[Math.PI / 2, 0, 0]}
            >
              <meshToonMaterial color="#1A1A1A" />
            </mesh>
          </group>
        ))}
      </group>
      <group ref={debrisGroupRef} />
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  SANDBAG WALL PROP
// ═══════════════════════════════════════════════════════════════════════

function SandbagProp({ prop }: { prop: DestructiblePropState }) {
  const bagGeo = useMemo(() => new THREE.BoxGeometry(0.82, 0.42, 0.52), []);
  const count = 5; // ~4 unit length wall

  const groupRef = useRef<THREE.Group>(null);
  const debrisGroupRef = useRef<THREE.Group>(null);
  const debrisRef = useRef<DebrisPiece[]>([]);
  const fallingRef = useRef<{
    vy: number;
    avx: number;
    avz: number;
    startTime: number;
  } | null>(null);
  const prevIntact = useRef(prop.intact);
  const destroyedRef = useRef(false);

  if (prevIntact.current && !prop.intact && !destroyedRef.current) {
    destroyedRef.current = true;
    setTimeout(() => playChunkDestroy(), Math.random() * 40);
    fallingRef.current = {
      vy: 2,
      avx: (Math.random() - 0.5) * 3,
      avz: (Math.random() - 0.5) * 3,
      startTime: Date.now(),
    };

    if (debrisGroupRef.current) {
      const debrisCount = 6 + Math.floor(Math.random() * 4);
      const canSpawn = Math.min(debrisCount, MAX_PROP_DEBRIS - propDebrisCount);
      for (let i = 0; i < canSpawn; i++) {
        const geo = new THREE.BoxGeometry(
          0.5 + Math.random() * 0.4,
          0.3 + Math.random() * 0.2,
          0.3 + Math.random() * 0.2,
        );
        const col = Math.random() > 0.5 ? "#C4A84A" : "#B89840";
        const mat = new THREE.MeshBasicMaterial({
          color: col,
          transparent: true,
          opacity: 1,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(
          prop.position[0] + (Math.random() - 0.5) * 4,
          prop.position[1] + 0.3 + Math.random() * 0.5,
          prop.position[2] + (Math.random() - 0.5) * 1.5,
        );
        debrisGroupRef.current.add(mesh);
        propDebrisCount++;
        debrisRef.current.push({
          mesh,
          velocity: new THREE.Vector3(
            (Math.random() - 0.5) * 8,
            Math.random() * 5 + 2,
            (Math.random() - 0.5) * 8,
          ),
          angularVelocity: new THREE.Vector3(
            (Math.random() - 0.5) * 6,
            (Math.random() - 0.5) * 6,
            (Math.random() - 0.5) * 6,
          ),
          life: 0,
          maxLife: 2 + Math.random() * 1,
        });
      }
    }
  }
  prevIntact.current = prop.intact;

  useFrame((_, delta) => {
    if (groupRef.current && fallingRef.current) {
      const f = fallingRef.current;
      f.vy -= 9 * delta;
      groupRef.current.position.y += f.vy * delta;
      groupRef.current.rotation.x += f.avx * delta;
      groupRef.current.rotation.z += f.avz * delta;
      if (groupRef.current.position.y < -0.3) {
        groupRef.current.visible = false;
      }
    }
    for (const d of debrisRef.current) {
      if (d.life >= d.maxLife) continue;
      d.life += delta;
      d.velocity.y -= 12 * delta;
      d.mesh.position.x += d.velocity.x * delta;
      d.mesh.position.y += d.velocity.y * delta;
      d.mesh.position.z += d.velocity.z * delta;
      d.mesh.rotation.x += d.angularVelocity.x * delta;
      d.mesh.rotation.y += d.angularVelocity.y * delta;
      d.mesh.rotation.z += d.angularVelocity.z * delta;
      if (d.mesh.position.y < 0.05) {
        d.mesh.position.y = 0.05;
        d.velocity.y *= -0.1;
        d.velocity.x *= 0.4;
        d.velocity.z *= 0.4;
      }
      const tl = d.maxLife - d.life;
      if (tl < 0.8)
        (d.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(
          0,
          tl / 0.8,
        );
      if (d.life >= d.maxLife) {
        d.mesh.visible = false;
        propDebrisCount = Math.max(0, propDebrisCount - 1);
      }
    }
  });

  return (
    <>
      <group
        ref={groupRef}
        position={[prop.position[0], prop.position[1], prop.position[2]]}
        rotation={[0, prop.rotation, 0]}
        visible={prop.intact || !!fallingRef.current}
      >
        {Array.from({ length: count }).map((_, i) => {
          const bx = (i - (count - 1) / 2) * 0.87;
          return (
            <group key={`sbp-${bx.toFixed(2)}`}>
              <mesh geometry={bagGeo} position={[bx, 0.21, 0]}>
                <meshToonMaterial color="#C4A84A" />
              </mesh>
              <mesh
                geometry={bagGeo}
                position={[bx, 0.21, 0]}
                scale={[1.05, 1.06, 1.1]}
              >
                <meshBasicMaterial color="#000000" side={THREE.BackSide} />
              </mesh>
            </group>
          );
        })}
        {Array.from({ length: count - 1 }).map((_, i) => {
          const bx = (i - (count - 2) / 2) * 0.87;
          return (
            <mesh
              key={`sbp2-${bx.toFixed(2)}`}
              geometry={bagGeo}
              position={[bx, 0.63, 0]}
            >
              <meshToonMaterial color="#B89840" />
            </mesh>
          );
        })}
      </group>
      <group ref={debrisGroupRef} />
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  STREET LAMP PROP
// ═══════════════════════════════════════════════════════════════════════

function StreetLampProp({ prop }: { prop: DestructiblePropState }) {
  const poleGeo = useMemo(
    () => new THREE.CylinderGeometry(0.08, 0.12, 7, 7),
    [],
  );
  const armGeo = useMemo(
    () => new THREE.CylinderGeometry(0.05, 0.05, 2, 5),
    [],
  );
  const headGeo = useMemo(() => new THREE.BoxGeometry(0.5, 0.25, 0.4), []);

  const groupRef = useRef<THREE.Group>(null);
  const debrisGroupRef = useRef<THREE.Group>(null);
  const debrisRef = useRef<DebrisPiece[]>([]);
  const fallingRef = useRef<{
    vy: number;
    avx: number;
    avz: number;
    startTime: number;
  } | null>(null);
  const prevIntact = useRef(prop.intact);
  const destroyedRef = useRef(false);

  if (prevIntact.current && !prop.intact && !destroyedRef.current) {
    destroyedRef.current = true;
    setTimeout(() => playChunkDestroy(), Math.random() * 60);
    fallingRef.current = {
      vy: 0.5,
      avx: (Math.random() > 0.5 ? 1 : -1) * (1.0 + Math.random() * 0.5),
      avz: (Math.random() - 0.5) * 0.4,
      startTime: Date.now(),
    };
    if (debrisGroupRef.current) {
      const count = 4 + Math.floor(Math.random() * 3);
      const canSpawn = Math.min(count, MAX_PROP_DEBRIS - propDebrisCount);
      for (let i = 0; i < canSpawn; i++) {
        const geo = new THREE.BoxGeometry(0.1, 0.3 + Math.random() * 0.5, 0.1);
        const mat = new THREE.MeshBasicMaterial({
          color: "#4A4A4A",
          transparent: true,
          opacity: 1,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(
          prop.position[0] + (Math.random() - 0.5) * 1.5,
          prop.position[1] + 3 + Math.random() * 4,
          prop.position[2] + (Math.random() - 0.5) * 1.5,
        );
        debrisGroupRef.current.add(mesh);
        propDebrisCount++;
        debrisRef.current.push({
          mesh,
          velocity: new THREE.Vector3(
            (Math.random() - 0.5) * 7,
            Math.random() * 6 + 2,
            (Math.random() - 0.5) * 7,
          ),
          angularVelocity: new THREE.Vector3(
            (Math.random() - 0.5) * 7,
            (Math.random() - 0.5) * 7,
            (Math.random() - 0.5) * 7,
          ),
          life: 0,
          maxLife: 2 + Math.random() * 1,
        });
      }
    }
  }
  prevIntact.current = prop.intact;

  useFrame((_, delta) => {
    if (groupRef.current && fallingRef.current) {
      const f = fallingRef.current;
      f.vy -= 9 * delta;
      groupRef.current.position.y += f.vy * delta;
      groupRef.current.rotation.x += f.avx * delta;
      groupRef.current.rotation.z += f.avz * delta;
      if (groupRef.current.position.y < -3.5) {
        groupRef.current.position.y = -3.5;
        f.vy = 0;
        f.avx *= 0.05;
      }
      const elapsed = (Date.now() - f.startTime) / 1000;
      if (elapsed > 3) groupRef.current.visible = false;
    }
    for (const d of debrisRef.current) {
      if (d.life >= d.maxLife) continue;
      d.life += delta;
      d.velocity.y -= 12 * delta;
      d.mesh.position.x += d.velocity.x * delta;
      d.mesh.position.y += d.velocity.y * delta;
      d.mesh.position.z += d.velocity.z * delta;
      d.mesh.rotation.x += d.angularVelocity.x * delta;
      d.mesh.rotation.y += d.angularVelocity.y * delta;
      d.mesh.rotation.z += d.angularVelocity.z * delta;
      if (d.mesh.position.y < 0.1) {
        d.mesh.position.y = 0.1;
        d.velocity.y *= -0.1;
        d.velocity.x *= 0.4;
        d.velocity.z *= 0.4;
      }
      const tl = d.maxLife - d.life;
      if (tl < 1)
        (d.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, tl);
      if (d.life >= d.maxLife) {
        d.mesh.visible = false;
        propDebrisCount = Math.max(0, propDebrisCount - 1);
      }
    }
  });

  return (
    <>
      <group
        ref={groupRef}
        position={prop.position}
        rotation={[0, prop.rotation, 0]}
        visible={prop.intact || !!fallingRef.current}
      >
        <mesh geometry={poleGeo} position={[0, 3.5, 0]}>
          <meshToonMaterial color="#4A4A4A" />
        </mesh>
        <mesh
          geometry={poleGeo}
          position={[0, 3.5, 0]}
          scale={[1.1, 1.01, 1.1]}
        >
          <meshBasicMaterial color="#000000" side={THREE.BackSide} />
        </mesh>
        <group position={[0, 7.0, 0]} rotation={[0, 0, -Math.PI / 8]}>
          <mesh
            geometry={armGeo}
            position={[1.0, 0, 0]}
            rotation={[0, 0, Math.PI / 2]}
          >
            <meshToonMaterial color="#3A3A3A" />
          </mesh>
          <mesh geometry={headGeo} position={[2.0, -0.15, 0]}>
            <meshToonMaterial color="#FFCC44" />
          </mesh>
          <mesh
            geometry={headGeo}
            position={[2.0, -0.15, 0]}
            scale={[1.1, 1.15, 1.2]}
          >
            <meshBasicMaterial color="#000000" side={THREE.BackSide} />
          </mesh>
        </group>
      </group>
      <group ref={debrisGroupRef} />
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  TENT PROP
// ═══════════════════════════════════════════════════════════════════════

function TentProp({ prop }: { prop: DestructiblePropState }) {
  const groupRef = useRef<THREE.Group>(null);
  const debrisGroupRef = useRef<THREE.Group>(null);
  const debrisRef = useRef<DebrisPiece[]>([]);
  const fallingRef = useRef<{
    vx: number;
    vy: number;
    vz: number;
    avx: number;
    avz: number;
    startTime: number;
  } | null>(null);
  const prevIntact = useRef(prop.intact);
  const destroyedRef = useRef(false);

  if (prevIntact.current && !prop.intact && !destroyedRef.current) {
    destroyedRef.current = true;
    setTimeout(() => playChunkDestroy(), Math.random() * 60);
    fallingRef.current = {
      vx: (Math.random() - 0.5) * 4,
      vy: 1.5,
      vz: (Math.random() - 0.5) * 4,
      avx: (Math.random() - 0.5) * 2,
      avz: (Math.random() - 0.5) * 3,
      startTime: Date.now(),
    };
    if (debrisGroupRef.current) {
      const count = 5 + Math.floor(Math.random() * 4);
      const canSpawn = Math.min(count, MAX_PROP_DEBRIS - propDebrisCount);
      for (let i = 0; i < canSpawn; i++) {
        const geo = new THREE.BoxGeometry(
          0.5 + Math.random() * 1,
          0.05 + Math.random() * 0.1,
          0.4 + Math.random() * 0.8,
        );
        const col = Math.random() > 0.5 ? "#6B7A4A" : "#5A6A3A";
        const mat = new THREE.MeshBasicMaterial({
          color: col,
          transparent: true,
          opacity: 1,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(
          prop.position[0] + (Math.random() - 0.5) * 4,
          prop.position[1] + 1 + Math.random() * 2,
          prop.position[2] + (Math.random() - 0.5) * 3,
        );
        debrisGroupRef.current.add(mesh);
        propDebrisCount++;
        debrisRef.current.push({
          mesh,
          velocity: new THREE.Vector3(
            (Math.random() - 0.5) * 9,
            Math.random() * 6 + 2,
            (Math.random() - 0.5) * 9,
          ),
          angularVelocity: new THREE.Vector3(
            (Math.random() - 0.5) * 5,
            (Math.random() - 0.5) * 5,
            (Math.random() - 0.5) * 5,
          ),
          life: 0,
          maxLife: 2.5 + Math.random() * 1,
        });
      }
    }
  }
  prevIntact.current = prop.intact;

  useFrame((_, delta) => {
    if (groupRef.current && fallingRef.current) {
      const f = fallingRef.current;
      f.vy -= 9 * delta;
      groupRef.current.position.x += f.vx * delta;
      groupRef.current.position.y += f.vy * delta;
      groupRef.current.position.z += f.vz * delta;
      groupRef.current.rotation.x += f.avx * delta;
      groupRef.current.rotation.z += f.avz * delta;
      if (groupRef.current.position.y < -0.5) {
        groupRef.current.position.y = -0.5;
        f.vy = 0;
        f.vx *= 0.2;
        f.vz *= 0.2;
      }
      const elapsed = (Date.now() - f.startTime) / 1000;
      if (elapsed > 2.5) groupRef.current.visible = false;
    }
    for (const d of debrisRef.current) {
      if (d.life >= d.maxLife) continue;
      d.life += delta;
      d.velocity.y -= 12 * delta;
      d.mesh.position.x += d.velocity.x * delta;
      d.mesh.position.y += d.velocity.y * delta;
      d.mesh.position.z += d.velocity.z * delta;
      d.mesh.rotation.x += d.angularVelocity.x * delta;
      d.mesh.rotation.y += d.angularVelocity.y * delta;
      d.mesh.rotation.z += d.angularVelocity.z * delta;
      if (d.mesh.position.y < 0.05) {
        d.mesh.position.y = 0.05;
        d.velocity.y *= -0.1;
        d.velocity.x *= 0.4;
        d.velocity.z *= 0.4;
      }
      const tl = d.maxLife - d.life;
      if (tl < 0.8)
        (d.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(
          0,
          tl / 0.8,
        );
      if (d.life >= d.maxLife) {
        d.mesh.visible = false;
        propDebrisCount = Math.max(0, propDebrisCount - 1);
      }
    }
  });

  const ridgeGeo = useMemo(
    () => new THREE.CylinderGeometry(0.06, 0.06, 5, 6),
    [],
  );

  return (
    <>
      <group
        ref={groupRef}
        position={prop.position}
        rotation={[0, prop.rotation, 0]}
        visible={prop.intact || !!fallingRef.current}
      >
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
        <mesh
          geometry={ridgeGeo}
          position={[0, 2.1, 0]}
          rotation={[0, 0, Math.PI / 2]}
        >
          <meshToonMaterial color="#7A6040" />
        </mesh>
        {/* Corner poles */}
        {(
          [
            [-2.4, -1.6],
            [2.4, -1.6],
            [-2.4, 1.6],
            [2.4, 1.6],
          ] as [number, number][]
        ).map(([px, pz]) => (
          <mesh key={`tent-p-${px}-${pz}`} position={[px, 1.1, pz]}>
            <cylinderGeometry args={[0.05, 0.05, 2.2, 5]} />
            <meshToonMaterial color="#8A7050" />
          </mesh>
        ))}
        {/* Ground cloth */}
        <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[5, 3.5]} />
          <meshToonMaterial color="#4A5A2A" />
        </mesh>
      </group>
      <group ref={debrisGroupRef} />
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  MAIN DestructibleProps COMPONENT
// ═══════════════════════════════════════════════════════════════════════

export function DestructibleProps() {
  const props = useGameStore((s) => s.props);

  return (
    <>
      {props.map((prop) => {
        if (prop.type === "tree") {
          return <TreeProp key={prop.id} prop={prop} />;
        }
        if (prop.type === "fence") {
          return <FenceProp key={prop.id} prop={prop} />;
        }
        if (prop.type === "powerpole") {
          return <PowerPoleProp key={prop.id} prop={prop} allProps={props} />;
        }
        if (prop.type === "vehicle") {
          return <VehicleProp key={prop.id} prop={prop} />;
        }
        if (prop.type === "sandbag") {
          return <SandbagProp key={prop.id} prop={prop} />;
        }
        if (prop.type === "streetlamp") {
          return <StreetLampProp key={prop.id} prop={prop} />;
        }
        if (prop.type === "tent") {
          return <TentProp key={prop.id} prop={prop} />;
        }
        return null;
      })}
    </>
  );
}
