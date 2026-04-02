import { Game } from "@/components/game/Game";
import { HUD } from "@/components/game/HUD";
import { VictoryScreen } from "@/components/game/VictoryScreen";
import { useGameStore } from "@/store/useGameStore";
import { useEffect, useRef, useState } from "react";

export default function App() {
  const {
    gameState,
    screenShakeCount,
    skyFlashIntensity,
    toggleCameraMode,
    cameraMode,
  } = useGameStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const shakeRef = useRef<{
    x: number;
    y: number;
    intensity: number;
    frame: number;
  }>({
    x: 0,
    y: 0,
    intensity: 0,
    frame: 0,
  });
  const animFrameRef = useRef<number | null>(null);
  const [shakeStyle, setShakeStyle] = useState({
    transform: "translate(0px, 0px)",
  });

  // Make sure the game takes full screen
  useEffect(() => {
    document.body.style.margin = "0";
    document.body.style.padding = "0";
    document.body.style.overflow = "hidden";
    document.documentElement.style.height = "100%";
    document.body.style.height = "100%";
  }, []);

  // V key toggles camera mode during gameplay (works outside pointer lock)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== "KeyV") return;
      if (gameState !== "playing") return;
      // Exit pointer lock when switching to birdseye
      if (cameraMode === "fps" && document.pointerLockElement) {
        document.exitPointerLock();
      }
      toggleCameraMode();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [gameState, cameraMode, toggleCameraMode]);

  // Start screen shake animation when triggered
  useEffect(() => {
    if (screenShakeCount === 0) return;

    // Cancel any existing shake
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
    }

    shakeRef.current.intensity = 1.0;
    shakeRef.current.frame = 0;

    const SHAKE_DURATION = 70; // frames -- longer shake
    const MAX_OFFSET = 22; // pixels -- stronger

    const animate = () => {
      const s = shakeRef.current;
      s.frame++;

      if (s.frame >= SHAKE_DURATION) {
        setShakeStyle({ transform: "translate(0px, 0px)" });
        animFrameRef.current = null;
        return;
      }

      // Decay: fast at start, slow at end
      const progress = s.frame / SHAKE_DURATION;
      const decay = (1 - progress) ** 1.8;

      // Randomized shake with higher freq at start
      const freq = 1 + (1 - progress) * 2;
      const noiseX =
        (Math.sin(s.frame * freq * 1.3 + 0.5) + (Math.random() - 0.5) * 0.6) *
        decay;
      const noiseY =
        (Math.cos(s.frame * freq * 0.9 + 1.2) + (Math.random() - 0.5) * 0.6) *
        decay;

      const offsetX = noiseX * MAX_OFFSET;
      const offsetY = noiseY * MAX_OFFSET;

      setShakeStyle({
        transform: `translate(${offsetX.toFixed(1)}px, ${offsetY.toFixed(1)}px)`,
      });

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [screenShakeCount]);

  const isVictory = gameState === "victory";
  const isPlaying = gameState === "playing";

  return (
    <div
      ref={containerRef}
      style={{
        width: "100vw",
        height: "100vh",
        position: "relative",
        overflow: "hidden",
        background: "#0A0600",
        fontFamily: "'Bricolage Grotesque', sans-serif",
      }}
    >
      {/* Screen shake wrapper -- only applied during gameplay */}
      <div
        style={{
          position: "absolute",
          inset: "-20px",
          willChange: "transform",
          ...(isPlaying ? shakeStyle : {}),
        }}
      >
        {/* 3D Game Canvas */}
        <div style={{ position: "absolute", inset: 0 }}>
          <Game isMenuVisible={isVictory} />
        </div>
      </div>

      {/* Nuclear white flash overlay - only during gameplay */}
      {isPlaying && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            backgroundColor: "#FFFFFF",
            opacity: skyFlashIntensity * 0.98,
            zIndex: 50,
            transition:
              skyFlashIntensity > 0.5
                ? "opacity 0.025s ease-in"
                : "opacity 0.12s ease-out",
          }}
        />
      )}

      {/* Orange nuclear sky tint -- lingers after flash */}
      {isPlaying && skyFlashIntensity > 0.05 && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background:
              "radial-gradient(ellipse at center, rgba(255,80,0,0.35) 0%, rgba(200,30,0,0.15) 60%, transparent 100%)",
            opacity: Math.min(1, skyFlashIntensity * 2.5),
            zIndex: 48,
          }}
        />
      )}

      {/* In-game HUD (outside shake wrapper so it stays stable) */}
      {isPlaying && <HUD />}

      {/* Victory Screen */}
      {isVictory && <VictoryScreen />}
    </div>
  );
}
