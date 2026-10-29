import type { Metrics, Weights, Candidate, Match } from "./types";
export const MOON_RADIUS = 1737400;
export const NATIVE_SPACING = (Math.PI * MOON_RADIUS) / 180 / 16;
export function coordinates(lat: number, lon: number) {
  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lon) ||
    lat < -90 ||
    lat > 90 ||
    lon < -180 ||
    lon > 360
  )
    throw new Error("Enter latitude −90…90 and longitude −180…360.");
  return { lat, lon: ((((lon + 180) % 360) + 360) % 360) - 180 };
}
export function destination(
  lat: number,
  lon: number,
  east: number,
  north: number,
  radius = MOON_RADIUS,
) {
  lon = ((((lon + 180) % 360) + 360) % 360) - 180;
  const p = (lat * Math.PI) / 180,
    b = Math.atan2(east, north),
    d = Math.hypot(east, north) / radius;
  const la = Math.asin(
    Math.max(
      -1,
      Math.min(
        1,
        Math.sin(p) * Math.cos(d) + Math.cos(p) * Math.sin(d) * Math.cos(b),
      ),
    ),
  );
  const lo =
    (lon * Math.PI) / 180 +
    Math.atan2(
      Math.sin(b) * Math.sin(d) * Math.cos(p),
      Math.cos(d) - Math.sin(p) * Math.sin(la),
    );
  return {
    lat: (la * 180) / Math.PI,
    lon: ((((lo * 180) / Math.PI) % 360) + 360) % 360,
  };
}
export function metrics(z: number[][], spacing: number): Metrics {
  if (
    !(spacing > 0) ||
    z.length < 3 ||
    z.some((row) => row.length !== z[0].length)
  )
    throw new Error("Invalid raster or spacing.");
  const values = z.flat();
  if (values.some((v) => !Number.isFinite(v)))
    throw new Error("Raster contains missing data; metrics unavailable.");
  const rows = z.length,
    cols = z[0].length,
    n = values.length,
    mean = values.reduce((a, b) => a + b, 0) / n;
  let sxz = 0,
    syz = 0,
    sxx = 0,
    syy = 0;
  z.forEach((row, y) =>
    row.forEach((v, x) => {
      const dx = x - (cols - 1) / 2,
        dy = y - (rows - 1) / 2;
      sxz += dx * (v - mean);
      syz += dy * (v - mean);
      sxx += dx * dx;
      syy += dy * dy;
    }),
  );
  const ax = sxz / sxx,
    ay = syz / syy;
  let residual = 0,
    tri = 0,
    tn = 0;
  const slopes: number[] = [],
    histogram = [0, 0, 0, 0, 0, 0];
  z.forEach((row, y) =>
    row.forEach((v, x) => {
      const gx =
        (row[Math.min(cols - 1, x + 1)] - row[Math.max(0, x - 1)]) /
        (spacing * (x === 0 || x === cols - 1 ? 1 : 2));
      const gy =
        (z[Math.min(rows - 1, y + 1)][x] - z[Math.max(0, y - 1)][x]) /
        (spacing * (y === 0 || y === rows - 1 ? 1 : 2));
      const slope = (Math.atan(Math.hypot(gx, gy)) * 180) / Math.PI;
      slopes.push(slope);
      const bin = [1, 2, 5, 10, 20, Infinity].findIndex(
        (limit) => slope < limit,
      );
      histogram[bin]++;
      residual +=
        (v - (mean + ax * (x - (cols - 1) / 2) + ay * (y - (rows - 1) / 2))) **
        2;
      if (y > 0 && x > 0 && y < rows - 1 && x < cols - 1) {
        let sum = 0;
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++)
            if (dx || dy) sum += (z[y + dy][x + dx] - v) ** 2;
        tri += Math.sqrt(sum / 8);
        tn++;
      }
    }),
  );
  const sorted = values.toSorted((a, b) => a - b),
    min = sorted[0],
    max = sorted[n - 1];
  return {
    min,
    max,
    mean,
    median:
      n % 2
        ? sorted[Math.floor(n / 2)]
        : (sorted[n / 2 - 1] + sorted[n / 2]) / 2,
    std: Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / n),
    relief: max - min,
    slope: slopes.reduce((a, b) => a + b, 0) / n,
    maxSlope: Math.max(...slopes),
    roughness: Math.sqrt(residual / n),
    ruggedness: tri / tn,
    histogram,
    profile: z[Math.floor(rows / 2)],
  };
}
export function rank(
  target: Metrics,
  candidates: Candidate[],
  radius: number,
  weights: Weights,
): Match[] {
  const keys = ["slope", "relief", "roughness", "std"] as const;
  const sum = keys.reduce((s, k) => s + weights[k], 0);
  if (!sum || keys.some((k) => !Number.isFinite(weights[k]) || weights[k] < 0))
    throw new Error("At least one positive mission weight is required.");
  const scales = { slope: 3, relief: 3000, roughness: 600, std: 1000 };
  return candidates
    .map((c) => {
      const m = c.metrics[String(radius)],
        similarity = {} as Weights,
        differences = {} as Weights;
      keys.forEach((k) => {
        differences[k] = m[k] - target[k];
        similarity[k] = Math.exp(-Math.abs(differences[k]) / scales[k]) * 100;
      });
      return {
        ...c,
        similarity,
        differences,
        score: keys.reduce((s, k) => s + (similarity[k] * weights[k]) / sum, 0),
      };
    })
    .sort((a, b) => b.score - a.score);
}
