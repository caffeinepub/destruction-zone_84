import { useGameStore } from "@/store/useGameStore";
import { Camera, Crosshair as CrosshairIcon } from "lucide-react";
import { Crosshair } from "./Crosshair";
import { SHOT_SIZE_NAMES } from "./Explosion";

function RocketIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="22"
      height="34"
      viewBox="0 0 24 36"
      fill="none"
      aria-hidden="true"
      style={{
        opacity: active ? 1 : 0.25,
        filter: active ? "drop-shadow(0 0 3px #FF8C00)" : "grayscale(1)",
        transition: "opacity 0.15s, filter 0.15s",
      }}
    >
      {/* Body */}
      <rect
        x="8"
        y="10"
        width="8"
        height="16"
        rx="2"
        fill={active ? "#E87A1D" : "#444"}
      />
      {/* Nose */}
      <polygon points="12,2 8,10 16,10" fill={active ? "#FFD700" : "#333"} />
      {/* Exhaust flame */}
      <polygon
        points="8,26 4,34 12,28 20,34 16,26"
        fill={active ? "#FF4400" : "#222"}
      />
      {/* Outline strokes */}
      <rect
        x="8"
        y="10"
        width="8"
        height="16"
        rx="2"
        stroke="#000"
        strokeWidth="2"
        fill="none"
      />
      <polygon
        points="12,2 8,10 16,10"
        stroke="#000"
        strokeWidth="2"
        fill="none"
      />
      <polygon
        points="8,26 4,34 12,28 20,34 16,26"
        stroke="#000"
        strokeWidth="1.5"
        fill="none"
      />
      {/* Window */}
      {active && (
        <circle
          cx="12"
          cy="17"
          r="2"
          fill="#FFE080"
          stroke="#000"
          strokeWidth="1"
        />
      )}
    </svg>
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

/** Shared label style for panel headers */
function PanelLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        color: "#C96B0F",
        fontSize: "10px",
        fontWeight: 900,
        letterSpacing: "0.25em",
        textTransform: "uppercase",
        fontStyle: "italic",
        textShadow: "1px 1px 0 #000",
        marginBottom: "4px",
        borderBottom: "1px solid rgba(201,107,15,0.3)",
        paddingBottom: "3px",
      }}
    >
      {children}
    </div>
  );
}

// Color gradient for shot sizes: green(1) -> yellow(5) -> orange(8) -> red(10)
function getShotSizeColor(size: number): string {
  if (size <= 3) return "#44FF66";
  if (size <= 5) return "#CCFF22";
  if (size <= 7) return "#FF8C00";
  if (size <= 9) return "#FF3300";
  return "#FF00FF"; // NUKE = magenta
}

export function HUD() {
  const {
    ammo,
    maxAmmo,
    isReloading,
    destroyedBuildings,
    score,
    timeElapsed,
    screenShake,
    cameraMode,
    toggleCameraMode,
    shotSize,
    cycleShotSize,
    resetGame,
  } = useGameStore();

  const isBirdseye = cameraMode === "birdseye";

  return (
    <div
      className={`absolute inset-0 z-20 ${screenShake ? "shake" : ""}`}
      style={{
        fontFamily: "'Bricolage Grotesque', sans-serif",
        pointerEvents: "none",
      }}
    >
      {/* Crosshair -- only in FPS mode */}
      {!isBirdseye && <Crosshair />}

      {/* Bird's eye overlay hint */}
      {isBirdseye && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            pointerEvents: "none",
          }}
        >
          <CrosshairIcon
            size={28}
            color="rgba(255,140,0,0.7)"
            strokeWidth={1.5}
          />
        </div>
      )}

      {/* ── Top-left: Score ── */}
      <div className="absolute top-4 left-4">
        <div
          className="hud-panel"
          style={{ padding: "8px 14px", minWidth: "100px" }}
        >
          <PanelLabel>Score</PanelLabel>
          <div
            className="hud-number"
            style={{
              color: "#FFD700",
              fontSize: "1.9rem",
              fontWeight: 900,
              lineHeight: 1,
              fontStyle: "italic",
            }}
          >
            {score.toLocaleString()}
          </div>
        </div>
      </div>

      {/* ── Top-center: Reset World ── */}
      <div
        className="absolute top-4"
        style={{
          left: "50%",
          transform: "translateX(-50%)",
          pointerEvents: "auto",
        }}
      >
        <button
          type="button"
          data-ocid="hud.reset_button"
          onClick={resetGame}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "7px 15px",
            background:
              "linear-gradient(135deg, rgba(180,30,0,0.45), rgba(80,10,0,0.65))",
            border: "2px solid rgba(255,60,0,0.45)",
            borderRadius: "6px",
            cursor: "pointer",
            fontFamily: "'Bricolage Grotesque', sans-serif",
            fontWeight: 900,
            fontStyle: "italic",
            fontSize: "11px",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "rgba(255,160,80,0.8)",
            textShadow: "1px 1px 0 #000",
            boxShadow: "none",
            transition: "all 0.15s ease",
            backdropFilter: "blur(4px)",
            whiteSpace: "nowrap",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor =
              "rgba(255,80,0,0.8)";
            (e.currentTarget as HTMLButtonElement).style.color = "#FFD700";
            (e.currentTarget as HTMLButtonElement).style.boxShadow =
              "0 0 12px rgba(255,80,0,0.4)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor =
              "rgba(255,60,0,0.45)";
            (e.currentTarget as HTMLButtonElement).style.color =
              "rgba(255,160,80,0.8)";
            (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
          }}
        >
          🔄 RESET WELT
        </button>
      </div>

      {/* ── Top-right: Timer + Camera toggle ── */}
      <div
        className="absolute top-4 right-4"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: "8px",
        }}
      >
        <div
          className="hud-panel"
          style={{ padding: "8px 14px", textAlign: "right" }}
        >
          <PanelLabel>Time</PanelLabel>
          <div
            className="hud-number"
            style={{
              color: "#FF8C00",
              fontSize: "1.9rem",
              fontWeight: 900,
              lineHeight: 1,
              fontStyle: "italic",
            }}
          >
            {formatTime(timeElapsed)}
          </div>
        </div>

        {/* Camera mode toggle button */}
        <button
          type="button"
          data-ocid="hud.camera_mode_toggle"
          onClick={toggleCameraMode}
          style={{
            pointerEvents: "auto",
            display: "flex",
            alignItems: "center",
            gap: "7px",
            padding: "7px 13px",
            background: isBirdseye
              ? "linear-gradient(135deg, rgba(255,140,0,0.35), rgba(180,60,0,0.25))"
              : "linear-gradient(135deg, rgba(0,0,0,0.55), rgba(30,15,0,0.7))",
            border: `2px solid ${isBirdseye ? "rgba(255,140,0,0.7)" : "rgba(255,140,0,0.3)"}`,
            borderRadius: "6px",
            cursor: "pointer",
            fontFamily: "'Bricolage Grotesque', sans-serif",
            fontWeight: 900,
            fontStyle: "italic",
            fontSize: "11px",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: isBirdseye ? "#FFD700" : "rgba(255,200,80,0.6)",
            textShadow: "1px 1px 0 #000",
            boxShadow: isBirdseye
              ? "0 0 12px rgba(255,140,0,0.4), inset 0 1px 0 rgba(255,200,80,0.15)"
              : "none",
            transition: "all 0.15s ease",
            backdropFilter: "blur(4px)",
          }}
        >
          <Camera size={13} strokeWidth={2.5} />
          {isBirdseye ? "BIRD'S EYE" : "FPS"}
          <span
            style={{
              color: "rgba(255,200,80,0.45)",
              fontSize: "9px",
              fontStyle: "normal",
            }}
          >
            [V]
          </span>
        </button>
      </div>

      {/* ── Bottom-left: Ammo ── */}
      <div className="absolute bottom-6 left-4">
        <div className="hud-panel" style={{ padding: "10px 14px" }}>
          <PanelLabel>Ammo</PanelLabel>
          {/* Rocket icons */}
          <div style={{ display: "flex", gap: "3px", alignItems: "flex-end" }}>
            {Array.from({ length: maxAmmo }, (_, i) => `slot-${i}`).map(
              (slotKey, i) => (
                <RocketIcon key={slotKey} active={i < ammo} />
              ),
            )}
          </div>
          {/* Numeric readout */}
          <div
            style={{
              color: ammo === 0 ? "#FF2200" : "#FF8C00",
              fontSize: "11px",
              fontWeight: 900,
              fontStyle: "italic",
              letterSpacing: "0.1em",
              marginTop: "3px",
            }}
          >
            {ammo} / {maxAmmo}
          </div>
          {/* Reload flash */}
          {isReloading && (
            <div
              className="reload-flash"
              style={{
                color: "#FF3300",
                fontSize: "13px",
                fontWeight: 900,
                fontStyle: "italic",
                marginTop: "3px",
                letterSpacing: "0.12em",
                textShadow: "1px 1px 0 #000, 0 0 8px rgba(255,50,0,0.6)",
              }}
            >
              ⚡ RELOADING...
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom-right: Destroyed counter ── */}
      <div className="absolute bottom-6 right-4">
        <div
          className="hud-panel"
          style={{ padding: "10px 14px", textAlign: "right" }}
        >
          <PanelLabel>Buildings Destroyed</PanelLabel>

          {/* Big number */}
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "flex-end",
              gap: "4px",
            }}
          >
            <span
              className="hud-number"
              style={{
                color: destroyedBuildings > 0 ? "#FF4400" : "#555",
                fontSize: "2.8rem",
                fontWeight: 900,
                fontStyle: "italic",
                lineHeight: 1,
                transition: "color 0.2s",
              }}
            >
              {destroyedBuildings}
            </span>
            <span
              style={{
                color: "#444",
                fontSize: "1.4rem",
                fontWeight: 900,
                fontStyle: "italic",
              }}
            >
              /10
            </span>
          </div>

          {/* Building pip track */}
          <div
            style={{
              display: "flex",
              gap: "2px",
              marginTop: "5px",
              justifyContent: "flex-end",
            }}
          >
            {Array.from({ length: 10 }, (_, i) => `bldg-${i}`).map(
              (bldgKey, i) => {
                const isDestroyed = i < destroyedBuildings;
                return (
                  <div
                    key={bldgKey}
                    style={{
                      width: "9px",
                      height: "20px",
                      background: isDestroyed
                        ? "linear-gradient(180deg,#FF5500,#8B1500)"
                        : "linear-gradient(180deg,#E87A1D,#7A3A00)",
                      border: "2px solid #000",
                      borderRadius: "1px",
                      opacity: isDestroyed ? 0.5 : 1,
                      boxShadow: isDestroyed
                        ? "none"
                        : "inset 0 1px 0 rgba(255,200,80,0.3)",
                      position: "relative",
                      transition: "opacity 0.3s, background 0.3s",
                    }}
                  >
                    {/* window detail on intact buildings */}
                    {!isDestroyed && (
                      <div
                        style={{
                          position: "absolute",
                          top: "3px",
                          left: "50%",
                          transform: "translateX(-50%)",
                          width: "3px",
                          height: "4px",
                          background: "rgba(255,220,100,0.5)",
                        }}
                      />
                    )}
                    {/* rubble X on destroyed */}
                    {isDestroyed && (
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "8px",
                          color: "#FF2200",
                          fontWeight: 900,
                          lineHeight: 1,
                        }}
                      >
                        ✕
                      </div>
                    )}
                  </div>
                );
              },
            )}
          </div>
        </div>
      </div>

      {/* ── Bottom-center: Shot Size selector ── */}
      <div
        className="absolute"
        style={{
          bottom: "24px",
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "5px",
          pointerEvents: "auto",
        }}
      >
        {/* Size bar with label */}
        <div
          className="hud-panel"
          style={{
            padding: "8px 14px",
            textAlign: "center",
            minWidth: "220px",
          }}
        >
          <PanelLabel>Schussgrösse</PanelLabel>
          {/* 10 segment bar */}
          <div
            style={{
              display: "flex",
              gap: "3px",
              justifyContent: "center",
              marginBottom: "4px",
            }}
          >
            {Array.from({ length: 10 }, (_, i) => i + 1).map((lvl) => {
              const active = lvl <= shotSize;
              const isCurrent = lvl === shotSize;
              return (
                <button
                  key={lvl}
                  type="button"
                  data-ocid={`hud.shot_size.${lvl}`}
                  onClick={() => cycleShotSize(lvl > shotSize ? 1 : -1)}
                  style={{
                    width: "16px",
                    height: "22px",
                    background: active
                      ? `linear-gradient(180deg, ${getShotSizeColor(lvl)}, ${getShotSizeColor(lvl)}88)`
                      : "rgba(20,10,0,0.7)",
                    border: `2px solid ${isCurrent ? getShotSizeColor(lvl) : "#000"}`,
                    borderRadius: "2px",
                    cursor: "pointer",
                    boxShadow: isCurrent
                      ? `0 0 8px ${getShotSizeColor(lvl)}`
                      : "none",
                    transition: "all 0.1s",
                    padding: 0,
                  }}
                />
              );
            })}
          </div>
          {/* Label */}
          <div
            style={{
              color: getShotSizeColor(shotSize),
              fontSize: "12px",
              fontWeight: 900,
              fontStyle: "italic",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              textShadow: `0 0 8px ${getShotSizeColor(shotSize)}`,
            }}
          >
            {shotSize === 10 ? "☢ " : ""}
            {shotSize} / 10 — {SHOT_SIZE_NAMES[shotSize] ?? ""}
          </div>
        </div>

        {/* Hint strip */}
        <div
          style={{
            color: "rgba(255,255,255,0.3)",
            fontSize: "9px",
            fontWeight: 700,
            fontStyle: "italic",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            textShadow: "1px 1px 0 #000",
            whiteSpace: "nowrap",
          }}
        >
          {isBirdseye
            ? "Q/E GRÖSSE · SCROLL ZOOM · KLICK FEUERN · [V] KAMERA"
            : "WASD · SHIFT · LEERTASTE · KLICK · R · Q/E GRÖSSE · [V] KAMERA"}
        </div>
      </div>
    </div>
  );
}
