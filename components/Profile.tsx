export default function Profile({
  values,
  other,
  large = false,
}: {
  values: number[];
  other?: number[];
  large?: boolean;
}) {
  const all = [...values, ...(other ?? [])],
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
          <linearGradient id="profile-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#d1ff72" stopOpacity=".22" />
            <stop offset="100%" stopColor="#d1ff72" stopOpacity="0" />
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
          d={`${path(values)} L600,160 L0,160 Z`}
          fill="url(#profile-fill)"
        />
        <path d={path(values)} fill="none" stroke="#d1ff72" strokeWidth="1.7" />
        {other && (
          <path
            d={path(other)}
            fill="none"
            stroke="#8ba3c4"
            strokeWidth="1.5"
          />
        )}
      </svg>
      <div className="profile-axis mono">
        <span>W · {Math.round(min).toLocaleString()} m</span>
        <span>Elevation relative to each body’s datum</span>
        <span>E · {Math.round(max).toLocaleString()} m</span>
      </div>
    </div>
  );
}
