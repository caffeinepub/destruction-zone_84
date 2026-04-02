export function Crosshair() {
  return (
    <div className="crosshair pointer-events-none z-10">
      <svg
        width="32"
        height="32"
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden="true"
        role="img"
      >
        {/* Outer ring */}
        <circle
          cx="16"
          cy="16"
          r="10"
          stroke="#000"
          strokeWidth="4"
          fill="none"
          opacity="0.5"
        />
        <circle
          cx="16"
          cy="16"
          r="10"
          stroke="#FF8C00"
          strokeWidth="2"
          fill="none"
        />
        {/* Center dot */}
        <circle cx="16" cy="16" r="2" fill="#000" />
        <circle cx="16" cy="16" r="1.5" fill="#FFD700" />
        {/* Cross lines */}
        <line x1="16" y1="4" x2="16" y2="10" stroke="#000" strokeWidth="3" />
        <line
          x1="16"
          y1="4"
          x2="16"
          y2="10"
          stroke="#FF8C00"
          strokeWidth="1.5"
        />
        <line x1="16" y1="22" x2="16" y2="28" stroke="#000" strokeWidth="3" />
        <line
          x1="16"
          y1="22"
          x2="16"
          y2="28"
          stroke="#FF8C00"
          strokeWidth="1.5"
        />
        <line x1="4" y1="16" x2="10" y2="16" stroke="#000" strokeWidth="3" />
        <line
          x1="4"
          y1="16"
          x2="10"
          y2="16"
          stroke="#FF8C00"
          strokeWidth="1.5"
        />
        <line x1="22" y1="16" x2="28" y2="16" stroke="#000" strokeWidth="3" />
        <line
          x1="22"
          y1="16"
          x2="28"
          y2="16"
          stroke="#FF8C00"
          strokeWidth="1.5"
        />
      </svg>
    </div>
  );
}
