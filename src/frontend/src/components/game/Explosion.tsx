import { useGameStore } from "@/store/useGameStore";
import { playExplosion } from "@/utils/soundManager";
import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";

interface ExplosionProps {
  position: [number, number, number];
  size?: number; // 1-10
  onComplete: () => void;
  onScreenShake?: (intensity: number) => void;
  onSkyFlash?: (intensity: number) => void;
}

interface Particle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  type:
    | "fireball"
    | "fire"
    | "smoke"
    | "dust"
    | "debris"
    | "spark"
    | "ember"
    | "shrapnel"
    | "stemRing"
    | "capPuff"
    | "capRoll"
    | "condensation";
  rotSpeed: THREE.Vector3;
  startScale: number;
  baseRadius?: number;
  angleOffset?: number;
  riseSpeed?: number;
}

// Base duration scales with size
function getDuration(size: number): number {
  return 4.0 + (size - 1) * 1.1; // size1=4s, size10=14s
}

// Size multiplier: 0.12 at size=1, 1.0 at size=10
function getSizeMultiplier(size: number): number {
  return 0.12 + (size - 1) * (0.88 / 9);
}

// Mushroom parameters -- base values, scaled at size 10
const STEM_BASE_RADIUS = 10;
const STEM_TOP_RADIUS = 18;
const STEM_HEIGHT = 110;
const CAP_RADIUS = 55;
const CAP_HEIGHT_OFFSET = STEM_HEIGHT * 0.88;

// Size tiers for descriptions
export const SHOT_SIZE_NAMES: Record<number, string> = {
  1: "MICRO",
  2: "KLEIN",
  3: "KLEIN+",
  4: "MITTEL",
  5: "MITTEL+",
  6: "GROSS",
  7: "GROSS+",
  8: "MASSIV",
  9: "ATOM",
  10: "NUKE",
};

export function Explosion({
  position,
  size = 1,
  onComplete,
  onScreenShake,
  onSkyFlash,
}: ExplosionProps) {
  const sm = getSizeMultiplier(size);
  const groupRef = useRef<THREE.Group>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const fireball1Ref = useRef<THREE.Mesh>(null);
  const fireball2Ref = useRef<THREE.Mesh>(null);
  const fireball3Ref = useRef<THREE.Mesh>(null);

  // Shockwaves
  const shockwave1Ref = useRef<THREE.Mesh>(null);
  const shockwave2Ref = useRef<THREE.Mesh>(null);
  const shockwaveSphereRef = useRef<THREE.Mesh>(null);
  const groundFlashRef = useRef<THREE.Mesh>(null);

  // Mushroom stem: 3 cylinder layers
  const stemInnerRef = useRef<THREE.Mesh>(null);
  const stemOuterRef = useRef<THREE.Mesh>(null);
  const stemFireRef = useRef<THREE.Mesh>(null);

  // Mushroom cap: torus + dome + inner glow
  const capTorusRef = useRef<THREE.Mesh>(null);
  const capDomeRef = useRef<THREE.Mesh>(null);
  const capDomeBottomRef = useRef<THREE.Mesh>(null);
  const capInnerFireRef = useRef<THREE.Mesh>(null);
  const capCondensationRef = useRef<THREE.Mesh>(null);

  // Condensation ring (Mach stem / Wilson cloud ring)
  const condensationRingRef = useRef<THREE.Mesh>(null);

  const pointLight1Ref = useRef<THREE.PointLight>(null);
  const pointLight2Ref = useRef<THREE.PointLight>(null);
  const pointLight3Ref = useRef<THREE.PointLight>(null);
  const pointLight4Ref = useRef<THREE.PointLight>(null);

  const startTimeRef = useRef<number>(Date.now());
  const particlesRef = useRef<Particle[]>([]);
  const completedRef = useRef(false);
  const positionRef = useRef(position);
  const sizeRef = useRef(size);
  const shakeTriggeredRef = useRef(false);
  const skyFlashTriggeredRef = useRef(false);
  const shockwaveDamageTriggeredRef = useRef(false);

  useEffect(() => {
    const pos3 = positionRef.current;
    const sizeVal = sizeRef.current;
    const smVal = getSizeMultiplier(sizeVal);
    const showMushroomVal = sizeVal >= 7;

    playExplosion(smVal);

    if (!groupRef.current) return;

    const pos = new THREE.Vector3(...pos3);

    const addParticle = (
      mesh: THREE.Mesh,
      vel: THREE.Vector3,
      maxLife: number,
      type: Particle["type"],
      rotSpeed?: THREE.Vector3,
      startScale?: number,
      extra?: Partial<Particle>,
    ) => {
      groupRef.current!.add(mesh);
      particlesRef.current.push({
        mesh,
        velocity: vel,
        life: 0,
        maxLife,
        type,
        rotSpeed: rotSpeed ?? new THREE.Vector3(),
        startScale: startScale ?? 1,
        ...extra,
      });
    };

    // Scale particle counts and sizes with smVal
    const coreCount = Math.max(2, Math.round(20 * smVal));
    const fireCount = Math.max(4, Math.round(90 * smVal));
    const dustCount = Math.max(4, Math.round(65 * smVal));
    const debrisCount = Math.max(3, Math.round(45 * smVal));
    const sparkCount = Math.max(5, Math.round(100 * smVal));
    const emberCount = Math.max(3, Math.round(60 * smVal));
    const shrapnelCount = Math.max(2, Math.round(22 * smVal));

    // ---- 1. INNER PLASMA CORE ----
    for (let i = 0; i < coreCount; i++) {
      const r = (1.2 + Math.random() * 3.0) * smVal;
      const geo = new THREE.SphereGeometry(r, 8, 8);
      const mat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(1, 0.99, 0.7),
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(pos);
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const spd = (20 + Math.random() * 40) * smVal;
      addParticle(
        mesh,
        new THREE.Vector3(
          Math.sin(phi) * Math.cos(theta) * spd,
          Math.abs(Math.cos(phi)) * spd + 18 * smVal,
          Math.sin(phi) * Math.sin(theta) * spd,
        ),
        0.45 + Math.random() * 0.25,
        "fireball",
      );
    }

    // ---- 2. MAIN FIRE BALLS ----
    for (let i = 0; i < fireCount; i++) {
      const r = (1.5 + Math.random() * 5.0) * smVal;
      const geo = new THREE.SphereGeometry(r, 7, 7);
      const t = Math.random();
      const col = new THREE.Color().lerpColors(
        new THREE.Color(1, 0.05, 0),
        new THREE.Color(1, 0.85, 0.1),
        t,
      );
      const mat = new THREE.MeshBasicMaterial({
        color: col,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(pos);
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const spd = (25 + Math.random() * 55) * smVal;
      const upBias = Math.random() > 0.5 ? 2.0 : 1.0;
      addParticle(
        mesh,
        new THREE.Vector3(
          Math.sin(phi) * Math.cos(theta) * spd,
          Math.abs(Math.cos(phi)) * spd * upBias + 20 * smVal,
          Math.sin(phi) * Math.sin(theta) * spd,
        ),
        0.8 + Math.random() * 1.2,
        "fire",
      );
    }

    // ---- 3. DUST GROUND SPLASH ----
    for (let i = 0; i < dustCount; i++) {
      const r = (2.0 + Math.random() * 5.5) * smVal;
      const geo = new THREE.SphereGeometry(r, 7, 7);
      const g = 0.35 + Math.random() * 0.3;
      const mat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(g, g * 0.85, g * 0.7),
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(geo, mat);
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * 18 * smVal;
      mesh.position.set(
        pos.x + Math.cos(angle) * dist,
        pos.y + 0.2,
        pos.z + Math.sin(angle) * dist,
      );
      const spd = (12 + Math.random() * 30) * smVal;
      addParticle(
        mesh,
        new THREE.Vector3(
          Math.cos(angle) * spd,
          (3 + Math.random() * 15) * smVal,
          Math.sin(angle) * spd,
        ),
        3.0 + Math.random() * 3.0,
        "dust",
      );
    }

    // ---- 4-6: MUSHROOM PARTICLES (only size >= 7) ----
    if (showMushroomVal) {
      const stemCount = Math.round(80 * smVal);
      const capPuffCount = Math.round(90 * smVal);
      const capRollCount = Math.round(50 * smVal);
      const condCount = 30;

      // ---- 4. MUSHROOM STEM RINGS ----
      for (let i = 0; i < stemCount; i++) {
        const r = (1.2 + Math.random() * 2.8) * smVal;
        const geo = new THREE.SphereGeometry(r, 7, 7);
        const frac = i / stemCount;
        const gVal = 0.06 + frac * 0.04 + Math.random() * 0.04;
        const isHot = frac < 0.25;
        const mat = new THREE.MeshBasicMaterial({
          color: isHot
            ? new THREE.Color(gVal * 4, gVal * 1.5, gVal * 0.3)
            : new THREE.Color(gVal * 1.5, gVal * 0.75, gVal * 0.4),
          transparent: true,
          opacity: 0,
          depthWrite: false,
        });
        const mesh = new THREE.Mesh(geo, mat);
        const angle = Math.random() * Math.PI * 2;
        const radialFraction =
          STEM_BASE_RADIUS + frac * (STEM_TOP_RADIUS - STEM_BASE_RADIUS);
        const radial = (Math.random() * 0.6 + 0.7) * radialFraction;
        const startDelay = -(frac * 0.9);
        mesh.position.set(
          pos.x + Math.cos(angle) * radial * 0.15,
          pos.y + 1 + frac * STEM_HEIGHT * smVal * 0.2,
          pos.z + Math.sin(angle) * radial * 0.15,
        );
        const riseSpd = (16 + frac * 12 + Math.random() * 8) * smVal;
        const particle: Particle = {
          mesh,
          velocity: new THREE.Vector3(
            Math.cos(angle) * (1 + Math.random() * 2),
            riseSpd,
            Math.sin(angle) * (1 + Math.random() * 2),
          ),
          life: startDelay,
          maxLife: 8.0 + Math.random() * 2.0,
          type: "stemRing",
          rotSpeed: new THREE.Vector3(0, (Math.random() - 0.5) * 0.4, 0),
          startScale: 1,
          baseRadius: radial,
          angleOffset: angle,
          riseSpeed: riseSpd,
        };
        groupRef.current!.add(mesh);
        particlesRef.current.push(particle);
      }

      // ---- 5. MUSHROOM CAP PUFFS ----
      const capCenterY = pos.y + CAP_HEIGHT_OFFSET * smVal;
      for (let i = 0; i < capPuffCount; i++) {
        const r = (4.0 + Math.random() * 9.0) * smVal;
        const geo = new THREE.SphereGeometry(r, 9, 9);
        const isInner = Math.random() > 0.5;
        const gVal = isInner
          ? 0.18 + Math.random() * 0.18
          : 0.05 + Math.random() * 0.07;
        const mat = new THREE.MeshBasicMaterial({
          color: isInner
            ? new THREE.Color(gVal * 3.5, gVal * 0.9, gVal * 0.15)
            : new THREE.Color(gVal * 1.4, gVal * 0.65, gVal * 0.35),
          transparent: true,
          opacity: 0,
          depthWrite: false,
        });
        const mesh = new THREE.Mesh(geo, mat);
        const angle = Math.random() * Math.PI * 2;
        const radialDist = CAP_RADIUS * (0.5 + Math.random() * 0.6);
        const startDelay = -(0.5 + Math.random() * 0.5);
        mesh.position.set(
          pos.x + Math.cos(angle) * radialDist * 0.08,
          capCenterY + (Math.random() - 0.5) * 8,
          pos.z + Math.sin(angle) * radialDist * 0.08,
        );
        const particle: Particle = {
          mesh,
          velocity: new THREE.Vector3(
            Math.cos(angle) * (14 + Math.random() * 22) * smVal,
            (1.5 + Math.random() * 5) * smVal,
            Math.sin(angle) * (14 + Math.random() * 22) * smVal,
          ),
          life: startDelay,
          maxLife: 9.0 + Math.random() * 2.0,
          type: "capPuff",
          rotSpeed: new THREE.Vector3(0, (Math.random() - 0.5) * 0.6, 0),
          startScale: 1,
          angleOffset: angle,
        };
        groupRef.current!.add(mesh);
        particlesRef.current.push(particle);
      }

      // ---- 6. CAP ROLL ----
      for (let i = 0; i < capRollCount; i++) {
        const r = (3.0 + Math.random() * 6.0) * smVal;
        const geo = new THREE.SphereGeometry(r, 8, 8);
        const gVal = 0.04 + Math.random() * 0.05;
        const mat = new THREE.MeshBasicMaterial({
          color: new THREE.Color(gVal * 1.2, gVal * 0.55, gVal * 0.28),
          transparent: true,
          opacity: 0,
          depthWrite: false,
        });
        const mesh = new THREE.Mesh(geo, mat);
        const angle = Math.random() * Math.PI * 2;
        const radialDist = CAP_RADIUS * (0.8 + Math.random() * 0.4);
        const heightOffset = (Math.random() - 0.5) * 20;
        const startDelay = -(0.8 + Math.random() * 0.6);
        mesh.position.set(
          pos.x + Math.cos(angle) * radialDist * 0.06,
          capCenterY + heightOffset,
          pos.z + Math.sin(angle) * radialDist * 0.06,
        );
        const particle: Particle = {
          mesh,
          velocity: new THREE.Vector3(
            Math.cos(angle) * (20 + Math.random() * 28) * smVal,
            (Math.random() - 0.3) * 6,
            Math.sin(angle) * (20 + Math.random() * 28) * smVal,
          ),
          life: startDelay,
          maxLife: 10.0 + Math.random() * 2.0,
          type: "capRoll",
          rotSpeed: new THREE.Vector3(0, (Math.random() - 0.5) * 0.5, 0),
          startScale: 1,
          angleOffset: angle,
        };
        groupRef.current!.add(mesh);
        particlesRef.current.push(particle);
      }

      // ---- 7. CONDENSATION RING PARTICLES (Wilson cloud ring) ----
      for (let i = 0; i < condCount; i++) {
        const r = (1.8 + Math.random() * 3.5) * smVal;
        const geo = new THREE.SphereGeometry(r, 6, 6);
        const mat = new THREE.MeshBasicMaterial({
          color: new THREE.Color(0.85, 0.88, 0.92),
          transparent: true,
          opacity: 0,
          depthWrite: false,
        });
        const mesh = new THREE.Mesh(geo, mat);
        const angle = (i / condCount) * Math.PI * 2 + Math.random() * 0.2;
        const startRadius = 5 * smVal;
        mesh.position.set(
          pos.x + Math.cos(angle) * startRadius,
          pos.y + 2.5 + Math.random() * 3,
          pos.z + Math.sin(angle) * startRadius,
        );
        const startDelay = -(0.15 + Math.random() * 0.1);
        const particle: Particle = {
          mesh,
          velocity: new THREE.Vector3(
            Math.cos(angle) * 55 * smVal,
            0.5 + Math.random() * 1.5,
            Math.sin(angle) * 55 * smVal,
          ),
          life: startDelay,
          maxLife: 2.0 + Math.random() * 0.8,
          type: "condensation",
          rotSpeed: new THREE.Vector3(),
          startScale: 1,
          angleOffset: angle,
        };
        groupRef.current!.add(mesh);
        particlesRef.current.push(particle);
      }
    }

    // ---- 8. DEBRIS CHUNKS ----
    for (let i = 0; i < debrisCount; i++) {
      const s = (0.25 + Math.random() * 1.1) * smVal;
      const geo =
        Math.random() > 0.5
          ? new THREE.BoxGeometry(
              s,
              s * (0.5 + Math.random()),
              s * (0.5 + Math.random()),
            )
          : new THREE.DodecahedronGeometry(s * 0.7, 0);
      const g = 0.2 + Math.random() * 0.3;
      const mat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(g, g * 0.85, g * 0.7),
        transparent: true,
        opacity: 1,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(pos);
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const spd = (35 + Math.random() * 75) * smVal;
      const rotSpd = new THREE.Vector3(
        (Math.random() - 0.5) * 16,
        (Math.random() - 0.5) * 16,
        (Math.random() - 0.5) * 16,
      );
      addParticle(
        mesh,
        new THREE.Vector3(
          Math.sin(phi) * Math.cos(theta) * spd,
          Math.abs(Math.cos(phi)) * spd + 20 * smVal,
          Math.sin(phi) * Math.sin(theta) * spd,
        ),
        4.0 + Math.random() * 2.5,
        "debris",
        rotSpd,
      );
    }

    // ---- 9. SPARKS ----
    for (let i = 0; i < sparkCount; i++) {
      const geo = new THREE.CylinderGeometry(
        0.04 * smVal,
        0.008 * smVal,
        (0.6 + Math.random() * 1.0) * smVal,
        4,
      );
      const mat = new THREE.MeshBasicMaterial({
        color:
          Math.random() > 0.5
            ? new THREE.Color(1, 0.95, 0.2)
            : new THREE.Color(1, 0.4, 0),
        transparent: true,
        opacity: 1,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(pos);
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const spd = (40 + Math.random() * 80) * smVal;
      const rotSpd = new THREE.Vector3(
        (Math.random() - 0.5) * 25,
        (Math.random() - 0.5) * 25,
        (Math.random() - 0.5) * 25,
      );
      addParticle(
        mesh,
        new THREE.Vector3(
          Math.sin(phi) * Math.cos(theta) * spd,
          Math.abs(Math.cos(phi)) * spd * 0.9 + 10 * smVal,
          Math.sin(phi) * Math.sin(theta) * spd,
        ),
        0.7 + Math.random() * 0.9,
        "spark",
        rotSpd,
      );
    }

    // ---- 10. EMBERS ----
    for (let i = 0; i < emberCount; i++) {
      const geo = new THREE.SphereGeometry(
        (0.1 + Math.random() * 0.18) * smVal,
        4,
        4,
      );
      const mat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(1, 0.3 + Math.random() * 0.4, 0),
        transparent: true,
        opacity: 1,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(pos);
      const theta = Math.random() * Math.PI * 2;
      const spd = (14 + Math.random() * 35) * smVal;
      addParticle(
        mesh,
        new THREE.Vector3(
          Math.cos(theta) * spd,
          (4 + Math.random() * 25) * smVal,
          Math.sin(theta) * spd,
        ),
        3.0 + Math.random() * 3.0,
        "ember",
      );
    }

    // ---- 11. SHRAPNEL ----
    for (let i = 0; i < shrapnelCount; i++) {
      const geo = new THREE.TetrahedronGeometry(
        (0.6 + Math.random() * 1.1) * smVal,
        0,
      );
      const mat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(0.1, 0.08, 0.06),
        transparent: true,
        opacity: 1,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(pos);
      const theta = Math.random() * Math.PI * 2;
      const elev = 0.3 + Math.random() * 0.6;
      const spd = (45 + Math.random() * 65) * smVal;
      const rotSpd = new THREE.Vector3(
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 20,
      );
      addParticle(
        mesh,
        new THREE.Vector3(
          Math.cos(theta) * spd,
          Math.sin(elev) * spd + 10 * smVal,
          Math.sin(theta) * spd,
        ),
        5.0 + Math.random() * 2.5,
        "shrapnel",
        rotSpd,
      );
    }

    return () => {
      for (const p of particlesRef.current) {
        p.mesh.geometry.dispose();
        (p.mesh.material as THREE.Material).dispose();
      }
      particlesRef.current = [];
    };
  }, []);

  useFrame((_, delta) => {
    if (completedRef.current) return;

    const currentSize = sizeRef.current;
    const currentSm = getSizeMultiplier(currentSize);
    const currentDuration = getDuration(currentSize);
    const currentShowMushroom = currentSize >= 7;

    const elapsed = (Date.now() - startTimeRef.current) / 1000;
    const t = Math.min(elapsed / currentDuration, 1);

    // ---- Screen shake ----
    if (!shakeTriggeredRef.current && elapsed > 0.04) {
      shakeTriggeredRef.current = true;
      if (onScreenShake) onScreenShake(currentSm);
    }

    // ---- Sky flash ----
    if (!skyFlashTriggeredRef.current && elapsed > 0.02) {
      skyFlashTriggeredRef.current = true;
      if (onSkyFlash) onSkyFlash(currentSm);
    }

    // ---- Shockwave damage trigger (at ~0.3s into explosion) ----
    if (!shockwaveDamageTriggeredRef.current && elapsed > 0.3) {
      shockwaveDamageTriggeredRef.current = true;
      const pos = positionRef.current;
      const shockRadius = 80 * currentSm;
      const shockDuration = 2500 * currentSm;
      useGameStore
        .getState()
        .triggerShockwaveDamage(pos, shockRadius, shockDuration);
    }

    const SW = currentSm; // shorthand scale

    // ---- White-hot CORE ----
    if (coreRef.current) {
      if (t < 0.025) {
        const s = (t / 0.025) * 70 * SW;
        coreRef.current.scale.setScalar(s);
        (coreRef.current.material as THREE.MeshBasicMaterial).opacity = 1.0;
      } else if (t < 0.1) {
        const fade = 1 - (t - 0.025) / 0.075;
        coreRef.current.scale.setScalar(70 * SW * (0.6 + fade * 0.4));
        (coreRef.current.material as THREE.MeshBasicMaterial).opacity = fade;
      } else {
        coreRef.current.visible = false;
      }
    }

    // ---- Main FIREBALL 1 ----
    if (fireball1Ref.current) {
      if (t < 0.045) {
        fireball1Ref.current.scale.setScalar((t / 0.045) * 65 * SW);
        (fireball1Ref.current.material as THREE.MeshBasicMaterial).opacity =
          0.95;
      } else if (t < 0.42) {
        const f = 1 - (t - 0.045) / 0.375;
        fireball1Ref.current.scale.setScalar(65 * SW + (1 - f) * 12);
        (fireball1Ref.current.material as THREE.MeshBasicMaterial).opacity =
          f * 0.95;
      } else {
        fireball1Ref.current.visible = false;
      }
    }

    // ---- FIREBALL 2 ----
    if (fireball2Ref.current) {
      if (t < 0.07) {
        fireball2Ref.current.scale.setScalar((t / 0.07) * 50 * SW);
        (fireball2Ref.current.material as THREE.MeshBasicMaterial).opacity =
          0.8;
      } else if (t < 0.55) {
        const f = 1 - (t - 0.07) / 0.48;
        fireball2Ref.current.scale.setScalar(50 * SW + (1 - f) * 10);
        (fireball2Ref.current.material as THREE.MeshBasicMaterial).opacity =
          f * 0.8;
      } else {
        fireball2Ref.current.visible = false;
      }
    }

    // ---- FIREBALL 3 (large diffuse) ----
    if (fireball3Ref.current) {
      if (t < 0.12) {
        fireball3Ref.current.scale.setScalar((t / 0.12) * 38 * SW);
        (fireball3Ref.current.material as THREE.MeshBasicMaterial).opacity =
          0.6;
      } else if (t < 0.7) {
        const f = 1 - (t - 0.12) / 0.58;
        fireball3Ref.current.scale.setScalar(38 * SW + (1 - f) * 8);
        (fireball3Ref.current.material as THREE.MeshBasicMaterial).opacity =
          f * 0.6;
      } else {
        fireball3Ref.current.visible = false;
      }
    }

    // ---- SHOCKWAVE 1 (tight fast ground ring) ----
    if (shockwave1Ref.current) {
      if (elapsed < 0.55) {
        const st = elapsed / 0.55;
        shockwave1Ref.current.scale.set(st * 85 * SW, 1, st * 85 * SW);
        (shockwave1Ref.current.material as THREE.MeshBasicMaterial).opacity =
          1.0 * (1 - st);
      } else {
        shockwave1Ref.current.visible = false;
      }
    }

    // ---- SHOCKWAVE 2 (wide expanding ring) ----
    if (shockwave2Ref.current) {
      if (elapsed < 2.8) {
        const st = elapsed / 2.8;
        shockwave2Ref.current.scale.set(st * 160 * SW, 1, st * 160 * SW);
        (shockwave2Ref.current.material as THREE.MeshBasicMaterial).opacity =
          0.7 * (1 - st * 0.9);
      } else {
        shockwave2Ref.current.visible = false;
      }
    }

    // ---- SHOCKWAVE 3D SPHERE ----
    if (shockwaveSphereRef.current) {
      if (elapsed < 1.2) {
        const st = elapsed / 1.2;
        shockwaveSphereRef.current.scale.setScalar(st * 120 * SW);
        (
          shockwaveSphereRef.current.material as THREE.MeshBasicMaterial
        ).opacity = 0.28 * (1 - st);
      } else {
        shockwaveSphereRef.current.visible = false;
      }
    }

    // ---- GROUND FLASH ----
    if (groundFlashRef.current) {
      if (elapsed < 0.45) {
        const st = elapsed / 0.45;
        groundFlashRef.current.scale.set(st * 75 * SW, 1, st * 75 * SW);
        (groundFlashRef.current.material as THREE.MeshBasicMaterial).opacity =
          0.9 * (1 - st);
      } else {
        groundFlashRef.current.visible = false;
      }
    }

    // ---- CONDENSATION RING (Wilson cloud, brief) ----
    if (condensationRingRef.current) {
      if (!currentShowMushroom) {
        condensationRingRef.current.visible = false;
      } else if (elapsed > 0.1 && elapsed < 0.7) {
        condensationRingRef.current.visible = true;
        const st = (elapsed - 0.1) / 0.6;
        condensationRingRef.current.scale.set(st * 90 * SW, 1, st * 90 * SW);
        const fade = st < 0.5 ? st * 2 : (1 - st) * 2;
        (
          condensationRingRef.current.material as THREE.MeshBasicMaterial
        ).opacity = fade * 0.55;
      } else {
        condensationRingRef.current.visible = false;
      }
    }

    // ---- MUSHROOM STEM INNER (glowing fire column) ----
    if (stemFireRef.current) {
      if (!currentShowMushroom || elapsed < 0.2) {
        stemFireRef.current.visible = false;
      } else if (elapsed < 1.8) {
        stemFireRef.current.visible = true;
        const st = (elapsed - 0.2) / 1.6;
        stemFireRef.current.scale.set(st * 1.5 * SW, st * SW, st * 1.5 * SW);
        (stemFireRef.current.material as THREE.MeshBasicMaterial).opacity =
          st * 0.85;
      } else if (elapsed < currentDuration) {
        const fade = 1 - (elapsed - 1.8) / (currentDuration - 1.8);
        (stemFireRef.current.material as THREE.MeshBasicMaterial).opacity =
          Math.max(0, fade * 0.7);
      } else {
        stemFireRef.current.visible = false;
      }
    }

    // ---- MUSHROOM STEM OUTER (dark smoke column) ----
    if (stemOuterRef.current) {
      if (!currentShowMushroom || elapsed < 0.35) {
        stemOuterRef.current.visible = false;
      } else if (elapsed < 2.5) {
        stemOuterRef.current.visible = true;
        const st = (elapsed - 0.35) / 2.15;
        stemOuterRef.current.scale.set(
          (1 + st * 2.8) * SW,
          st * SW,
          (1 + st * 2.8) * SW,
        );
        (stemOuterRef.current.material as THREE.MeshBasicMaterial).opacity =
          st * 0.82;
      } else if (elapsed < currentDuration) {
        const fade = 1 - (elapsed - 2.5) / (currentDuration - 2.5);
        (stemOuterRef.current.material as THREE.MeshBasicMaterial).opacity =
          Math.max(0, fade * 0.8);
        stemOuterRef.current.scale.set(
          (3.8 + (1 - fade) * 1.5) * SW,
          SW,
          (3.8 + (1 - fade) * 1.5) * SW,
        );
      } else {
        stemOuterRef.current.visible = false;
      }
    }

    // ---- MUSHROOM STEM INNER (tight bright column) ----
    if (stemInnerRef.current) {
      if (!currentShowMushroom || elapsed < 0.25) {
        stemInnerRef.current.visible = false;
      } else if (elapsed < 2.0) {
        stemInnerRef.current.visible = true;
        const st = (elapsed - 0.25) / 1.75;
        stemInnerRef.current.scale.set(st * 0.85 * SW, st * SW, st * 0.85 * SW);
        (stemInnerRef.current.material as THREE.MeshBasicMaterial).opacity =
          st * 0.9;
      } else if (elapsed < currentDuration * 0.7) {
        const fade = 1 - (elapsed - 2.0) / (currentDuration * 0.7 - 2.0);
        (stemInnerRef.current.material as THREE.MeshBasicMaterial).opacity =
          Math.max(0, fade * 0.9);
      } else {
        stemInnerRef.current.visible = false;
      }
    }

    // ---- MUSHROOM CAP TORUS (main dark ring) ----
    if (capTorusRef.current) {
      if (!currentShowMushroom || elapsed < 0.9) {
        capTorusRef.current.visible = false;
      } else if (elapsed < 2.8) {
        capTorusRef.current.visible = true;
        const st = (elapsed - 0.9) / 1.9;
        capTorusRef.current.scale.set(
          st * 55 * SW,
          1 + st * 18 * SW,
          st * 55 * SW,
        );
        (capTorusRef.current.material as THREE.MeshBasicMaterial).opacity =
          st * 0.85;
      } else if (elapsed < currentDuration) {
        const fade = 1 - (elapsed - 2.8) / (currentDuration - 2.8);
        (capTorusRef.current.material as THREE.MeshBasicMaterial).opacity =
          Math.max(0, fade * 0.8);
        capTorusRef.current.scale.set(55 * SW, 19 * SW, 55 * SW);
      } else {
        capTorusRef.current.visible = false;
      }
    }

    // ---- MUSHROOM CAP DOME (upper dome of cap) ----
    if (capDomeRef.current) {
      if (!currentShowMushroom || elapsed < 1.1) {
        capDomeRef.current.visible = false;
      } else if (elapsed < 3.2) {
        capDomeRef.current.visible = true;
        const st = (elapsed - 1.1) / 2.1;
        capDomeRef.current.scale.set(
          st * 45 * SW,
          1 + st * 12 * SW,
          st * 45 * SW,
        );
        (capDomeRef.current.material as THREE.MeshBasicMaterial).opacity =
          st * 0.7;
      } else if (elapsed < currentDuration) {
        const fade = 1 - (elapsed - 3.2) / (currentDuration - 3.2);
        (capDomeRef.current.material as THREE.MeshBasicMaterial).opacity =
          Math.max(0, fade * 0.65);
      } else {
        capDomeRef.current.visible = false;
      }
    }

    // ---- MUSHROOM CAP DOME BOTTOM (underside skirt) ----
    if (capDomeBottomRef.current) {
      if (!currentShowMushroom || elapsed < 1.3) {
        capDomeBottomRef.current.visible = false;
      } else if (elapsed < 3.0) {
        capDomeBottomRef.current.visible = true;
        const st = (elapsed - 1.3) / 1.7;
        capDomeBottomRef.current.scale.set(
          st * 40 * SW,
          1 + st * 8 * SW,
          st * 40 * SW,
        );
        (capDomeBottomRef.current.material as THREE.MeshBasicMaterial).opacity =
          st * 0.6;
      } else if (elapsed < currentDuration) {
        const fade = 1 - (elapsed - 3.0) / (currentDuration - 3.0);
        (capDomeBottomRef.current.material as THREE.MeshBasicMaterial).opacity =
          Math.max(0, fade * 0.55);
      } else {
        capDomeBottomRef.current.visible = false;
      }
    }

    // ---- CAP INNER FIRE (nuclear orange-red core of cap) ----
    if (capInnerFireRef.current) {
      if (!currentShowMushroom || elapsed < 1.0) {
        capInnerFireRef.current.visible = false;
      } else if (elapsed < 3.5) {
        capInnerFireRef.current.visible = true;
        const st = (elapsed - 1.0) / 2.5;
        capInnerFireRef.current.scale.set(
          st * 36 * SW,
          1 + st * 9 * SW,
          st * 36 * SW,
        );
        (capInnerFireRef.current.material as THREE.MeshBasicMaterial).opacity =
          st * 0.65;
      } else if (elapsed < currentDuration * 0.7) {
        const fade = 1 - (elapsed - 3.5) / (currentDuration * 0.7 - 3.5);
        (capInnerFireRef.current.material as THREE.MeshBasicMaterial).opacity =
          Math.max(0, fade * 0.55);
      } else {
        capInnerFireRef.current.visible = false;
      }
    }

    // ---- CAP CONDENSATION (outer white cloud ring of cap top) ----
    if (capCondensationRef.current) {
      if (!currentShowMushroom || elapsed < 1.5) {
        capCondensationRef.current.visible = false;
      } else if (elapsed < 4.0) {
        capCondensationRef.current.visible = true;
        const st = (elapsed - 1.5) / 2.5;
        capCondensationRef.current.scale.set(
          st * 60 * SW,
          1 + st * 5 * SW,
          st * 60 * SW,
        );
        (
          capCondensationRef.current.material as THREE.MeshBasicMaterial
        ).opacity = st * 0.35;
      } else if (elapsed < currentDuration) {
        const fade = 1 - (elapsed - 4.0) / (currentDuration - 4.0);
        (
          capCondensationRef.current.material as THREE.MeshBasicMaterial
        ).opacity = Math.max(0, fade * 0.3);
      } else {
        capCondensationRef.current.visible = false;
      }
    }

    // ---- Lights ----
    if (pointLight1Ref.current) {
      if (elapsed < 0.07) {
        pointLight1Ref.current.intensity = (elapsed / 0.07) * 450 * SW;
      } else if (elapsed < 3.5) {
        pointLight1Ref.current.intensity = Math.max(
          0,
          450 * SW * (1 - (elapsed - 0.07) / 3.43),
        );
      } else {
        pointLight1Ref.current.intensity = 0;
      }
    }
    if (pointLight2Ref.current) {
      if (elapsed < 5.0) {
        pointLight2Ref.current.intensity = Math.max(
          0,
          90 * SW * (1 - elapsed / 5.0),
        );
      } else {
        pointLight2Ref.current.intensity = 0;
      }
    }
    if (pointLight3Ref.current) {
      if (currentShowMushroom && elapsed > 1.0 && elapsed < 9.0) {
        const st = Math.min(1, (elapsed - 1.0) / 1.0);
        const fade = elapsed > 4.5 ? Math.max(0, 1 - (elapsed - 4.5) / 4.5) : 1;
        pointLight3Ref.current.intensity = st * fade * 80 * SW;
      } else {
        pointLight3Ref.current.intensity = 0;
      }
    }
    if (pointLight4Ref.current) {
      if (currentShowMushroom && elapsed > 0.4 && elapsed < 6.0) {
        const st = Math.min(1, (elapsed - 0.4) / 0.6);
        const fade = elapsed > 3.0 ? Math.max(0, 1 - (elapsed - 3.0) / 3.0) : 1;
        pointLight4Ref.current.intensity = st * fade * 45 * SW;
      } else {
        pointLight4Ref.current.intensity = 0;
      }
    }

    // ---- Particles ----
    for (const p of particlesRef.current) {
      p.life += delta;
      if (p.life < 0) continue;
      if (p.life >= p.maxLife) {
        p.mesh.visible = false;
        continue;
      }
      const pT = p.life / p.maxLife;
      const mat = p.mesh.material as THREE.MeshBasicMaterial;

      switch (p.type) {
        case "fireball": {
          p.velocity.y -= 4 * delta;
          p.mesh.position.x += p.velocity.x * delta;
          p.mesh.position.y += p.velocity.y * delta;
          p.mesh.position.z += p.velocity.z * delta;
          mat.opacity = pT < 0.1 ? pT / 0.1 : Math.max(0, 1 - (pT - 0.1) / 0.9);
          p.mesh.scale.setScalar(1 + pT * 6);
          break;
        }
        case "fire": {
          p.velocity.y -= 6 * delta;
          p.velocity.x *= 0.992;
          p.velocity.z *= 0.992;
          p.mesh.position.x += p.velocity.x * delta;
          p.mesh.position.y += p.velocity.y * delta;
          p.mesh.position.z += p.velocity.z * delta;
          mat.opacity =
            pT < 0.07 ? pT / 0.07 : Math.max(0, 1 - (pT - 0.07) / 0.93);
          const g = Math.max(0, 0.75 - pT * 0.9);
          mat.color.setRGB(1, g, 0);
          p.mesh.scale.setScalar(Math.max(0.1, 1 + pT * 3));
          break;
        }
        case "dust": {
          p.velocity.x *= 0.989;
          p.velocity.z *= 0.989;
          p.velocity.y *= 0.993;
          p.mesh.position.x += p.velocity.x * delta;
          p.mesh.position.y += p.velocity.y * delta;
          p.mesh.position.z += p.velocity.z * delta;
          mat.opacity =
            pT < 0.1
              ? (pT / 0.1) * 0.72
              : Math.max(0, 0.72 * (1 - (pT - 0.1) / 0.9));
          p.mesh.scale.setScalar(1 + pT * 6.5);
          break;
        }
        case "stemRing": {
          // Rise upward, slowly expand outward
          p.velocity.y *= 0.998;
          p.velocity.x *= 0.994;
          p.velocity.z *= 0.994;
          p.mesh.position.x += p.velocity.x * delta;
          p.mesh.position.y += p.velocity.y * delta;
          p.mesh.position.z += p.velocity.z * delta;
          p.mesh.rotation.y += p.rotSpeed.y * delta;
          mat.opacity =
            pT < 0.08
              ? (pT / 0.08) * 0.78
              : Math.max(0, 0.78 * (1 - (pT - 0.08) / 0.92));
          // Fade from orange to dark brown as it rises
          const stemT =
            p.mesh.position.y / (positionRef.current[1] + STEM_HEIGHT);
          const hot = Math.max(0, 0.18 - stemT * 0.16);
          mat.color.setRGB(
            hot * 2.5 + 0.08,
            hot * 0.9 + 0.04,
            hot * 0.3 + 0.02,
          );
          p.mesh.scale.setScalar(1 + pT * 5.5);
          break;
        }
        case "capPuff": {
          p.velocity.x *= 0.992;
          p.velocity.z *= 0.992;
          p.velocity.y *= 0.997;
          p.mesh.position.x += p.velocity.x * delta;
          p.mesh.position.y += p.velocity.y * delta;
          p.mesh.position.z += p.velocity.z * delta;
          p.mesh.rotation.y += p.rotSpeed.y * delta;
          mat.opacity =
            pT < 0.12
              ? (pT / 0.12) * 0.72
              : Math.max(0, 0.72 * (1 - (pT - 0.12) / 0.88));
          const capT = Math.max(0, 0.22 - pT * 0.18);
          // Inner puffs: orange-red; outer puffs: dark brown
          const isInnerCap = p.velocity.length() > 20;
          if (isInnerCap) {
            mat.color.setRGB(capT * 3.5, capT * 0.9, capT * 0.15);
          } else {
            mat.color.setRGB(capT * 1.3, capT * 0.6, capT * 0.3);
          }
          p.mesh.scale.setScalar(1 + pT * 8);
          break;
        }
        case "capRoll": {
          p.velocity.x *= 0.99;
          p.velocity.z *= 0.99;
          p.velocity.y *= 0.998;
          p.mesh.position.x += p.velocity.x * delta;
          p.mesh.position.y += p.velocity.y * delta;
          p.mesh.position.z += p.velocity.z * delta;
          p.mesh.rotation.y += p.rotSpeed.y * delta;
          mat.opacity =
            pT < 0.1
              ? (pT / 0.1) * 0.65
              : Math.max(0, 0.65 * (1 - (pT - 0.1) / 0.9));
          const cr = Math.max(0.03, 0.08 - pT * 0.06);
          mat.color.setRGB(cr * 1.2, cr * 0.5, cr * 0.25);
          p.mesh.scale.setScalar(1 + pT * 9);
          break;
        }
        case "condensation": {
          // Brief white cloud ring
          p.velocity.x *= 0.97;
          p.velocity.z *= 0.97;
          p.mesh.position.x += p.velocity.x * delta;
          p.mesh.position.y += p.velocity.y * delta;
          p.mesh.position.z += p.velocity.z * delta;
          mat.opacity =
            pT < 0.2
              ? (pT / 0.2) * 0.65
              : Math.max(0, 0.65 * (1 - (pT - 0.2) / 0.8));
          p.mesh.scale.setScalar(1 + pT * 3);
          break;
        }
        case "smoke": {
          p.velocity.x *= 0.997;
          p.velocity.z *= 0.997;
          p.mesh.position.x += p.velocity.x * delta;
          p.mesh.position.y += p.velocity.y * delta;
          p.mesh.position.z += p.velocity.z * delta;
          p.mesh.rotation.y += p.rotSpeed.y * delta;
          mat.opacity =
            pT < 0.12
              ? (pT / 0.12) * 0.55
              : Math.max(0, 0.55 * (1 - (pT - 0.12) / 0.88));
          const sg = Math.max(0.05, 0.3 - pT * 0.22);
          mat.color.setRGB(sg, sg, sg);
          p.mesh.scale.setScalar(1 + pT * 5.0);
          break;
        }
        case "debris": {
          p.velocity.y -= 18 * delta;
          p.mesh.position.x += p.velocity.x * delta;
          p.mesh.position.y += p.velocity.y * delta;
          p.mesh.position.z += p.velocity.z * delta;
          p.mesh.rotation.x += p.rotSpeed.x * delta;
          p.mesh.rotation.y += p.rotSpeed.y * delta;
          p.mesh.rotation.z += p.rotSpeed.z * delta;
          if (p.mesh.position.y < 0.15) {
            p.mesh.position.y = 0.15;
            p.velocity.y *= -0.2;
            p.velocity.x *= 0.45;
            p.velocity.z *= 0.45;
          }
          mat.opacity = pT > 0.75 ? Math.max(0, 1 - (pT - 0.75) / 0.25) : 1;
          break;
        }
        case "spark": {
          p.velocity.y -= 22 * delta;
          p.mesh.position.x += p.velocity.x * delta;
          p.mesh.position.y += p.velocity.y * delta;
          p.mesh.position.z += p.velocity.z * delta;
          p.mesh.rotation.x += p.rotSpeed.x * delta;
          p.mesh.rotation.y += p.rotSpeed.y * delta;
          const len = p.velocity.length();
          p.mesh.scale.set(1, Math.max(1, len * 0.045), 1);
          mat.opacity = Math.max(0, 1 - pT * 1.3);
          if (p.mesh.position.y < 0.1) p.mesh.visible = false;
          break;
        }
        case "ember": {
          p.velocity.y -= 9 * delta;
          p.velocity.x *= 0.998;
          p.velocity.z *= 0.998;
          p.mesh.position.x += p.velocity.x * delta;
          p.mesh.position.y += p.velocity.y * delta;
          p.mesh.position.z += p.velocity.z * delta;
          const flicker = 0.7 + Math.sin(p.life * 30 + p.startScale) * 0.3;
          mat.opacity = Math.max(0, (1 - pT) * flicker);
          mat.color.setRGB(1, Math.max(0, 0.45 - pT * 0.45), 0);
          if (p.mesh.position.y < 0.1) p.mesh.visible = false;
          break;
        }
        case "shrapnel": {
          p.velocity.y -= 20 * delta;
          p.mesh.position.x += p.velocity.x * delta;
          p.mesh.position.y += p.velocity.y * delta;
          p.mesh.position.z += p.velocity.z * delta;
          p.mesh.rotation.x += p.rotSpeed.x * delta;
          p.mesh.rotation.y += p.rotSpeed.y * delta;
          p.mesh.rotation.z += p.rotSpeed.z * delta;
          if (p.mesh.position.y < 0.1) {
            p.mesh.position.y = 0.1;
            p.velocity.y *= -0.12;
            p.velocity.x *= 0.3;
            p.velocity.z *= 0.3;
          }
          mat.opacity = pT > 0.8 ? Math.max(0, 1 - (pT - 0.8) / 0.2) : 1;
          break;
        }
      }
    }

    if (elapsed >= currentDuration && !completedRef.current) {
      completedRef.current = true;
      onComplete();
    }
  });

  const pos = position;
  const stemCenterY = pos[1] + (STEM_HEIGHT * sm) / 2;
  const capY = pos[1] + CAP_HEIGHT_OFFSET * sm;

  return (
    <group ref={groupRef}>
      {/* ===== WHITE-HOT CORE ===== */}
      <mesh ref={coreRef} position={pos} scale={0}>
        <sphereGeometry args={[1, 12, 12]} />
        <meshBasicMaterial
          color="#FFFFFF"
          transparent
          opacity={1}
          depthWrite={false}
        />
      </mesh>

      {/* ===== FIREBALLS ===== */}
      <mesh ref={fireball1Ref} position={pos} scale={0}>
        <sphereGeometry args={[1, 18, 18]} />
        <meshBasicMaterial
          color="#FF2200"
          transparent
          opacity={0.95}
          depthWrite={false}
        />
      </mesh>
      <mesh ref={fireball2Ref} position={pos} scale={0}>
        <sphereGeometry args={[1, 14, 14]} />
        <meshBasicMaterial
          color="#FF6600"
          transparent
          opacity={0.8}
          depthWrite={false}
        />
      </mesh>
      <mesh ref={fireball3Ref} position={pos} scale={0}>
        <sphereGeometry args={[1, 12, 12]} />
        <meshBasicMaterial
          color="#FF9900"
          transparent
          opacity={0.6}
          depthWrite={false}
        />
      </mesh>

      {/* ===== 3D SHOCKWAVE SPHERE ===== */}
      <mesh ref={shockwaveSphereRef} position={pos} scale={0.01}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial
          color="#88CCFF"
          transparent
          opacity={0.28}
          depthWrite={false}
          side={THREE.BackSide}
        />
      </mesh>

      {/* ===== GROUND SHOCKWAVE RINGS ===== */}
      <mesh
        ref={shockwave1Ref}
        position={[pos[0], pos[1] + 0.25, pos[2]]}
        rotation={[Math.PI / 2, 0, 0]}
        scale={[0.01, 1, 0.01]}
      >
        <torusGeometry args={[1, 0.12, 8, 80]} />
        <meshBasicMaterial
          color="#FFFFFF"
          transparent
          opacity={1}
          depthWrite={false}
        />
      </mesh>

      <mesh
        ref={shockwave2Ref}
        position={[pos[0], pos[1] + 0.15, pos[2]]}
        rotation={[Math.PI / 2, 0, 0]}
        scale={[0.01, 1, 0.01]}
      >
        <torusGeometry args={[1, 0.22, 8, 96]} />
        <meshBasicMaterial
          color="#FF8844"
          transparent
          opacity={0.7}
          depthWrite={false}
        />
      </mesh>

      {/* ===== WILSON CONDENSATION RING ===== */}
      <mesh
        ref={condensationRingRef}
        position={[pos[0], pos[1] + 4, pos[2]]}
        rotation={[Math.PI / 2, 0, 0]}
        scale={[0.01, 1, 0.01]}
      >
        <torusGeometry args={[1, 0.28, 8, 80]} />
        <meshBasicMaterial
          color="#DDEEFF"
          transparent
          opacity={0.55}
          depthWrite={false}
        />
      </mesh>

      {/* ===== GROUND FLASH DISC ===== */}
      <mesh
        ref={groundFlashRef}
        position={[pos[0], 0.1, pos[2]]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[0.01, 1, 0.01]}
      >
        <circleGeometry args={[1, 64]} />
        <meshBasicMaterial
          color="#FFDD66"
          transparent
          opacity={0.9}
          depthWrite={false}
        />
      </mesh>

      {/* ===== MUSHROOM STEM ===== */}

      {/* Stem fire core -- bright orange glowing inside */}
      <mesh
        ref={stemFireRef}
        position={[pos[0], stemCenterY, pos[2]]}
        scale={[1, 0.01, 1]}
      >
        <cylinderGeometry
          args={[
            STEM_BASE_RADIUS * 0.55,
            STEM_BASE_RADIUS * 0.35,
            STEM_HEIGHT,
            20,
            1,
            true,
          ]}
        />
        <meshBasicMaterial
          color="#FF5500"
          transparent
          opacity={0}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Stem outer dark smoke */}
      <mesh
        ref={stemOuterRef}
        position={[pos[0], stemCenterY, pos[2]]}
        scale={[1, 0.01, 1]}
      >
        <cylinderGeometry
          args={[STEM_TOP_RADIUS, STEM_BASE_RADIUS, STEM_HEIGHT, 24, 1, true]}
        />
        <meshBasicMaterial
          color="#1A0C06"
          transparent
          opacity={0}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Stem inner bright column */}
      <mesh
        ref={stemInnerRef}
        position={[pos[0], stemCenterY, pos[2]]}
        scale={[1, 0.01, 1]}
      >
        <cylinderGeometry
          args={[
            STEM_BASE_RADIUS * 0.75,
            STEM_BASE_RADIUS * 0.5,
            STEM_HEIGHT,
            18,
            1,
            true,
          ]}
        />
        <meshBasicMaterial
          color="#2A1508"
          transparent
          opacity={0}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* ===== MUSHROOM CAP ===== */}

      {/* Main outer torus ring (the classic mushroom shape) */}
      <mesh
        ref={capTorusRef}
        position={[pos[0], capY, pos[2]]}
        scale={[0.01, 0.01, 0.01]}
      >
        <torusGeometry args={[1, 0.7, 20, 64]} />
        <meshBasicMaterial
          color="#150805"
          transparent
          opacity={0}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Cap upper dome */}
      <mesh
        ref={capDomeRef}
        position={[pos[0], capY + 2, pos[2]]}
        scale={[0.01, 0.01, 0.01]}
      >
        {/* Half sphere for dome top */}
        <sphereGeometry args={[1, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
        <meshBasicMaterial
          color="#1A0A04"
          transparent
          opacity={0}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Cap underside/skirt (curls inward) */}
      <mesh
        ref={capDomeBottomRef}
        position={[pos[0], capY - 4, pos[2]]}
        scale={[0.01, 0.01, 0.01]}
      >
        <torusGeometry args={[0.85, 0.45, 14, 48]} />
        <meshBasicMaterial
          color="#0F0604"
          transparent
          opacity={0}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Cap inner fire glow */}
      <mesh
        ref={capInnerFireRef}
        position={[pos[0], capY - 1, pos[2]]}
        scale={[0.01, 0.01, 0.01]}
      >
        <torusGeometry args={[1, 0.55, 16, 52]} />
        <meshBasicMaterial
          color="#AA2200"
          transparent
          opacity={0}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Cap condensation / outer bright edge */}
      <mesh
        ref={capCondensationRef}
        position={[pos[0], capY + 3, pos[2]]}
        scale={[0.01, 0.01, 0.01]}
      >
        <torusGeometry args={[1.05, 0.35, 12, 64]} />
        <meshBasicMaterial
          color="#88AABB"
          transparent
          opacity={0}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* ===== LIGHTS ===== */}
      {/* Primary blast flash */}
      <pointLight
        ref={pointLight1Ref}
        position={pos}
        color="#FFEEAA"
        intensity={450}
        distance={300}
        decay={1.1}
      />

      {/* Lingering ground glow */}
      <pointLight
        ref={pointLight2Ref}
        position={[pos[0], pos[1] + 10, pos[2]]}
        color="#FF4400"
        intensity={90}
        distance={180}
        decay={1.6}
      />

      {/* Mushroom cap glow */}
      <pointLight
        ref={pointLight3Ref}
        position={[pos[0], capY, pos[2]]}
        color="#FF3300"
        intensity={0}
        distance={250}
        decay={1.4}
      />

      {/* Mid-stem fire glow */}
      <pointLight
        ref={pointLight4Ref}
        position={[pos[0], pos[1] + STEM_HEIGHT * 0.4, pos[2]]}
        color="#FF6600"
        intensity={0}
        distance={150}
        decay={1.8}
      />
    </group>
  );
}
