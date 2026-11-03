import { useId } from "react";
export default function Profile({
  values,
  other,
  large = false,
  mars = false,
}: {
  values: number[];
  other?: number[];
  large?: boolean;
  mars?: boolean;
}) {
  const gradientId = useId(),
    color = mars ? "#c96b4b" : "#d1ff72";
  const relative = (v: number[]) => {
      if (!other) return v;
      const mean = v.reduce((sum, z) => sum + z, 0) / v.length;
      return v.map((z) => z - mean);
    },
    primary = relative(values),
    secondary = other ? relative(other) : undefined,
    all = [...primary, ...(secondary ?? [])],
    min = Math.min(...all),
    max = Math.max(...all),
    range = Math.max(1, max - min);
  const path = (v: number[]) =>
    v
      .map(
        (z, i) =>
          `${i ? "L" : "M"}${(i / (v.length - 1)) * 600},${140 - ((z - min) / range) * 115}`,
      )
      .join(" ");
  return (
    <div className={`profile ${large ? "large" : ""}`}>
      <svg
        viewBox="0 0 600 160"
        role="img"
        aria-label="West to east elevation profile in meters"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity=".22" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[25, 63, 101, 140].map((y) => (
          <line
            key={y}
            x1="0"
            x2="600"
            y1={y}
            y2={y}
            stroke="#262626"
            strokeDasharray="3 6"
          />
        ))}
        <path
          d={`${path(primary)} L600,160 L0,160 Z`}
          fill={`url(#${gradientId})`}
        />
        <path d={path(primary)} fill="none" stroke={color} strokeWidth="1.7" />
        {secondary && (
          <path
            d={path(secondary)}
            fill="none"
            stroke="#8ba3c4"
            strokeWidth="1.5"
          />
        )}
      </svg>
      <div className="profile-axis mono">
        <span>W · {Math.round(min).toLocaleString()} m</span>
        <span>
          {other
            ? "Elevation relative to each profile mean"
            : "Elevation relative to datum"}
        </span>
        <span>E · {Math.round(max).toLocaleString()} m</span>
      </div>
    </div>
  );
}
