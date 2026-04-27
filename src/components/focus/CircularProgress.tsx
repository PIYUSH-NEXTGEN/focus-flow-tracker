interface Props {
  /** 0..1 (timer mode). For stopwatch pass null for indeterminate ring. */
  progress: number | null;
  /** Centered display text (HH:MM:SS) */
  display: string;
  /** Subtitle below the time */
  subtitle?: string;
  /** Subtle paused state */
  paused?: boolean;
  size?: number;
}

export function CircularProgress({ progress, display, subtitle, paused, size = 320 }: Props) {
  const stroke = 6;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = progress === null ? 0 : Math.max(0, Math.min(1, progress));
  const dash = circumference * clamped;

  return (
    <div
      className="relative grid place-items-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--border))"
          strokeWidth={stroke}
        />
        {progress !== null ? (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="hsl(var(--foreground))"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference - dash}`}
            style={{ transition: "stroke-dasharray 250ms linear" }}
          />
        ) : (
          // Stopwatch: a small rotating arc
          <g className="origin-center" style={{ transformOrigin: "center", animation: "fm-spin 4s linear infinite" }}>
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="hsl(var(--foreground))"
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={`${circumference * 0.18} ${circumference}`}
            />
          </g>
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className={`font-mono-num text-5xl md:text-6xl font-semibold ${paused ? "opacity-50" : ""}`}>
          {display}
        </div>
        {subtitle && (
          <div className="mt-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            {subtitle}
          </div>
        )}
      </div>
      <style>{`@keyframes fm-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
