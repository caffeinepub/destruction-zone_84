import type { BuildingState } from "@/store/useGameStore";
import { type ReactElement, useMemo } from "react";
import * as THREE from "three";
import { BuildingChunk } from "./BuildingChunk";

interface BuildingProps {
  building: BuildingState;
}

export function Building({ building }: BuildingProps) {
  const {
    chunks,
    color,
    accentColor,
    floors,
    widthX,
    widthZ,
    buildingType,
    chunkWidth,
    chunkHeight,
    chunkDepth,
  } = building;

  const chunksPerFloor = widthX * widthZ;
  const totalBuildingWidth = widthX * chunkWidth;
  const totalBuildingDepth = widthZ * chunkDepth;

  // Compute which floors still have at least one intact chunk
  const intactFloors = useMemo(() => {
    const floorSet = new Set<number>();
    for (const chunk of chunks) {
      if (chunk.intact) {
        floorSet.add(Math.floor(chunk.id / chunksPerFloor));
      }
    }
    return floorSet;
  }, [chunks, chunksPerFloor]);

  // Floor band color (slightly darker than main color)
  const floorBandColor = useMemo(() => {
    const c = new THREE.Color(color);
    c.multiplyScalar(0.72);
    return `#${c.getHexString()}`;
  }, [color]);

  // Corner pillar color
  const pillarColor = useMemo(() => {
    const c = new THREE.Color(accentColor);
    c.multiplyScalar(0.65);
    return `#${c.getHexString()}`;
  }, [accentColor]);

  // Floor separator bands
  const floorBands = useMemo(() => {
    if (buildingType === "warehouse") return [];
    const bands: ReactElement[] = [];
    for (let floor = 1; floor < floors; floor++) {
      // Band between floor-1 and floor: only show if at least one chunk on EITHER floor is intact
      if (!intactFloors.has(floor - 1) && !intactFloors.has(floor)) continue;
      const bandY = building.position[1] + floor * chunkHeight;
      bands.push(
        <mesh
          key={`band-${floor}`}
          position={[building.position[0], bandY, building.position[2]]}
          castShadow
        >
          <boxGeometry
            args={[totalBuildingWidth + 0.1, 0.22, totalBuildingDepth + 0.1]}
          />
          <meshToonMaterial color={floorBandColor} />
        </mesh>,
      );
    }
    return bands;
  }, [
    building.position,
    floors,
    chunkHeight,
    totalBuildingWidth,
    totalBuildingDepth,
    floorBandColor,
    buildingType,
    intactFloors,
  ]);

  // Corner pillars for tower type – rendered per floor so destroyed floors lose their pillar segments
  const cornerPillars = useMemo(() => {
    if (buildingType !== "tower") return [];
    const halfW = totalBuildingWidth / 2;
    const halfD = totalBuildingDepth / 2;
    const pillarW = 0.35;
    const pillarD = 0.35;

    const corners: [number, number][] = [
      [-halfW + pillarW / 2, -halfD + pillarD / 2],
      [halfW - pillarW / 2, -halfD + pillarD / 2],
      [-halfW + pillarW / 2, halfD - pillarD / 2],
      [halfW - pillarW / 2, halfD - pillarD / 2],
    ];

    const segments: ReactElement[] = [];
    for (let floor = 0; floor < floors; floor++) {
      if (!intactFloors.has(floor)) continue;
      const segCenterY =
        building.position[1] + floor * chunkHeight + chunkHeight / 2;
      for (const [cx, cz] of corners) {
        segments.push(
          <mesh
            key={`pillar-${floor}-${cx.toFixed(2)}-${cz.toFixed(2)}`}
            position={[
              building.position[0] + cx,
              segCenterY,
              building.position[2] + cz,
            ]}
            castShadow
          >
            <boxGeometry args={[pillarW, chunkHeight + 0.1, pillarD]} />
            <meshToonMaterial color={pillarColor} />
          </mesh>,
        );
      }
    }
    return segments;
  }, [
    building.position,
    floors,
    chunkHeight,
    totalBuildingWidth,
    totalBuildingDepth,
    pillarColor,
    buildingType,
    intactFloors,
  ]);

  // Office top parapet / cornice – only visible when top floor still has intact chunks
  const cornice = useMemo(() => {
    if (buildingType !== "office" && buildingType !== "apartment") return null;
    if (!intactFloors.has(floors - 1)) return null;
    const topY = building.position[1] + floors * chunkHeight + 0.2;
    return (
      <mesh position={[building.position[0], topY, building.position[2]]}>
        <boxGeometry
          args={[totalBuildingWidth + 0.4, 0.4, totalBuildingDepth + 0.4]}
        />
        <meshToonMaterial color={pillarColor} />
      </mesh>
    );
  }, [
    building.position,
    floors,
    chunkHeight,
    totalBuildingWidth,
    totalBuildingDepth,
    pillarColor,
    buildingType,
    intactFloors,
  ]);

  const renderedChunks = useMemo(() => {
    return chunks.map((chunk) => {
      const floorIndex = Math.floor(chunk.id / chunksPerFloor);
      const isTopFloor = floorIndex === floors - 1;
      const isGroundFloor = floorIndex === 0;
      return (
        <BuildingChunk
          key={chunk.id}
          chunk={chunk}
          color={color}
          accentColor={accentColor}
          isTopFloor={isTopFloor}
          isGroundFloor={isGroundFloor}
          buildingType={buildingType}
          floorIndex={floorIndex}
        />
      );
    });
  }, [chunks, color, accentColor, floors, chunksPerFloor, buildingType]);

  return (
    <group>
      {renderedChunks}
      {floorBands}
      {cornerPillars}
      {cornice}
    </group>
  );
}
