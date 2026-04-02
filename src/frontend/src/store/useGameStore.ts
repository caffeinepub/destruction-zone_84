import * as THREE from "three";
import { create } from "zustand";

export type BuildingType = "apartment" | "warehouse" | "office" | "tower";

export type PropType =
  | "tree"
  | "fence"
  | "powerpole"
  | "vehicle"
  | "sandbag"
  | "streetlamp"
  | "tent";

export interface DestructiblePropState {
  id: string;
  position: [number, number, number];
  rotation: number; // Y rotation in radians
  type: PropType;
  intact: boolean;
  cracked: boolean;
}

export interface ChunkState {
  id: number;
  position: [number, number, number];
  size: [number, number, number];
  intact: boolean;
  health: number;
  cracked?: boolean;
  velocity?: [number, number, number];
}

export interface BuildingState {
  id: number;
  position: [number, number, number];
  chunks: ChunkState[];
  color: string;
  accentColor: string;
  destroyed: boolean;
  destructionPercent: number;
  floors: number;
  widthX: number;
  widthZ: number;
  buildingType: BuildingType;
  chunkWidth: number;
  chunkHeight: number;
  chunkDepth: number;
}

export interface ProjectileData {
  id: string;
  position: [number, number, number];
  direction: [number, number, number];
  speed: number;
  createdAt: number;
  shotSize: number;
}

export interface ExplosionData {
  id: string;
  position: [number, number, number];
  startTime: number;
  radius: number;
  size: number;
}

export interface DustCloudData {
  id: string;
  position: [number, number, number];
  startTime: number;
}

interface GameStore {
  gameState: "menu" | "playing" | "victory";
  buildings: BuildingState[];
  props: DestructiblePropState[];
  projectiles: ProjectileData[];
  explosions: ExplosionData[];
  dustClouds: DustCloudData[];
  ammo: number;
  maxAmmo: number;
  score: number;
  timeElapsed: number;
  destroyedBuildings: number;
  isReloading: boolean;
  lastFiredAt: number;
  screenShake: boolean;
  screenShakeCount: number;
  skyFlashIntensity: number;
  cameraMode: "fps" | "birdseye";
  shotSize: number;
  setSkyFlashIntensity: (v: number) => void;
  setCameraMode: (mode: "fps" | "birdseye") => void;
  toggleCameraMode: () => void;
  setShotSize: (size: number) => void;
  cycleShotSize: (dir: 1 | -1) => void;
  startGame: () => void;
  resetGame: () => void;
  damagePropsInRadius: (
    explosionPos: [number, number, number],
    radius: number,
  ) => void;
  fireRocket: (
    position: [number, number, number],
    direction: [number, number, number],
    shotSize?: number,
  ) => void;
  updateProjectile: (id: string, position: [number, number, number]) => void;
  removeProjectile: (id: string) => void;
  triggerExplosion: (
    position: [number, number, number],
    radius: number,
    size?: number,
  ) => void;
  removeExplosion: (id: string) => void;
  triggerShockwaveDamage: (
    position: [number, number, number],
    maxRadius: number,
    durationMs: number,
  ) => void;
  addDustCloud: (position: [number, number, number]) => void;
  removeDustCloud: (id: string) => void;
  damageChunk: (
    buildingId: number,
    chunkId: number,
    explosionPos: [number, number, number],
  ) => void;
  applyExplosionDamage: (
    explosionPos: [number, number, number],
    radius: number,
  ) => void;
  addScore: (points: number) => void;
  reloadAmmo: () => void;
  startReload: () => void;
  incrementTime: (delta: number) => void;
  triggerScreenShake: () => void;
}

// Realistic, muted building colors by type
const BUILDING_TYPE_COLORS: Record<
  BuildingType,
  { color: string; accentColor: string }
> = {
  apartment: { color: "#B5887A", accentColor: "#8B6055" }, // terracotta brick
  warehouse: { color: "#7A8B7A", accentColor: "#5A6B5A" }, // industrial green-grey
  office: { color: "#8A9BAA", accentColor: "#6A7B8A" }, // glass blue-grey
  tower: { color: "#9A9080", accentColor: "#7A7060" }, // concrete grey
};

const BUILDING_TYPES: BuildingType[] = [
  "apartment",
  "warehouse",
  "office",
  "tower",
];

function createBuilding(
  id: number,
  position: [number, number, number],
): BuildingState {
  const buildingType = BUILDING_TYPES[id % 4];

  let floors: number;
  let widthX: number;
  let widthZ: number;
  let chunkWidth: number;
  let chunkHeight: number;
  let chunkDepth: number;

  switch (buildingType) {
    case "apartment":
      floors = 4 + (id % 3); // 4-6 floors
      widthX = 2 + (id % 2); // 2-3 chunks wide
      widthZ = 2 + ((id + 1) % 2);
      chunkWidth = 4;
      chunkHeight = 3.2;
      chunkDepth = 4;
      break;
    case "warehouse":
      floors = 2;
      widthX = 3 + (id % 2); // 3-4 chunks wide
      widthZ = 3 + ((id + 1) % 2);
      chunkWidth = 5;
      chunkHeight = 4.5;
      chunkDepth = 5;
      break;
    case "office":
      floors = 6 + (id % 3); // 6-8 floors
      widthX = 2;
      widthZ = 2;
      chunkWidth = 3.5;
      chunkHeight = 3.5;
      chunkDepth = 3.5;
      break;
    case "tower":
      floors = 8 + (id % 3); // 8-10 floors
      widthX = 2;
      widthZ = 2;
      chunkWidth = 3;
      chunkHeight = 3.2;
      chunkDepth = 3;
      break;
  }

  const chunks: ChunkState[] = [];
  let chunkId = 0;

  for (let floor = 0; floor < floors; floor++) {
    for (let x = 0; x < widthX; x++) {
      for (let z = 0; z < widthZ; z++) {
        const worldX = position[0] + (x - (widthX - 1) / 2) * chunkWidth;
        const worldY = position[1] + floor * chunkHeight + chunkHeight / 2;
        const worldZ = position[2] + (z - (widthZ - 1) / 2) * chunkDepth;

        chunks.push({
          id: chunkId++,
          position: [worldX, worldY, worldZ],
          size: [chunkWidth - 0.12, chunkHeight - 0.12, chunkDepth - 0.12],
          intact: true,
          health: 100,
          cracked: false,
        });
      }
    }
  }

  const colorInfo = BUILDING_TYPE_COLORS[buildingType];

  return {
    id,
    position,
    chunks,
    color: colorInfo.color,
    accentColor: colorInfo.accentColor,
    destroyed: false,
    destructionPercent: 0,
    floors,
    widthX,
    widthZ,
    buildingType,
    chunkWidth,
    chunkHeight,
    chunkDepth,
  };
}

function generateBuildingPositions(): [number, number, number][] {
  const positions: [number, number, number][] = [];
  const count = 10;
  const radius = 38;

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const r = radius + (i % 3) * 7;
    positions.push([Math.cos(angle) * r, 0, Math.sin(angle) * r]);
  }
  return positions;
}

const INITIAL_BUILDINGS: BuildingState[] = generateBuildingPositions().map(
  (pos, i) => createBuilding(i, pos),
);

// ─── Prop generation ─────────────────────────────────────────────────────

function seededRand(seed: number): number {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

function generateProps(): DestructiblePropState[] {
  const props: DestructiblePropState[] = [];

  // ── Trees: 40 scattered outside building cluster (radius 15–70) ──
  const treeCount = 40;
  for (let i = 0; i < treeCount; i++) {
    const angle = seededRand(i * 17) * Math.PI * 2;
    const radius = 15 + seededRand(i * 31) * 55;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    if (radius > 30 && radius < 55) {
      const offsetAngle = angle + 0.35 + seededRand(i * 7) * 0.3;
      props.push({
        id: `tree-${i}`,
        position: [
          Math.cos(offsetAngle) * radius,
          0,
          Math.sin(offsetAngle) * radius,
        ],
        rotation: seededRand(i * 13) * Math.PI * 2,
        type: "tree",
        intact: true,
        cracked: false,
      });
    } else {
      props.push({
        id: `tree-${i}`,
        position: [x, 0, z],
        rotation: seededRand(i * 13) * Math.PI * 2,
        type: "tree",
        intact: true,
        cracked: false,
      });
    }
  }

  // ── Fence segments: 7 rows ──
  const fenceLines = [
    { startX: -55, startZ: 10, count: 7, dirX: 0, dirZ: 1, spacing: 2.6 },
    { startX: 55, startZ: -15, count: 8, dirX: 0, dirZ: 1, spacing: 2.6 },
    { startX: -20, startZ: -58, count: 6, dirX: 1, dirZ: 0, spacing: 2.6 },
    { startX: 10, startZ: 58, count: 7, dirX: 1, dirZ: 0, spacing: 2.6 },
    { startX: -42, startZ: -42, count: 6, dirX: 1, dirZ: 1, spacing: 2.8 },
    { startX: 30, startZ: 70, count: 6, dirX: 1, dirZ: 0, spacing: 2.6 },
    { startX: -72, startZ: -10, count: 5, dirX: 0, dirZ: 1, spacing: 2.6 },
  ];
  let fenceIdx = 0;
  for (const line of fenceLines) {
    for (let i = 0; i < line.count; i++) {
      const jitter = (seededRand(fenceIdx * 7 + 3) - 0.5) * 0.4;
      const rotJitter = (seededRand(fenceIdx * 11) - 0.5) * 0.15;
      const fenceRotation =
        line.dirX === 0
          ? Math.PI / 2 + rotJitter
          : line.dirZ === 0
            ? rotJitter
            : Math.PI / 4 + rotJitter;
      props.push({
        id: `fence-${fenceIdx}`,
        position: [
          line.startX + line.dirX * i * line.spacing + jitter,
          0,
          line.startZ + line.dirZ * i * line.spacing + jitter,
        ],
        rotation: fenceRotation,
        type: "fence",
        intact: true,
        cracked: false,
      });
      fenceIdx++;
    }
  }

  // ── Power poles: 4 lines ──
  const poleLines = [
    { startX: -30, startZ: -70, count: 6, dirX: 1, dirZ: 0 },
    { startX: -24, startZ: 65, count: 6, dirX: 1, dirZ: 0 },
    { startX: 68, startZ: -25, count: 6, dirX: 0, dirZ: 1 },
    { startX: -70, startZ: -30, count: 5, dirX: 0, dirZ: 1 },
  ];
  let poleLineIdx = 0;
  for (const line of poleLines) {
    for (let i = 0; i < line.count; i++) {
      props.push({
        id: `pole-${poleLineIdx}-${i}`,
        position: [
          line.startX + line.dirX * i * 12,
          0,
          line.startZ + line.dirZ * i * 12,
        ],
        rotation: line.dirX === 0 ? 0 : Math.PI / 2,
        type: "powerpole",
        intact: true,
        cracked: false,
      });
    }
    poleLineIdx++;
  }

  // ── Destructible vehicles: 12 scattered around the map ──
  const vehiclePositions: Array<[number, number, number, number]> = [
    [-18, 0, -35, 0.4],
    [32, 0, 22, -0.8],
    [-42, 0, 8, 2.1],
    [50, 0, -28, 0.6],
    [-15, 0, 55, -0.3],
    [25, 0, -55, 1.4],
    [-58, 0, -18, 0.9],
    [62, 0, 15, -1.1],
    [8, 0, 45, 0.2],
    [-32, 0, -58, -0.5],
    [45, 0, 50, 1.7],
    [-48, 0, 38, -1.3],
  ];
  for (let i = 0; i < vehiclePositions.length; i++) {
    const [vx, vy, vz, rot] = vehiclePositions[i];
    props.push({
      id: `vehicle-${i}`,
      position: [vx, vy, vz],
      rotation: rot,
      type: "vehicle",
      intact: true,
      cracked: false,
    });
  }

  // ── Destructible sandbag walls: 15 scattered ──
  const sandbagWallData: Array<[number, number, number]> = [
    [-24, -12, 0.2],
    [30, -5, -0.3],
    [-12, 28, Math.PI / 2 + 0.1],
    [45, -18, 0.4],
    [-52, -8, -0.5],
    [18, 52, 0.3],
    [-38, 55, Math.PI / 4],
    [62, 42, -0.2],
    [5, -42, 0.7],
    [-68, -42, Math.PI / 2 - 0.2],
    [38, -68, 0.1],
    [-20, -68, -0.4],
    [68, -52, Math.PI / 2 + 0.3],
    [-65, 52, 0.6],
    [22, 68, -0.1],
  ];
  for (let i = 0; i < sandbagWallData.length; i++) {
    const [sbx, sbz, rot] = sandbagWallData[i];
    props.push({
      id: `sandbag-${i}`,
      position: [sbx, 0, sbz],
      rotation: rot,
      type: "sandbag",
      intact: true,
      cracked: false,
    });
  }

  // ── Destructible street lamps: 8 extra outside main roads ──
  const lampData: Array<[number, number]> = [
    [-55, -22],
    [55, 22],
    [-55, 35],
    [55, -35],
    [30, 68],
    [-30, -68],
    [68, 30],
    [-68, -30],
  ];
  for (let i = 0; i < lampData.length; i++) {
    const [lx, lz] = lampData[i];
    props.push({
      id: `lamp-${i}`,
      position: [lx, 0, lz],
      rotation: 0,
      type: "streetlamp",
      intact: true,
      cracked: false,
    });
  }

  // ── Destructible military tents: 6 in outer areas ──
  const tentData: Array<[number, number, number]> = [
    [-62, -48, 0.3],
    [66, 43, -0.5],
    [-67, 46, 1.1],
    [60, -60, -0.2],
    [-22, 68, 0.7],
    [22, -70, -0.4],
  ];
  for (let i = 0; i < tentData.length; i++) {
    const [tx, tz, rot] = tentData[i];
    props.push({
      id: `tent-${i}`,
      position: [tx, 0, tz],
      rotation: rot,
      type: "tent",
      intact: true,
      cracked: false,
    });
  }

  return props;
}

const INITIAL_PROPS: DestructiblePropState[] = generateProps();

function createInitialState() {
  return {
    gameState: "playing" as const,
    buildings: INITIAL_BUILDINGS,
    props: INITIAL_PROPS,
    projectiles: [],
    explosions: [],
    dustClouds: [],
    ammo: 6,
    maxAmmo: 6,
    score: 0,
    timeElapsed: 0,
    destroyedBuildings: 0,
    isReloading: false,
    lastFiredAt: 0,
    screenShake: false,
    screenShakeCount: 0,
    skyFlashIntensity: 0,
    cameraMode: "fps" as const,
    shotSize: 1,
  };
}

export const useGameStore = create<GameStore>((set, get) => ({
  ...createInitialState(),

  startGame: () => {
    const positions = generateBuildingPositions();
    const buildings = positions.map((pos, i) => createBuilding(i, pos));
    set({
      gameState: "playing",
      buildings,
      props: generateProps(),
      projectiles: [],
      explosions: [],
      dustClouds: [],
      ammo: 6,
      score: 0,
      timeElapsed: 0,
      destroyedBuildings: 0,
      isReloading: false,
      lastFiredAt: 0,
      screenShake: false,
      screenShakeCount: 0,
      skyFlashIntensity: 0,
      cameraMode: "fps",
      shotSize: 1,
    });
  },

  resetGame: () => {
    const positions = generateBuildingPositions();
    const buildings = positions.map((pos, i) => createBuilding(i, pos));
    set({
      gameState: "playing",
      buildings,
      props: generateProps(),
      projectiles: [],
      explosions: [],
      dustClouds: [],
      ammo: 6,
      score: 0,
      timeElapsed: 0,
      destroyedBuildings: 0,
      isReloading: false,
      lastFiredAt: 0,
      screenShake: false,
      screenShakeCount: 0,
      skyFlashIntensity: 0,
      cameraMode: "fps",
      shotSize: 1,
    });
  },

  setShotSize: (size) => {
    set({ shotSize: Math.max(1, Math.min(10, size)) });
  },

  cycleShotSize: (dir) => {
    set((s) => ({ shotSize: Math.max(1, Math.min(10, s.shotSize + dir)) }));
  },

  fireRocket: (position, direction, shotSize) => {
    const state = get();
    if (state.ammo <= 0 || state.isReloading) return;
    const now = Date.now();
    if (now - state.lastFiredAt < 800) return;

    const size = shotSize ?? state.shotSize;
    const id = `rocket-${now}-${Math.random()}`;
    set((s) => ({
      projectiles: [
        ...s.projectiles,
        {
          id,
          position,
          direction,
          speed: 40,
          createdAt: now,
          shotSize: size,
        },
      ],
      ammo: s.ammo - 1,
      lastFiredAt: now,
    }));
  },

  updateProjectile: (id, position) => {
    set((s) => ({
      projectiles: s.projectiles.map((p) =>
        p.id === id ? { ...p, position } : p,
      ),
    }));
  },

  removeProjectile: (id) => {
    set((s) => ({
      projectiles: s.projectiles.filter((p) => p.id !== id),
    }));
  },

  triggerExplosion: (position, radius, size = 1) => {
    const id = `explosion-${Date.now()}-${Math.random()}`;
    set((s) => ({
      explosions: [
        ...s.explosions,
        { id, position, startTime: Date.now(), radius, size },
      ],
    }));
  },

  removeExplosion: (id) => {
    set((s) => ({
      explosions: s.explosions.filter((e) => e.id !== id),
    }));
  },

  addDustCloud: (position) => {
    const id = `dust-${Date.now()}-${Math.random()}`;
    set((s) => ({
      dustClouds: [...s.dustClouds, { id, position, startTime: Date.now() }],
    }));
  },

  removeDustCloud: (id) => {
    set((s) => ({
      dustClouds: s.dustClouds.filter((d) => d.id !== id),
    }));
  },

  damageChunk: (buildingId, chunkId, _explosionPos) => {
    set((s) => {
      const buildings = s.buildings.map((b) => {
        if (b.id !== buildingId) return b;
        const chunks = b.chunks.map((c) =>
          c.id === chunkId ? { ...c, intact: false, health: 0 } : c,
        );
        const destroyedCount = chunks.filter((c) => !c.intact).length;
        const destructionPercent = (destroyedCount / chunks.length) * 100;
        const destroyed = destructionPercent === 100;
        return { ...b, chunks, destructionPercent, destroyed };
      });

      const destroyedBuildings = buildings.filter((b) => b.destroyed).length;
      const newScore =
        destroyedBuildings > s.destroyedBuildings
          ? s.score + 1000 * (destroyedBuildings - s.destroyedBuildings)
          : s.score;

      const gameState = destroyedBuildings >= 10 ? "victory" : s.gameState;

      return {
        buildings,
        destroyedBuildings,
        score: newScore,
        gameState,
      };
    });
  },

  applyExplosionDamage: (explosionPos, radius) => {
    const state = get();
    const expV = new THREE.Vector3(...explosionPos);
    let totalChunksDestroyed = 0;
    const destroyedChunkPositions: [number, number, number][] = [];

    // Track which chunks got newly destroyed and their floor/building info
    const newlyDestroyedChunks: Array<{
      buildingId: number;
      chunkId: number;
      floor: number;
      xIdx: number;
      zIdx: number;
      chunkHeight: number;
      widthX: number;
      widthZ: number;
    }> = [];

    const updatedBuildings = state.buildings.map((b) => {
      const chunksPerFloor = b.widthX * b.widthZ;
      const chunks = b.chunks.map((c) => {
        if (!c.intact) return c;
        const chunkV = new THREE.Vector3(...c.position);
        const dist = expV.distanceTo(chunkV);
        if (dist <= radius) {
          totalChunksDestroyed++;
          destroyedChunkPositions.push(c.position);
          const floorIdx = Math.floor(c.id / chunksPerFloor);
          const posInFloor = c.id % chunksPerFloor;
          const xIdx = Math.floor(posInFloor / b.widthZ);
          const zIdx = posInFloor % b.widthZ;
          newlyDestroyedChunks.push({
            buildingId: b.id,
            chunkId: c.id,
            floor: floorIdx,
            xIdx,
            zIdx,
            chunkHeight: b.chunkHeight,
            widthX: b.widthX,
            widthZ: b.widthZ,
          });
          return { ...c, intact: false, health: 0, cracked: false };
        }
        // Partial damage for nearby chunks - mark as cracked
        if (dist <= radius * 1.5) {
          return { ...c, cracked: true };
        }
        return c;
      });

      const destroyedCount = chunks.filter((c) => !c.intact).length;
      const destructionPercent = (destroyedCount / chunks.length) * 100;
      const destroyed = destructionPercent === 100;
      return { ...b, chunks, destructionPercent, destroyed };
    });

    const destroyedBuildings = updatedBuildings.filter(
      (b) => b.destroyed,
    ).length;
    const pointsFromChunks = totalChunksDestroyed * 50;
    const newBuildingsDestroyed = destroyedBuildings - state.destroyedBuildings;
    const buildingBonus =
      newBuildingsDestroyed > 0 ? newBuildingsDestroyed * 1000 : 0;

    const gameState = destroyedBuildings >= 10 ? "victory" : state.gameState;

    set({
      buildings: updatedBuildings,
      destroyedBuildings,
      score: state.score + pointsFromChunks + buildingBonus,
      gameState,
    });

    // Damage environment props in explosion radius
    get().damagePropsInRadius(explosionPos, radius);

    // Add dust clouds for destroyed chunks
    for (const pos of destroyedChunkPositions) {
      get().addDustCloud(pos);
    }

    // Cascading collapse: check if chunks above destroyed ones should also fall
    if (newlyDestroyedChunks.length > 0) {
      const delay = 300 + Math.random() * 300;
      setTimeout(() => {
        const currentState = get();
        const cascadeDestroyedPositions: [number, number, number][] = [];

        const cascadedBuildings = currentState.buildings.map((b) => {
          const chunksPerFloor = b.widthX * b.widthZ;
          // Find which x,z positions lost chunks in this building
          const affectedXZ = new Set<string>();
          for (const nd of newlyDestroyedChunks) {
            if (nd.buildingId === b.id) {
              affectedXZ.add(`${nd.xIdx},${nd.zIdx}`);
            }
          }
          if (affectedXZ.size === 0) return b;

          const chunks = b.chunks.map((c) => {
            if (!c.intact) return c;
            const floorIdx = Math.floor(c.id / chunksPerFloor);
            const posInFloor = c.id % chunksPerFloor;
            const xIdx = Math.floor(posInFloor / b.widthZ);
            const zIdx = posInFloor % b.widthZ;
            const key = `${xIdx},${zIdx}`;

            if (!affectedXZ.has(key)) return c;

            // Check if there's a chunk below supporting this one
            const chunkBelowId = c.id - chunksPerFloor;
            if (floorIdx === 0) return c; // ground floor, skip
            const chunkBelow = b.chunks.find((ch) => ch.id === chunkBelowId);
            if (chunkBelow && !chunkBelow.intact) {
              // No support below - cascade collapse
              cascadeDestroyedPositions.push(c.position);
              return { ...c, intact: false, health: 0 };
            }
            return c;
          });

          const destroyedCount = chunks.filter((c) => !c.intact).length;
          const destructionPercent = (destroyedCount / chunks.length) * 100;
          const destroyed = destructionPercent === 100;
          return { ...b, chunks, destructionPercent, destroyed };
        });

        const newDestroyedBuildings = cascadedBuildings.filter(
          (b) => b.destroyed,
        ).length;
        const cascadeBonus =
          (newDestroyedBuildings - destroyedBuildings) * 1000;
        const cascadeGameState =
          newDestroyedBuildings >= 10 ? "victory" : currentState.gameState;

        set((s) => ({
          buildings: cascadedBuildings,
          destroyedBuildings: newDestroyedBuildings,
          score: s.score + cascadeBonus,
          gameState: cascadeGameState,
        }));

        // Add dust for cascaded chunks
        for (const pos of cascadeDestroyedPositions) {
          get().addDustCloud(pos);
        }
      }, delay);
    }
  },

  triggerShockwaveDamage: (position, maxRadius, durationMs) => {
    // Expand damage radius over time in steps, simulating blast wave travel
    const steps = 10;
    const stepDelay = durationMs / steps;
    for (let i = 1; i <= steps; i++) {
      const radius = (maxRadius / steps) * i;
      setTimeout(() => {
        get().applyExplosionDamage(position, radius);
        get().damagePropsInRadius(position, radius);
      }, stepDelay * i);
    }
  },

  damagePropsInRadius: (explosionPos, radius) => {
    const expV = new THREE.Vector3(...explosionPos);
    set((s) => ({
      props: s.props.map((p) => {
        if (!p.intact) return p;
        const pV = new THREE.Vector3(
          p.position[0],
          p.position[1],
          p.position[2],
        );
        const dist = expV.distanceTo(pV);
        if (dist <= radius) {
          return { ...p, intact: false, cracked: false };
        }
        if (dist <= radius * 1.8) {
          return { ...p, cracked: true };
        }
        return p;
      }),
    }));
  },

  addScore: (points) => {
    set((s) => ({ score: s.score + points }));
  },

  reloadAmmo: () => {
    set({ ammo: 6, isReloading: false });
  },

  startReload: () => {
    set({ isReloading: true });
    setTimeout(() => {
      get().reloadAmmo();
    }, 2000);
  },

  incrementTime: (delta) => {
    set((s) => ({ timeElapsed: s.timeElapsed + delta }));
  },

  triggerScreenShake: () => {
    set((s) => ({
      screenShake: true,
      screenShakeCount: s.screenShakeCount + 1,
    }));
    setTimeout(() => set({ screenShake: false }), 300);
  },

  setSkyFlashIntensity: (v: number) => {
    set({ skyFlashIntensity: Math.max(0, Math.min(1, v)) });
  },

  setCameraMode: (mode) => {
    set({ cameraMode: mode });
  },

  toggleCameraMode: () => {
    set((s) => ({ cameraMode: s.cameraMode === "fps" ? "birdseye" : "fps" }));
  },
}));
