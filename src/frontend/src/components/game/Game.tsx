import { useGameStore } from "@/store/useGameStore";
import { playReload, playRocketFire } from "@/utils/soundManager";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useRef } from "react";
import { Building } from "./Building";
import { DestructibleProps } from "./DestructibleProps";
import { DustCloud } from "./DustCloud";
import { Environment } from "./Environment";
import { Explosion } from "./Explosion";
import { Player } from "./Player";
import { Projectile } from "./Projectile";

// Bird's eye (overhead) camera controller
function BirdseyeController() {
  const { camera } = useThree();
  const {
    gameState,
    fireRocket,
    ammo,
    isReloading,
    startReload,
    cycleShotSize,
  } = useGameStore();
  const keysRef = useRef<Record<string, boolean>>({});
  const zoomRef = useRef(120);

  // Set initial bird's eye camera position/rotation on mount
  useEffect(() => {
    camera.position.set(0, 120, 0);
    camera.rotation.set(-Math.PI / 2, 0, 0);
    zoomRef.current = 120;
  }, [camera]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.code] = true;
      if (e.code === "KeyQ" && gameState === "playing") cycleShotSize(-1);
      if (e.code === "KeyE" && gameState === "playing") cycleShotSize(1);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.code] = false;
    };

    const onWheel = (e: WheelEvent) => {
      zoomRef.current = Math.max(
        30,
        Math.min(200, zoomRef.current + e.deltaY * 0.1),
      );
    };

    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0 || gameState !== "playing") return;
      if (ammo <= 0) {
        if (!isReloading) {
          startReload();
          playReload();
        }
        return;
      }
      if (isReloading) return;

      playRocketFire();
      const firePos: [number, number, number] = [
        camera.position.x,
        camera.position.y,
        camera.position.z,
      ];
      fireRocket(firePos, [0, -1, 0]);

      if (ammo === 1) {
        setTimeout(() => {
          startReload();
          playReload();
        }, 200);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("mousedown", onMouseDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("mousedown", onMouseDown);
    };
  }, [
    camera,
    gameState,
    ammo,
    isReloading,
    fireRocket,
    startReload,
    cycleShotSize,
  ]);

  useFrame((_, delta) => {
    if (gameState !== "playing") return;

    const PAN_SPEED = 30;
    const keys = keysRef.current;

    if (keys.KeyW || keys.ArrowUp) camera.position.z -= PAN_SPEED * delta;
    if (keys.KeyS || keys.ArrowDown) camera.position.z += PAN_SPEED * delta;
    if (keys.KeyA || keys.ArrowLeft) camera.position.x -= PAN_SPEED * delta;
    if (keys.KeyD || keys.ArrowRight) camera.position.x += PAN_SPEED * delta;

    // Smooth zoom
    camera.position.y +=
      (zoomRef.current - camera.position.y) * Math.min(1, delta * 8);

    // Clamp position to map bounds
    const BOUND = 120;
    camera.position.x = Math.max(-BOUND, Math.min(BOUND, camera.position.x));
    camera.position.z = Math.max(-BOUND, Math.min(BOUND, camera.position.z));

    // Keep looking straight down
    camera.rotation.set(-Math.PI / 2, 0, 0);
  });

  return null;
}

function GameLoop() {
  const { gameState, incrementTime, ammo, isReloading, startReload } =
    useGameStore();

  useFrame((_, delta) => {
    if (gameState === "playing") {
      incrementTime(delta);

      // Auto-reload when ammo runs out
      if (ammo === 0 && !isReloading) {
        startReload();
      }
    }
  });

  return null;
}

function Scene() {
  const {
    buildings,
    projectiles,
    explosions,
    dustClouds,
    removeExplosion,
    removeDustCloud,
    triggerScreenShake,
    setSkyFlashIntensity,
    cameraMode,
  } = useGameStore();

  return (
    <>
      <GameLoop />
      <Environment />
      <DestructibleProps />

      {/* Buildings */}
      {buildings.map((building) => (
        <Building key={building.id} building={building} />
      ))}

      {/* Projectiles */}
      {projectiles.map((proj) => (
        <Projectile
          key={proj.id}
          id={proj.id}
          position={proj.position}
          direction={proj.direction}
          speed={proj.speed}
          shotSize={proj.shotSize}
        />
      ))}

      {/* Explosions */}
      {explosions.map((exp) => (
        <Explosion
          key={exp.id}
          position={exp.position}
          size={exp.size ?? 1}
          onComplete={() => removeExplosion(exp.id)}
          onScreenShake={() => triggerScreenShake()}
          onSkyFlash={setSkyFlashIntensity}
        />
      ))}

      {/* Dust clouds from building destruction */}
      {dustClouds.map((dust) => (
        <DustCloud
          key={dust.id}
          position={dust.position}
          onComplete={() => removeDustCloud(dust.id)}
        />
      ))}

      {/* Camera controllers - mutually exclusive */}
      {cameraMode === "fps" ? <Player /> : <BirdseyeController />}
    </>
  );
}

interface GameProps {
  isMenuVisible: boolean;
}

export function Game({ isMenuVisible }: GameProps) {
  const { gameState, cameraMode } = useGameStore();

  const cursor =
    gameState !== "playing"
      ? "default"
      : cameraMode === "birdseye"
        ? "crosshair"
        : "none";

  return (
    <div className="w-full h-full" style={{ cursor }}>
      <Canvas
        camera={{
          fov: 75,
          near: 0.1,
          far: 200,
          position: [0, 1.7, 5],
        }}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: "high-performance",
        }}
        style={{
          background: "#C4722A",
          filter: isMenuVisible ? "blur(3px) brightness(0.4)" : "none",
          transition: "filter 0.3s ease",
        }}
        shadows
      >
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>
    </div>
  );
}
