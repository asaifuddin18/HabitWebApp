"use client";

export default function Ring({
  value,
  total,
  size = 150,
  stroke = 12,
  color = "#f97316",
  centerTop,
  centerBottom,
  caption,
}: {
  value: number;
  total: number;
  size?: number;
  stroke?: number;
  color?: string;
  /** big number in the middle (defaults to `value`) */
  centerTop?: React.ReactNode;
  /** small text under the big number */
  centerBottom?: React.ReactNode;
  /** label under the whole ring */
  caption?: React.ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = total > 0 ? Math.min(Math.max(value / total, 0), 1) : 0;
  const dash = c * pct;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            className="text-black/10 dark:text-white/10"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${c - dash}`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold tabular-nums">{centerTop ?? value}</span>
          {centerBottom && (
            <span className="text-sm text-black/55 dark:text-white/55">{centerBottom}</span>
          )}
        </div>
      </div>
      {caption && (
        <span className="mt-2 text-sm font-medium text-black/70 dark:text-white/70">{caption}</span>
      )}
    </div>
  );
}
