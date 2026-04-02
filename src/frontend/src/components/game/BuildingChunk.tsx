import type { BuildingType, ChunkState } from "@/store/useGameStore";
import { playChunkDestroy } from "@/utils/soundManager";
import { useFrame } from "@react-three/fiber";
import { type ReactElement, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

// ---------- Global debris performance cap ----------
let globalDebrisCount = 0;
const MAX_GLOBAL_DEBRIS = 180;

interface DebrisBrick {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  angularVelocity: THREE.Vector3;
  life: number;
  maxLife: number;
}

interface BuildingChunkProps {
  chunk: ChunkState;
  color: string;
  accentColor: string;
  isTopFloor: boolean;
  isGroundFloor: boolean;
  buildingType: BuildingType;
  floorIndex: number;
}

const WALL_THICKNESS = 0.22;
const WINDOW_GLASS_COLOR = "#A8C4D0";
const WINDOW_FRAME_COLOR = "#2A2A2A";
const WINDOW_INTERIOR_COLOR = "#1A1A2E";

const DEBRIS_COLORS = [
  "#3A3530",
  "#555045",
  "#6A5A4A",
  "#4A4040",
  "#2E2820",
  "#5A4E3A",
  "#4A3E30",
];

export function BuildingChunk({
  chunk,
  color,
  accentColor,
  isTopFloor,
  isGroundFloor,
  buildingType,
  floorIndex,
}: BuildingChunkProps) {
  const groupRef = useRef<THREE.Group>(null);
  const debrisGroupRef = useRef<THREE.Group>(null);
  const opacityRef = useRef<number>(1);
  const [fallingState, setFallingState] = useState<{
    velocity: THREE.Vector3;
    angularVelocity: THREE.Euler;
    started: boolean;
    startTime: number;
  } | null>(null);

  const debrisRef = useRef<DebrisBrick[]>([]);
  const prevIntact = useRef(chunk.intact);

  const chunkColor = isTopFloor ? accentColor : color;

  const crackedColor = useMemo(() => {
    const c = new THREE.Color(chunkColor);
    c.multiplyScalar(0.62);
    return `#${c.getHexString()}`;
  }, [chunkColor]);

  const materialColor = chunk.cracked ? crackedColor : chunkColor;

  useEffect(() => {
    if (prevIntact.current && !chunk.intact) {
      setTimeout(() => playChunkDestroy(), Math.random() * 80);

      const avx = (Math.random() - 0.5) * 10;
      const avy = (Math.random() - 0.5) * 10;
      const avz = (Math.random() - 0.5) * 10;
      const vx = (Math.random() - 0.5) * 22;
      const vy = Math.random() * 10 + 4;
      const vz = (Math.random() - 0.5) * 22;

      setFallingState({
        velocity: new THREE.Vector3(vx, vy, vz),
        angularVelocity: new THREE.Euler(avx, avy, avz),
        started: true,
        startTime: Date.now(),
      });

      // ---------- Spawn many small debris bricks ----------
      if (debrisGroupRef.current) {
        const numBricks = 12 + Math.floor(Math.random() * 5); // 12-16
        const canSpawn = Math.min(
          numBricks,
          MAX_GLOBAL_DEBRIS - globalDebrisCount,
        );

        for (let i = 0; i < canSpawn; i++) {
          // Varied rectangular shapes – NOT cubes
          const bw = 0.15 + Math.random() * 0.3;
          const bh = 0.12 + Math.random() * 0.28;
          const bd = 0.15 + Math.random() * 0.3;

          const geo = new THREE.BoxGeometry(bw, bh, bd);
          const col =
            DEBRIS_COLORS[Math.floor(Math.random() * DEBRIS_COLORS.length)];
          const mat = new THREE.MeshBasicMaterial({
            color: col,
            transparent: true,
            opacity: 1,
          });
          const mesh = new THREE.Mesh(geo, mat);

          // Spread spawn position across chunk face
          const [cx, cy, cz] = chunk.position;
          const [cw, ch, cdp] = chunk.size;
          mesh.position.set(
            cx + (Math.random() - 0.5) * cw * 0.9,
            cy + (Math.random() - 0.5) * ch * 0.7,
            cz + (Math.random() - 0.5) * cdp * 0.9,
          );

          // Random initial rotation
          mesh.rotation.set(
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2,
          );

          const dVx = (Math.random() - 0.5) * 40; // ±20
          const dVy = Math.random() * 9 + 5; // 5-14
          const dVz = (Math.random() - 0.5) * 40; // ±20
          const angX = (Math.random() - 0.5) * 24; // ±12 rad/s
          const angY = (Math.random() - 0.5) * 24;
          const angZ = (Math.random() - 0.5) * 24;

          debrisGroupRef.current.add(mesh);
          globalDebrisCount++;

          debrisRef.current.push({
            mesh,
            velocity: new THREE.Vector3(dVx, dVy, dVz),
            angularVelocity: new THREE.Vector3(angX, angY, angZ),
            life: 0,
            maxLife: 3.0 + Math.random() * 1.0, // 3-4 seconds
          });
        }
      }
    }
    prevIntact.current = chunk.intact;
  }, [chunk.intact, chunk.position, chunk.size]);

  // Cleanup debris on unmount
  useEffect(() => {
    return () => {
      for (const d of debrisRef.current) {
        if (d.life < d.maxLife) {
          globalDebrisCount = Math.max(0, globalDebrisCount - 1);
        }
        d.mesh.geometry.dispose();
        (d.mesh.material as THREE.Material).dispose();
      }
      debrisRef.current = [];
    };
  }, []);

  useFrame((_, delta) => {
    // Animate falling chunk group (wall panels inside)
    if (groupRef.current && fallingState?.started) {
      const gravity = -12;
      fallingState.velocity.y += gravity * delta;

      groupRef.current.position.x += fallingState.velocity.x * delta;
      groupRef.current.position.y += fallingState.velocity.y * delta;
      groupRef.current.position.z += fallingState.velocity.z * delta;

      groupRef.current.rotation.x += fallingState.angularVelocity.x * delta;
      groupRef.current.rotation.y += fallingState.angularVelocity.y * delta;
      groupRef.current.rotation.z += fallingState.angularVelocity.z * delta;

      if (groupRef.current.position.y < chunk.size[1] / 2) {
        groupRef.current.position.y = chunk.size[1] / 2;
        fallingState.velocity.y *= -0.25;
        fallingState.velocity.x *= 0.65;
        fallingState.velocity.z *= 0.65;
        fallingState.angularVelocity.x *= 0.6;
        fallingState.angularVelocity.y *= 0.6;
        fallingState.angularVelocity.z *= 0.6;
      }

      const elapsed = (Date.now() - fallingState.startTime) / 1000;
      if (elapsed > 1.5) {
        const fadeT = Math.min((elapsed - 1.5) / 1.5, 1);
        opacityRef.current = 1 - fadeT;
        if (groupRef.current) {
          groupRef.current.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              const mat = child.material as THREE.MeshToonMaterial;
              if (mat.transparent !== undefined) {
                mat.transparent = true;
                mat.opacity = opacityRef.current;
              }
            }
          });
        }
        if (opacityRef.current <= 0) {
          groupRef.current.visible = false;
        }
      }
    }

    // Animate debris bricks
    for (const d of debrisRef.current) {
      if (d.life >= d.maxLife) continue;
      d.life += delta;

      // Gravity
      d.velocity.y -= 14 * delta;

      d.mesh.position.x += d.velocity.x * delta;
      d.mesh.position.y += d.velocity.y * delta;
      d.mesh.position.z += d.velocity.z * delta;

      // Angular rotation
      d.mesh.rotation.x += d.angularVelocity.x * delta;
      d.mesh.rotation.y += d.angularVelocity.y * delta;
      d.mesh.rotation.z += d.angularVelocity.z * delta;

      // Ground bounce
      if (d.mesh.position.y < 0.12) {
        d.mesh.position.y = 0.12;
        d.velocity.y *= -0.28;
        d.velocity.x *= 0.55;
        d.velocity.z *= 0.55;
        d.angularVelocity.x *= 0.5;
        d.angularVelocity.y *= 0.5;
        d.angularVelocity.z *= 0.5;
      }

      // Fade out in last 1.2 seconds
      const timeLeft = d.maxLife - d.life;
      if (timeLeft < 1.2) {
        const mat = d.mesh.material as THREE.MeshBasicMaterial;
        mat.opacity = Math.max(0, timeLeft / 1.2);
      }

      if (d.life >= d.maxLife) {
        d.mesh.visible = false;
        // Decrement global counter when brick's life is done
        globalDebrisCount = Math.max(0, globalDebrisCount - 1);
      }
    }
  });

  const [w, h, dp] = chunk.size;
  const t = WALL_THICKNESS;

  // Wall panel dimensions
  // Front/Back walls: full width × full height × thickness
  // Left/Right walls: thickness × full height × (depth - 2*thickness) so corners don't double up

  const facadeDetails = useMemo(() => {
    if (!chunk.intact) return null;
    switch (buildingType) {
      case "apartment":
        return (
          <ApartmentFacade w={w} h={h} d={dp} isGroundFloor={isGroundFloor} />
        );
      case "office":
        return <OfficeFacade w={w} h={h} d={dp} />;
      case "warehouse":
        return (
          <WarehouseFacade w={w} h={h} d={dp} isGroundFloor={isGroundFloor} />
        );
      case "tower":
        return <TowerFacade w={w} h={h} d={dp} />;
      default:
        return null;
    }
  }, [chunk.intact, buildingType, w, h, dp, isGroundFloor]);

  // Suppress unused variable warnings
  void floorIndex;

  // Crack decals: shown when cracked but still intact
  const crackDecals = useMemo(() => {
    if (!chunk.cracked || !chunk.intact) return null;
    const cracks: ReactElement[] = [];
    const crackColor = "#2A1A10";

    // 3 cracks on front face
    for (let i = 0; i < 3; i++) {
      const cx = (Math.random() - 0.5) * w * 0.7;
      const cy = (Math.random() - 0.5) * h * 0.6;
      const rot = Math.random() * Math.PI;
      const len = 0.3 + Math.random() * 0.4;
      cracks.push(
        <mesh
          key={`crack-f-${i}`}
          position={[cx, cy, dp / 2 + t + 0.01]}
          rotation={[0, 0, rot]}
        >
          <planeGeometry args={[len, 0.045]} />
          <meshBasicMaterial
            color={crackColor}
            transparent
            opacity={0.62}
            depthWrite={false}
          />
        </mesh>,
      );
    }
    // 2 cracks on right face
    for (let i = 0; i < 2; i++) {
      const cz = (Math.random() - 0.5) * dp * 0.6;
      const cy = (Math.random() - 0.5) * h * 0.6;
      const rot = Math.random() * Math.PI;
      const len = 0.25 + Math.random() * 0.35;
      cracks.push(
        <mesh
          key={`crack-r-${i}`}
          position={[w / 2 + t + 0.01, cy, cz]}
          rotation={[0, Math.PI / 2, rot]}
        >
          <planeGeometry args={[len, 0.04]} />
          <meshBasicMaterial
            color={crackColor}
            transparent
            opacity={0.58}
            depthWrite={false}
          />
        </mesh>,
      );
    }
    return cracks;
  }, [chunk.cracked, chunk.intact, w, h, dp, t]);

  return (
    <>
      <group
        ref={groupRef}
        position={chunk.position}
        visible={chunk.intact || !!fallingState}
      >
        {/* ===== HOLLOW WALL PANELS ===== */}

        {/* Front wall */}
        <WallPanel
          position={[0, 0, dp / 2 - t / 2]}
          size={[w, h, t]}
          color={materialColor}
        />

        {/* Back wall */}
        <WallPanel
          position={[0, 0, -(dp / 2 - t / 2)]}
          size={[w, h, t]}
          color={materialColor}
        />

        {/* Left wall (inset so no corner overlap) */}
        <WallPanel
          position={[-(w / 2 - t / 2), 0, 0]}
          size={[t, h, dp - t * 2]}
          color={materialColor}
        />

        {/* Right wall */}
        <WallPanel
          position={[w / 2 - t / 2, 0, 0]}
          size={[t, h, dp - t * 2]}
          color={materialColor}
        />

        {/* Thin floor slab */}
        <WallPanel
          position={[0, -(h / 2 - 0.07), 0]}
          size={[w - t * 2, 0.14, dp - t * 2]}
          color={materialColor}
        />

        {/* Crack decals (when damaged but not destroyed) */}
        {crackDecals}

        {/* Facade details when intact */}
        {facadeDetails}
      </group>

      {/* Debris bricks group – positioned in world space */}
      <group ref={debrisGroupRef} />
    </>
  );
}

// ---------- Hollow wall panel with Borderlands outline ----------
function WallPanel({
  position,
  size,
  color,
}: {
  position: [number, number, number];
  size: [number, number, number];
  color: string;
}) {
  const outlineSize: [number, number, number] = [
    size[0] * 1.06,
    size[1] * 1.06,
    size[2] * 1.06,
  ];

  return (
    <group position={position}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={size} />
        <meshToonMaterial color={color} transparent />
      </mesh>
      {/* Borderlands black outline */}
      <mesh>
        <boxGeometry args={outlineSize} />
        <meshBasicMaterial color="#000000" side={THREE.BackSide} />
      </mesh>
    </group>
  );
}

// ===== APARTMENT FACADE =====
function ApartmentFacade({
  w,
  h,
  d,
  isGroundFloor,
}: {
  w: number;
  h: number;
  d: number;
  isGroundFloor: boolean;
}) {
  const windowOffsets = [-w * 0.25, w * 0.25];

  return (
    <>
      {/* Front face windows */}
      {windowOffsets.map((xOff) => (
        <group
          key={`fw-${xOff.toFixed(3)}`}
          position={[xOff, h * 0.1, d / 2 + 0.01]}
        >
          <mesh>
            <boxGeometry args={[0.85, 1.05, 0.08]} />
            <meshToonMaterial color={WINDOW_FRAME_COLOR} />
          </mesh>
          <mesh position={[0, 0, 0.06]}>
            <planeGeometry args={[0.62, 0.82]} />
            <meshToonMaterial
              color={WINDOW_GLASS_COLOR}
              transparent
              opacity={0.75}
            />
          </mesh>
          <mesh position={[0, 0, 0.03]}>
            <planeGeometry args={[0.58, 0.78]} />
            <meshBasicMaterial
              color={WINDOW_INTERIOR_COLOR}
              transparent
              opacity={0.5}
            />
          </mesh>
        </group>
      ))}

      {/* Back face windows */}
      {windowOffsets.map((xOff) => (
        <group
          key={`bw-${xOff.toFixed(3)}`}
          position={[xOff, h * 0.1, -(d / 2 + 0.01)]}
          rotation={[0, Math.PI, 0]}
        >
          <mesh>
            <boxGeometry args={[0.85, 1.05, 0.08]} />
            <meshToonMaterial color={WINDOW_FRAME_COLOR} />
          </mesh>
          <mesh position={[0, 0, 0.06]}>
            <planeGeometry args={[0.62, 0.82]} />
            <meshToonMaterial
              color={WINDOW_GLASS_COLOR}
              transparent
              opacity={0.75}
            />
          </mesh>
        </group>
      ))}

      {/* Side face single window */}
      <group
        position={[w / 2 + 0.01, h * 0.1, 0]}
        rotation={[0, -Math.PI / 2, 0]}
      >
        <mesh>
          <boxGeometry args={[0.75, 0.95, 0.08]} />
          <meshToonMaterial color={WINDOW_FRAME_COLOR} />
        </mesh>
        <mesh position={[0, 0, 0.06]}>
          <planeGeometry args={[0.55, 0.75]} />
          <meshToonMaterial
            color={WINDOW_GLASS_COLOR}
            transparent
            opacity={0.75}
          />
        </mesh>
      </group>

      {/* Balcony slab on front (non-ground floors) */}
      {!isGroundFloor && (
        <mesh position={[0, -h * 0.35, d / 2 + 0.35]}>
          <boxGeometry args={[w * 0.7, 0.12, 0.7]} />
          <meshToonMaterial color="#7A6A5A" />
        </mesh>
      )}

      {/* Ground floor entrance door */}
      {isGroundFloor && (
        <group position={[0, -h * 0.2, d / 2 + 0.02]}>
          <mesh>
            <boxGeometry args={[0.9, 1.4, 0.06]} />
            <meshToonMaterial color="#5A3A1A" />
          </mesh>
          <mesh position={[0, 0.05, 0.06]}>
            <planeGeometry args={[0.75, 1.25]} />
            <meshToonMaterial color="#4A3010" />
          </mesh>
        </group>
      )}
    </>
  );
}

// ===== OFFICE FACADE =====
function OfficeFacade({
  w,
  h,
  d,
}: {
  w: number;
  h: number;
  d: number;
}) {
  const panelW = w * 0.85;
  const panelH = h * 0.78;
  const glassColor = "#6A9AB8";
  const frameColor = "#404850";

  return (
    <>
      {/* Front curtain wall */}
      <group position={[0, 0, d / 2 + 0.02]}>
        <mesh>
          <boxGeometry args={[panelW, panelH, 0.07]} />
          <meshToonMaterial color={frameColor} />
        </mesh>
        <mesh position={[0, 0, 0.05]}>
          <planeGeometry args={[panelW - 0.15, panelH - 0.15]} />
          <meshToonMaterial color={glassColor} transparent opacity={0.82} />
        </mesh>
        <mesh position={[0, 0, 0.06]}>
          <planeGeometry args={[panelW - 0.1, 0.08]} />
          <meshBasicMaterial color={frameColor} />
        </mesh>
        <mesh position={[0, 0, 0.06]}>
          <planeGeometry args={[0.06, panelH - 0.1]} />
          <meshBasicMaterial color={frameColor} />
        </mesh>
      </group>

      {/* Back curtain wall */}
      <group position={[0, 0, -(d / 2 + 0.02)]} rotation={[0, Math.PI, 0]}>
        <mesh>
          <boxGeometry args={[panelW, panelH, 0.07]} />
          <meshToonMaterial color={frameColor} />
        </mesh>
        <mesh position={[0, 0, 0.05]}>
          <planeGeometry args={[panelW - 0.15, panelH - 0.15]} />
          <meshToonMaterial color={glassColor} transparent opacity={0.82} />
        </mesh>
      </group>

      {/* Side wall panels */}
      {([-1, 1] as const).map((side) => (
        <group
          key={`side-${side}`}
          position={[(w / 2 + 0.02) * side, 0, 0]}
          rotation={[0, (side * Math.PI) / 2, 0]}
        >
          <mesh>
            <boxGeometry args={[d * 0.8, panelH, 0.07]} />
            <meshToonMaterial color={frameColor} />
          </mesh>
          <mesh position={[0, 0, 0.05]}>
            <planeGeometry args={[d * 0.7, panelH - 0.15]} />
            <meshToonMaterial color={glassColor} transparent opacity={0.75} />
          </mesh>
        </group>
      ))}
    </>
  );
}

// ===== WAREHOUSE FACADE =====
function WarehouseFacade({
  w,
  h,
  d,
  isGroundFloor,
}: {
  w: number;
  h: number;
  d: number;
  isGroundFloor: boolean;
}) {
  const ridgeColor = "#5A6A5A";
  const ridgeCount = 6;

  return (
    <>
      {/* Corrugated metal ridges on front */}
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const xPos = (i / (ridgeCount - 1) - 0.5) * (w * 0.92);
        return (
          <mesh
            key={`ridge-f-${xPos.toFixed(2)}`}
            position={[xPos, 0, d / 2 + 0.04]}
          >
            <boxGeometry args={[0.06, h * 0.95, 0.06]} />
            <meshToonMaterial color={ridgeColor} />
          </mesh>
        );
      })}

      {/* Corrugated ridges on back */}
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const xPos = (i / (ridgeCount - 1) - 0.5) * (w * 0.92);
        return (
          <mesh
            key={`ridge-b-${xPos.toFixed(2)}`}
            position={[xPos, 0, -(d / 2 + 0.04)]}
          >
            <boxGeometry args={[0.06, h * 0.95, 0.06]} />
            <meshToonMaterial color={ridgeColor} />
          </mesh>
        );
      })}

      {/* Large rollup door on ground floor front */}
      {isGroundFloor && (
        <group position={[0, -h * 0.08, d / 2 + 0.05]}>
          <mesh>
            <boxGeometry args={[w * 0.55, h * 0.72, 0.08]} />
            <meshToonMaterial color="#3A3A3A" />
          </mesh>
          {[-2, -1, 0, 1, 2].map((slatIdx) => {
            const yOff = slatIdx * ((h * 0.72) / 5);
            return (
              <mesh key={`slat-${slatIdx}`} position={[0, yOff, 0.06]}>
                <planeGeometry
                  args={[w * 0.52 - 0.05, (h * 0.72) / 5 - 0.04]}
                />
                <meshToonMaterial
                  color={slatIdx % 2 === 0 ? "#4A4A4A" : "#3A3A3A"}
                />
              </mesh>
            );
          })}
        </group>
      )}

      {/* Small high window on non-ground floor */}
      {!isGroundFloor && (
        <group position={[0, h * 0.2, d / 2 + 0.03]}>
          <mesh>
            <boxGeometry args={[w * 0.4, 0.55, 0.08]} />
            <meshToonMaterial color="#2A3030" />
          </mesh>
          <mesh position={[0, 0, 0.05]}>
            <planeGeometry args={[w * 0.36, 0.42]} />
            <meshToonMaterial color="#4A6070" transparent opacity={0.7} />
          </mesh>
        </group>
      )}
    </>
  );
}

// ===== TOWER FACADE =====
function TowerFacade({
  w,
  h,
  d,
}: {
  w: number;
  h: number;
  d: number;
}) {
  const stripColor = "#6080A0";
  const frameColor = "#303840";

  return (
    <>
      {/* Narrow vertical window strips on all 4 sides */}
      {/* Front */}
      {[-w * 0.22, w * 0.22].map((xOff) => (
        <group
          key={`tw-front-${xOff.toFixed(3)}`}
          position={[xOff, h * 0.05, d / 2 + 0.02]}
        >
          <mesh>
            <boxGeometry args={[0.32, h * 0.78, 0.07]} />
            <meshToonMaterial color={frameColor} />
          </mesh>
          <mesh position={[0, 0, 0.05]}>
            <planeGeometry args={[0.22, h * 0.72]} />
            <meshToonMaterial color={stripColor} transparent opacity={0.85} />
          </mesh>
        </group>
      ))}

      {/* Back */}
      {[-w * 0.22, w * 0.22].map((xOff) => (
        <group
          key={`tw-back-${xOff.toFixed(3)}`}
          position={[xOff, h * 0.05, -(d / 2 + 0.02)]}
          rotation={[0, Math.PI, 0]}
        >
          <mesh>
            <boxGeometry args={[0.32, h * 0.78, 0.07]} />
            <meshToonMaterial color={frameColor} />
          </mesh>
          <mesh position={[0, 0, 0.05]}>
            <planeGeometry args={[0.22, h * 0.72]} />
            <meshToonMaterial color={stripColor} transparent opacity={0.85} />
          </mesh>
        </group>
      ))}

      {/* Left */}
      <group
        position={[-(w / 2 + 0.02), h * 0.05, 0]}
        rotation={[0, Math.PI / 2, 0]}
      >
        <mesh>
          <boxGeometry args={[0.32, h * 0.78, 0.07]} />
          <meshToonMaterial color={frameColor} />
        </mesh>
        <mesh position={[0, 0, 0.05]}>
          <planeGeometry args={[0.22, h * 0.72]} />
          <meshToonMaterial color={stripColor} transparent opacity={0.85} />
        </mesh>
      </group>

      {/* Right */}
      <group
        position={[w / 2 + 0.02, h * 0.05, 0]}
        rotation={[0, -Math.PI / 2, 0]}
      >
        <mesh>
          <boxGeometry args={[0.32, h * 0.78, 0.07]} />
          <meshToonMaterial color={frameColor} />
        </mesh>
        <mesh position={[0, 0, 0.05]}>
          <planeGeometry args={[0.22, h * 0.72]} />
          <meshToonMaterial color={stripColor} transparent opacity={0.85} />
        </mesh>
      </group>
    </>
  );
}
