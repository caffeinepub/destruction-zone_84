import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";

interface DustCloudProps {
  position: [number, number, number];
  onComplete: () => void;
}

interface DustPuff {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
}

const DURATION = 2.5;

export function DustCloud({ position, onComplete }: DustCloudProps) {
  const groupRef = useRef<THREE.Group>(null);
  const puffsRef = useRef<DustPuff[]>([]);
  const startTimeRef = useRef<number>(Date.now());
  const completedRef = useRef(false);

  useEffect(() => {
    if (!groupRef.current) return;

    const count = 8 + Math.floor(Math.random() * 5);

    for (let i = 0; i < count; i++) {
      const radius = 1.0 + Math.random() * 2.5;
      const geo = new THREE.SphereGeometry(radius, 6, 6);
      const grey = 0.58 + Math.random() * 0.28;
      const warmth = Math.random() * 0.06;
      const mat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(grey + warmth, grey + warmth * 0.5, grey),
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(geo, mat);

      // Spread around position
      mesh.position.set(
        position[0] + (Math.random() - 0.5) * 4,
        position[1] + (Math.random() - 0.5) * 2,
        position[2] + (Math.random() - 0.5) * 4,
      );

      const theta = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 3.5;
      mesh.userData.velocity = new THREE.Vector3(
        Math.cos(theta) * speed,
        0.4 + Math.random() * 1.8, // mostly rising
        Math.sin(theta) * speed,
      );

      groupRef.current.add(mesh);
      puffsRef.current.push({
        mesh,
        velocity: mesh.userData.velocity as THREE.Vector3,
        life: Math.random() * -0.15, // stagger start
        maxLife: DURATION * (0.7 + Math.random() * 0.3),
      });
    }

    return () => {
      for (const p of puffsRef.current) {
        p.mesh.geometry.dispose();
        (p.mesh.material as THREE.Material).dispose();
      }
      puffsRef.current = [];
    };
  }, [position]);

  useFrame((_, delta) => {
    if (completedRef.current) return;

    const elapsed = (Date.now() - startTimeRef.current) / 1000;

    for (const p of puffsRef.current) {
      p.life += delta;
      if (p.life < 0) continue;

      const pT = p.life / p.maxLife;
      if (pT > 1) {
        p.mesh.visible = false;
        continue;
      }

      // Slow drift upward
      p.velocity.x *= 0.99;
      p.velocity.z *= 0.99;
      p.mesh.position.x += p.velocity.x * delta;
      p.mesh.position.y += p.velocity.y * delta;
      p.mesh.position.z += p.velocity.z * delta;

      // Expand as it rises
      p.mesh.scale.setScalar(1 + pT * 2.2);

      // Fade in then out
      const mat = p.mesh.material as THREE.MeshBasicMaterial;
      if (pT < 0.18) {
        mat.opacity = (pT / 0.18) * 0.42;
      } else {
        mat.opacity = Math.max(0, 0.42 * (1 - (pT - 0.18) / 0.82));
      }
    }

    if (elapsed >= DURATION && !completedRef.current) {
      completedRef.current = true;
      onComplete();
    }
  });

  return <group ref={groupRef} />;
}
