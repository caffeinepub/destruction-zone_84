import type { ScoreEntry } from "@/backend.d";
import { useActor } from "@/hooks/useActor";
import { useGameStore } from "@/store/useGameStore";
import { useEffect, useState } from "react";

export function MainMenu() {
  const { startGame } = useGameStore();
  const { actor, isFetching } = useActor();
  const [scores, setScores] = useState<ScoreEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!actor || isFetching) return;
    async function loadScores() {
      try {
        const topScores = await actor!.getTopScores();
        setScores(topScores.slice(0, 8));
      } catch (e) {
        console.error("Failed to load scores", e);
      } finally {
        setIsLoading(false);
      }
    }
    loadScores();
  }, [actor, isFetching]);

  function formatTime(seconds: bigint): string {
    const s = Number(seconds);
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${m.toString().padStart(2, "0")}:${rem.toString().padStart(2, "0")}`;
  }

  return (
    <div
      className="absolute inset-0 z-30 flex items-center justify-center scanlines"
      style={{
        background:
          "radial-gradient(ellipse at 50% 25%, rgba(90,35,0,0.92) 0%, rgba(4,2,0,0.98) 65%)",
      }}
    >
      {/* Corner bracket decorations — BL UI staple */}
      {[
        { pos: "top-0 left-0", bt: true, bb: false, bl: true, br: false },
        { pos: "top-0 right-0", bt: true, bb: false, bl: false, br: true },
        { pos: "bottom-0 left-0", bt: false, bb: true, bl: true, br: false },
        { pos: "bottom-0 right-0", bt: false, bb: true, bl: false, br: true },
      ].map(({ pos, bt, bb, bl, br }) => (
        <div
          key={pos}
          className={`absolute ${pos} pointer-events-none`}
          style={{
            width: "80px",
            height: "80px",
            margin: "18px",
            borderTop: bt ? "5px solid #C96B0F" : "none",
            borderBottom: bb ? "5px solid #C96B0F" : "none",
            borderLeft: bl ? "5px solid #C96B0F" : "none",
            borderRight: br ? "5px solid #C96B0F" : "none",
            /* inner line inset via outline */
            boxShadow:
              [
                bt && "inset 0 5px 0 rgba(255,200,60,0.15)",
                bb && "inset 0 -5px 0 rgba(255,200,60,0.15)",
                bl && "inset 5px 0 0 rgba(255,200,60,0.15)",
                br && "inset -5px 0 0 rgba(255,200,60,0.15)",
              ]
                .filter(Boolean)
                .join(", ") || "none",
          }}
        />
      ))}

      {/* Horizontal scan accent lines */}
      <div
        className="absolute inset-x-0 pointer-events-none"
        style={{
          top: "48%",
          height: "2px",
          background:
            "linear-gradient(90deg,transparent,rgba(201,107,15,0.18) 20%,rgba(255,160,40,0.35) 50%,rgba(201,107,15,0.18) 80%,transparent)",
        }}
      />

      <div className="flex flex-col items-center w-full max-w-3xl px-8 gap-5">
        {/* ── TITLE BLOCK ── */}
        <div style={{ textAlign: "center", position: "relative" }}>
          {/* Pre-title label */}
          <div
            style={{
              color: "#7A4010",
              fontSize: "12px",
              fontWeight: 900,
              fontStyle: "italic",
              letterSpacing: "0.45em",
              textTransform: "uppercase",
              marginBottom: "6px",
              textShadow: "1px 1px 0 #000",
            }}
          >
            ⚡ CAFFEINE GAMES PRESENTS ⚡
          </div>

          {/* DESTRUCTION — orange, italic, mega outline */}
          <h1
            className="hud-title"
            style={{
              fontSize: "clamp(3.2rem, 9vw, 6rem)",
              color: "#E8720E",
              lineHeight: 0.88,
              letterSpacing: "-0.01em",
              marginBottom: 0,
              display: "block",
            }}
          >
            DESTRUCTION
          </h1>

          {/* ZONE — yellow, slightly larger, offset right for dynamism */}
          <h1
            className="hud-title"
            style={{
              fontSize: "clamp(3.2rem, 9vw, 6rem)",
              color: "#FFD020",
              lineHeight: 0.88,
              letterSpacing: "-0.01em",
              display: "block",
              marginLeft: "clamp(12px, 3vw, 48px)",
            }}
          >
            ZONE
          </h1>

          {/* Underline stripe */}
          <div
            style={{
              marginTop: "10px",
              height: "4px",
              background:
                "linear-gradient(90deg,transparent,#C96B0F 15%,#FFD020 50%,#C96B0F 85%,transparent)",
              borderRadius: "2px",
            }}
          />
        </div>

        {/* ── Subtitle tag ── */}
        <div
          style={{
            background: "rgba(0,0,0,0.55)",
            border: "2px solid #000",
            outline: "1px solid rgba(201,107,15,0.4)",
            outlineOffset: "-4px",
            padding: "7px 22px",
            color: "#C49A3A",
            fontSize: "0.95rem",
            fontWeight: 800,
            fontStyle: "italic",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            textShadow: "2px 2px 0 #000",
          }}
        >
          10 Gebäude · Ein Raketenwerfer · Null Gnade
        </div>

        {/* ── Controls grid ── */}
        <div
          className="hud-panel"
          style={{ padding: "10px 20px", width: "100%" }}
        >
          <div
            style={{
              color: "#C96B0F",
              fontSize: "10px",
              fontWeight: 900,
              fontStyle: "italic",
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              textShadow: "1px 1px 0 #000",
              marginBottom: "8px",
              borderBottom: "1px solid rgba(201,107,15,0.3)",
              paddingBottom: "4px",
            }}
          >
            Steuerung
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "5px 28px",
            }}
          >
            {[
              ["WASD", "Bewegen"],
              ["MAUS", "Umsehen"],
              ["LINKSKLICK", "Rakete feuern"],
              ["SHIFT", "Sprinten"],
              ["LEERTASTE", "Springen"],
              ["R", "Nachladen"],
              ["ESC", "Entsperren"],
            ].map(([key, action]) => (
              <div
                key={key}
                style={{ display: "flex", gap: "8px", alignItems: "center" }}
              >
                <span
                  style={{
                    color: "#FFD040",
                    fontWeight: 900,
                    fontStyle: "italic",
                    fontSize: "11px",
                    background: "rgba(0,0,0,0.7)",
                    border: "2px solid #6A3000",
                    borderBottom: "3px solid #000",
                    padding: "1px 7px",
                    minWidth: "68px",
                    textAlign: "center",
                    textShadow: "1px 1px 0 #000",
                    boxShadow: "2px 2px 0 #000",
                  }}
                >
                  {key}
                </span>
                <span
                  style={{
                    color: "#9A7A55",
                    fontSize: "11px",
                    fontWeight: 700,
                  }}
                >
                  {action}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── PLAY BUTTON ── */}
        <button
          type="button"
          className="btn-borderlands"
          onClick={startGame}
          style={{
            fontSize: "2rem",
            padding: "0.9rem 4.5rem",
            marginTop: "2px",
          }}
        >
          🚀 SPIELEN
        </button>

        {/* ── Leaderboard ── */}
        <div style={{ width: "100%" }} className="hud-panel">
          <div
            style={{
              padding: "8px 14px 0",
              color: "#E87A1D",
              fontSize: "11px",
              fontWeight: 900,
              fontStyle: "italic",
              letterSpacing: "0.25em",
              textTransform: "uppercase",
              textShadow: "2px 2px 0 #000",
              borderBottom: "1px solid rgba(201,107,15,0.35)",
              paddingBottom: "6px",
              marginBottom: "6px",
            }}
          >
            🏆 Bestenliste
          </div>

          <div style={{ padding: "0 8px 8px" }}>
            {isLoading ? (
              <div
                style={{
                  textAlign: "center",
                  color: "#5A3A20",
                  fontSize: "13px",
                  padding: "8px",
                }}
              >
                Laden...
              </div>
            ) : scores.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  color: "#5A3A20",
                  fontSize: "13px",
                  padding: "8px",
                }}
              >
                Noch keine Einträge. Sei der Erste!
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "2px",
                  maxHeight: "180px",
                  overflowY: "auto",
                }}
              >
                {scores.map((entry, i) => {
                  const medalColor =
                    i === 0
                      ? "#FFD700"
                      : i === 1
                        ? "#C0C0C0"
                        : i === 2
                          ? "#CD7F32"
                          : "#5A4030";
                  return (
                    <div
                      key={`${entry.playerName}-${i}`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        padding: "4px 10px",
                        background:
                          i === 0
                            ? "rgba(255,215,0,0.07)"
                            : i % 2 === 0
                              ? "rgba(255,255,255,0.025)"
                              : "transparent",
                        border:
                          i === 0
                            ? "1px solid rgba(255,215,0,0.2)"
                            : "1px solid transparent",
                        gap: "10px",
                      }}
                    >
                      <span
                        style={{
                          color: medalColor,
                          fontWeight: 900,
                          fontStyle: "italic",
                          fontSize: "13px",
                          minWidth: "28px",
                          textShadow: i < 3 ? "1px 1px 0 #000" : "none",
                        }}
                      >
                        #{i + 1}
                      </span>
                      <span
                        style={{
                          color: "#C8A070",
                          fontWeight: 700,
                          fontSize: "13px",
                          flex: 1,
                        }}
                      >
                        {entry.playerName}
                      </span>
                      <span
                        style={{
                          color: "#FF8C00",
                          fontWeight: 900,
                          fontStyle: "italic",
                          fontSize: "13px",
                        }}
                      >
                        {Number(entry.score).toLocaleString()}
                      </span>
                      <span
                        style={{
                          color: "#5A4030",
                          fontSize: "11px",
                          minWidth: "40px",
                          textAlign: "right",
                        }}
                      >
                        {formatTime(entry.timeInSeconds)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
