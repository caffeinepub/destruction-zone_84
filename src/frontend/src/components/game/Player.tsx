import { useGameStore } from "@/store/useGameStore";
import {
  playReload,
  playReloadReady,
  playRocketFire,
  startAmbient,
} from "@/utils/soundManager";
import { PointerLockControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";

const PLAYER_HEIGHT = 1.7;
const WALK_SPEED = 8;
const SPRINT_SPEED = 14;
const JUMP_VELOCITY = 8;
const GRAVITY = -18;

const keys: Record<string, boolean> = {};

export function Player() {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);
  const velocityRef = useRef(new THREE.Vector3());
  const isGroundedRef = useRef(true);
  const isLockedRef = useRef(false);
  const wasReloadingRef = useRef(false);

  const {
    gameState,
    fireRocket,
    ammo,
    isReloading,
    startReload,
    cameraMode,
    cycleShotSize,
  } = useGameStore();

  // Set initial camera position
  useEffect(() => {
    camera.position.set(0, PLAYER_HEIGHT, 5);
  }, [camera]);

  // Start ambient sound when game begins
  useEffect(() => {
    if (gameState === "playing") {
      startAmbient();
    }
  }, [gameState]);

  // Play "reload ready" chime when reload completes
  useEffect(() => {
    if (wasReloadingRef.current && !isReloading) {
      playReloadReady();
    }
    wasReloadingRef.current = isReloading;
  }, [isReloading]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      keys[e.code] = true;
      // Reload on R
      if (e.code === "KeyR" && gameState === "playing" && !isReloading) {
        startReload();
        playReload();
      }
      // Cycle shot size with Q (smaller) / E (bigger)
      if (e.code === "KeyQ" && gameState === "playing") {
        cycleShotSize(-1);
      }
      if (e.code === "KeyE" && gameState === "playing") {
        cycleShotSize(1);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keys[e.code] = false;
    };
    const onWheel = (e: WheelEvent) => {
      if (gameState !== "playing") return;
      cycleShotSize(e.deltaY > 0 ? -1 : 1);
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("wheel", onWheel, { passive: true });
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("wheel", onWheel);
    };
  }, [gameState, isReloading, startReload, cycleShotSize]);

  useEffect(() => {
    const onLock = () => {
      isLockedRef.current = true;
    };
    const onUnlock = () => {
      isLockedRef.current = false;
    };

    document.addEventListener("pointerlockchange", onLock);
    document.addEventListener("mozpointerlockchange", onLock);

    const controls = controlsRef.current;
    if (controls) {
      controls.addEventListener("lock", onLock);
      controls.addEventListener("unlock", onUnlock);
    }

    return () => {
      document.removeEventListener("pointerlockchange", onLock);
      document.removeEventListener("mozpointerlockchange", onLock);
      if (controls) {
        controls.removeEventListener("lock", onLock);
        controls.removeEventListener("unlock", onUnlock);
      }
    };
  }, []);

  useEffect(() => {
    const handleFire = () => {
      if (ammo <= 0) {
        if (!isReloading) startReload();
        return;
      }
      if (isReloading) return;

      const dir = new THREE.Vector3();
      camera.getWorldDirection(dir);
      dir.normalize();

      const firePos: [number, number, number] = [
        camera.position.x + dir.x * 1.5,
        camera.position.y + dir.y * 1.5,
        camera.position.z + dir.z * 1.5,
      ];
      const fireDir: [number, number, number] = [dir.x, dir.y, dir.z];

      playRocketFire();
      fireRocket(firePos, fireDir);

      if (ammo === 1) {
        setTimeout(() => {
          startReload();
          playReload();
        }, 200);
      }
    };

    const onMouseDown = (e: MouseEvent) => {
      if (!isLockedRef.current || gameState !== "playing") return;
      if (e.button === 0) {
        handleFire();
      }
    };

    window.addEventListener("mousedown", onMouseDown);
    return () => window.removeEventListener("mousedown", onMouseDown);
  }, [gameState, ammo, isReloading, camera, fireRocket, startReload]);

  useFrame((_, delta) => {
    if (gameState !== "playing" || cameraMode !== "fps") return;

    const isSprinting = keys.ShiftLeft || keys.ShiftRight;
    const speed = isSprinting ? SPRINT_SPEED : WALK_SPEED;

    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3();
    right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

    const moveDir = new THREE.Vector3();

    if (keys.KeyW || keys.ArrowUp) moveDir.add(forward);
    if (keys.KeyS || keys.ArrowDown) moveDir.sub(forward);
    if (keys.KeyA || keys.ArrowLeft) moveDir.sub(right);
    if (keys.KeyD || keys.ArrowRight) moveDir.add(right);

    if (moveDir.lengthSq() > 0) moveDir.normalize();

    camera.position.x += moveDir.x * speed * delta;
    camera.position.z += moveDir.z * speed * delta;

    if (keys.Space && isGroundedRef.current) {
      velocityRef.current.y = JUMP_VELOCITY;
      isGroundedRef.current = false;
    }

    if (!isGroundedRef.current) {
      velocityRef.current.y += GRAVITY * delta;
      camera.position.y += velocityRef.current.y * delta;
    }

    if (camera.position.y <= PLAYER_HEIGHT) {
      camera.position.y = PLAYER_HEIGHT;
      velocityRef.current.y = 0;
      isGroundedRef.current = true;
    }

    const BOUND = 95;
    camera.position.x = Math.max(-BOUND, Math.min(BOUND, camera.position.x));
    camera.position.z = Math.max(-BOUND, Math.min(BOUND, camera.position.z));
  });

  if (gameState !== "playing" || cameraMode !== "fps") return null;

  return <PointerLockControls ref={controlsRef} makeDefault />;
}
