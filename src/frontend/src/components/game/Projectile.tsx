import { useGameStore } from "@/store/useGameStore";
import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";

interface ProjectileProps {
  id: string;
  position: [number, number, number];
  direction: [number, number, number];
  speed: number;
  shotSize?: number;
}

// Base explosion radius for size=1; scales up with shotSize
function getExplosionRadius(shotSize: number): number {
  // Size 1: radius 4, Size 10: radius 80
  return 4 + (shotSize - 1) * (76 / 9);
}

const MAX_DISTANCE = 200;

export function Projectile({
  id,
  position,
  direction,
  speed,
  shotSize = 1,
}: ProjectileProps) {
  const groupRef = useRef<THREE.Group>(null);
  const posRef = useRef(new THREE.Vector3(...position));
  const dirRef = useRef(new THREE.Vector3(...direction).normalize());
  const trailPositions = useRef<THREE.Vector3[]>([]);
  const trailMeshesRef = useRef<THREE.Mesh[]>([]);
  const startPosRef = useRef(new THREE.Vector3(...position));
  const isDestroyedRef = useRef(false);

  const {
    removeProjectile,
    applyExplosionDamage,
    triggerExplosion,
    triggerScreenShake,
    buildings,
  } = useGameStore();

  useEffect(() => {
    if (!groupRef.current) return;
    // Create trail spheres
    const trailCount = 8;
    for (let i = 0; i < trailCount; i++) {
      const geo = new THREE.SphereGeometry(
        0.08 + (1 - i / trailCount) * 0.12,
        4,
        4,
      );
      const mat = new THREE.MeshBasicMaterial({
        color: i < 3 ? "#FFD700" : "#FF6600",
        transparent: true,
        opacity: (1 - i / trailCount) * 0.8,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = false;
      groupRef.current.add(mesh);
      trailMeshesRef.current.push(mesh);
    }

    return () => {
      for (const m of trailMeshesRef.current) {
        m.geometry.dispose();
        (m.material as THREE.Material).dispose();
      }
      trailMeshesRef.current = [];
    };
  }, []);

  useFrame((_, delta) => {
    if (!groupRef.current || isDestroyedRef.current) return;

    // Move rocket
    const moveVec = dirRef.current.clone().multiplyScalar(speed * delta);
    posRef.current.add(moveVec);

    groupRef.current.position.copy(posRef.current);

    // Orient rocket along direction
    const target = posRef.current.clone().add(dirRef.current);
    groupRef.current.lookAt(target);

    // Update trail
    trailPositions.current.push(posRef.current.clone());
    if (trailPositions.current.length > trailMeshesRef.current.length) {
      trailPositions.current.shift();
    }

    trailMeshesRef.current.forEach((mesh, i) => {
      const trailIdx = trailPositions.current.length - 1 - i;
      if (trailIdx >= 0) {
        mesh.visible = true;
        mesh.position.copy(
          trailPositions.current[trailIdx].clone().sub(posRef.current),
        );
      } else {
        mesh.visible = false;
      }
    });

    // Check max distance
    if (posRef.current.distanceTo(startPosRef.current) > MAX_DISTANCE) {
      isDestroyedRef.current = true;
      removeProjectile(id);
      return;
    }

    const explRadius = getExplosionRadius(shotSize);

    // Ground collision
    if (posRef.current.y <= 0.5) {
      isDestroyedRef.current = true;
      const explPos: [number, number, number] = [
        posRef.current.x,
        0.5,
        posRef.current.z,
      ];
      triggerExplosion(explPos, explRadius, shotSize);
      applyExplosionDamage(explPos, explRadius);
      triggerScreenShake();
      removeProjectile(id);
      return;
    }

    // Building chunk collision
    const rocketPos = posRef.current;
    for (const building of buildings) {
      for (const chunk of building.chunks) {
        if (!chunk.intact) continue;
        const chunkPos = new THREE.Vector3(...chunk.position);
        const dist = rocketPos.distanceTo(chunkPos);
        // Approximate bounding sphere: half diagonal of chunk
        const halfDiag = Math.sqrt(
          (chunk.size[0] / 2) ** 2 +
            (chunk.size[1] / 2) ** 2 +
            (chunk.size[2] / 2) ** 2,
        );
        if (dist < halfDiag + 0.8) {
          isDestroyedRef.current = true;
          const explPos: [number, number, number] = [
            rocketPos.x,
            rocketPos.y,
            rocketPos.z,
          ];
          triggerExplosion(explPos, explRadius, shotSize);
          applyExplosionDamage(explPos, explRadius);
          triggerScreenShake();
          removeProjectile(id);
          return;
        }
      }
    }
  });

  // Rocket body oriented along Z axis
  return (
    <group ref={groupRef} position={position}>
      {/* Rocket body */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.15, 0.15, 1.2, 8]} />
        <meshToonMaterial color="#E87A1D" />
      </mesh>
      {/* Rocket nose */}
      <mesh position={[0, 0, 0.7]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.15, 0.4, 8]} />
        <meshToonMaterial color="#FFD700" />
      </mesh>
      {/* Rocket fins */}
      {[0, 1, 2, 3].map((i) => (
        <mesh
          key={i}
          position={[
            Math.cos((i / 4) * Math.PI * 2) * 0.2,
            Math.sin((i / 4) * Math.PI * 2) * 0.2,
            -0.4,
          ]}
          rotation={[0, 0, (i / 4) * Math.PI * 2]}
        >
          <boxGeometry args={[0.08, 0.3, 0.25]} />
          <meshToonMaterial color="#C45C1A" />
        </mesh>
      ))}
      {/* Engine glow */}
      <mesh position={[0, 0, -0.7]}>
        <sphereGeometry args={[0.18, 6, 6]} />
        <meshBasicMaterial color="#FF4400" />
      </mesh>
      {/* Outline */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.18, 0.18, 1.3, 8]} />
        <meshBasicMaterial color="#000" side={THREE.BackSide} />
      </mesh>
    </group>
  );
}
