import { useGameStore } from "@/store/useGameStore";

export function VictoryScreen() {
  const { score, timeElapsed, resetGame } = useGameStore();

  function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }

  const grade =
    score >= 50000
      ? "S++"
      : score >= 30000
        ? "S"
        : score >= 20000
          ? "A"
          : score >= 10000
            ? "B"
            : "C";

  return (
    <div
      className="absolute inset-0 z-30 flex items-center justify-center scanlines"
      style={{
        background:
          "radial-gradient(ellipse at 50% 35%, rgba(100,40,0,0.94) 0%, rgba(4,2,0,0.98) 65%)",
      }}
    >
      <div className="flex flex-col items-center w-full max-w-2xl px-8 gap-5 text-center">
        {/* ── Victory Title ── */}
        <div style={{ position: "relative" }}>
          <div
            style={{
              color: "#7A4010",
              fontSize: "11px",
              fontWeight: 900,
              fontStyle: "italic",
              letterSpacing: "0.45em",
              textTransform: "uppercase",
              marginBottom: "6px",
              textShadow: "1px 1px 0 #000",
            }}
          >
            ★ MISSION ERFÜLLT ★
          </div>
          <h1
            className="victory-title hud-title"
            style={{
              fontSize: "clamp(2.8rem, 8vw, 4.5rem)",
              color: "#E8720E",
              lineHeight: 0.88,
              display: "block",
            }}
          >
            DESTRUCTION
          </h1>
          <h1
            className="victory-title hud-title"
            style={{
              fontSize: "clamp(2.8rem, 8vw, 4.5rem)",
              color: "#FFD020",
              lineHeight: 0.88,
              display: "block",
              marginLeft: "clamp(8px,2vw,32px)",
            }}
          >
            COMPLETE!
          </h1>
          <div
            style={{
              marginTop: "8px",
              height: "4px",
              background:
                "linear-gradient(90deg,transparent,#C96B0F 15%,#FFD020 50%,#C96B0F 85%,transparent)",
              borderRadius: "2px",
            }}
          />
        </div>

        {/* ── Stats grid ── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "8px",
            width: "100%",
          }}
        >
          {[
            {
              label: "FINAL SCORE",
              value: score.toLocaleString(),
              color: "#FFD700",
            },
            { label: "ZEIT", value: formatTime(timeElapsed), color: "#FF8C00" },
            { label: "ZERSTÖRT", value: "10/10", color: "#FF4400" },
            { label: "BEWERTUNG", value: grade, color: "#FFD020" },
          ].map(({ label, value, color }) => (
            <div
              key={label}
              className="hud-panel"
              style={{ padding: "10px 14px" }}
            >
              <div
                style={{
                  color: "#C96B0F",
                  fontSize: "10px",
                  fontWeight: 900,
                  fontStyle: "italic",
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  marginBottom: "4px",
                  textShadow: "1px 1px 0 #000",
                }}
              >
                {label}
              </div>
              <div
                className="hud-number"
                style={{
                  color,
                  fontSize: "2rem",
                  fontWeight: 900,
                  fontStyle: "italic",
                }}
              >
                {value}
              </div>
            </div>
          ))}
        </div>

        {/* ── Reset World ── */}
        <button
          type="button"
          data-ocid="victory.reset_button"
          className="btn-borderlands"
          onClick={resetGame}
          style={{ fontSize: "1.5rem" }}
        >
          🔄 WELT ZURÜCKSETZEN
        </button>
      </div>
    </div>
  );
}
