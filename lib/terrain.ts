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
  requireProfileFit = false,
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
      const alignment = alignProfile(
        target.profile,
        c.metrics["150"]?.profile ?? m.profile,
        requireProfileFit,
      );
      const aggregateScore = keys.reduce(
        (s, k) => s + (similarity[k] * weights[k]) / sum,
        0,
      );
      const shifted = destination(
        c.lat,
        c.lon,
        alignment.eastShiftKm * 1000,
        0,
        6371008.8,
      );
      return {
        ...c,
        lat: shifted.lat,
        lon: shifted.lon > 180 ? shifted.lon - 360 : shifted.lon,
        similarity,
        differences,
        profileSimilarity: alignment.similarity,
        alignedProfile: alignment.profile,
        eastShiftKm: alignment.eastShiftKm,
        profileFit: alignment.fit,
        // Balance regional statistics with the observed cross-section so a
        // visibly unrelated profile cannot rank highly merely because four
        // summary values happen to agree.
        score: aggregateScore * 0.5 + alignment.similarity * 0.5,
      };
    })
    .sort((a, b) => b.score - a.score);
}

function profileShapeSimilarity(a: number[], b: number[]) {
  const standardize = (values: number[]) => {
    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    const centered = values.map((v) => v - mean);
    const std = Math.sqrt(
      centered.reduce((s, v) => s + v * v, 0) / values.length,
    );
    return { centered, std };
  };
  const x = standardize(a),
    y = standardize(b);
  if (x.std < 1 && y.std < 1) return 100;
  if (x.std < 1 || y.std < 1) return 0;
  const rmse = Math.sqrt(
    x.centered.reduce(
      (s, v, i) => s + (v / x.std - y.centered[i] / y.std) ** 2,
      0,
    ) / a.length,
  );
  return Math.exp(-rmse / 0.75) * 100;
}

export function alignProfile(
  target: number[],
  wider: number[],
  requireFit = false,
) {
  if (target.length < 3 || wider.length < target.length)
    throw new Error("Profiles cannot be aligned.");
  const centeredStart = Math.floor((wider.length - target.length) / 2);
  // A shift of at most 50 km refines a coarse candidate without pretending
  // the 5-degree global screen is a high-resolution exhaustive search.
  const maxShiftSamples = Math.min(5, centeredStart);
  let best = {
    similarity: profileShapeSimilarity(
      target,
      wider.slice(centeredStart, centeredStart + target.length),
    ),
    profile: wider.slice(centeredStart, centeredStart + target.length),
    eastShiftKm: 0,
    fit: compareProfiles(
      target,
      wider.slice(centeredStart, centeredStart + target.length),
    ),
  };
  for (
    let start = centeredStart - maxShiftSamples;
    start <= centeredStart + maxShiftSamples;
    start++
  ) {
    const profile = wider.slice(start, start + target.length);
    const similarity = profileShapeSimilarity(target, profile);
    const fit = compareProfiles(target, profile);
    // Require physical elevation agreement, not only standardized shape.
    const better = requireFit
      ? (fit.passes && !best.fit.passes) ||
        (fit.passes === best.fit.passes &&
          (fit.rmseM < best.fit.rmseM ||
            (fit.rmseM === best.fit.rmseM &&
              Math.abs(start - centeredStart) * 10 <
                Math.abs(best.eastShiftKm))))
      : similarity > best.similarity ||
        (similarity === best.similarity &&
          Math.abs(start - centeredStart) * 10 < Math.abs(best.eastShiftKm));
    if (better)
      best = {
        similarity,
        profile,
        eastShiftKm: (start - centeredStart) * 10,
        fit,
      };
  }
  return best;
}

export const PROFILE_FIT_LIMITS = {
  minCorrelation: 0.9,
  minAmplitudeRatio: 0.75,
  maxAmplitudeRatio: 1.25,
  maxNormalizedRmse: 0.35,
  maxNormalizedError: 0.75,
  flatToleranceM: 25,
} as const;
export function compareProfiles(target: number[], other: number[]) {
  if (
    target.length < 3 ||
    target.length !== other.length ||
    [...target, ...other].some((v) => !Number.isFinite(v))
  )
    throw Error("Invalid comparison profiles.");
  const center = (v: number[]) => {
    const mean = v.reduce((s, z) => s + z, 0) / v.length;
    return v.map((z) => z - mean);
  };
  const a = center(target),
    b = center(other),
    n = a.length;
  const targetStd = Math.sqrt(a.reduce((s, z) => s + z * z, 0) / n),
    otherStd = Math.sqrt(b.reduce((s, z) => s + z * z, 0) / n);
  const errors = a.map((z, i) => z - b[i]);
  const rmseM = Math.sqrt(errors.reduce((s, z) => s + z * z, 0) / n),
    maxErrorM = Math.max(...errors.map(Math.abs));
  const correlation =
    targetStd > 0 && otherStd > 0
      ? Math.max(
          -1,
          Math.min(
            1,
            a.reduce((s, z, i) => s + z * b[i], 0) / n / targetStd / otherStd,
          ),
        )
      : null;
  const amplitudeRatio = targetStd > 0 ? otherStd / targetStd : null;
  const normalizedRmse =
    rmseM / Math.max(PROFILE_FIT_LIMITS.flatToleranceM, targetStd);
  const flat = targetStd < PROFILE_FIT_LIMITS.flatToleranceM;
  const passes = flat
    ? otherStd <= PROFILE_FIT_LIMITS.flatToleranceM &&
      rmseM <= PROFILE_FIT_LIMITS.flatToleranceM &&
      maxErrorM <= 2 * PROFILE_FIT_LIMITS.flatToleranceM
    : correlation !== null &&
      correlation >= PROFILE_FIT_LIMITS.minCorrelation &&
      amplitudeRatio !== null &&
      amplitudeRatio >= PROFILE_FIT_LIMITS.minAmplitudeRatio &&
      amplitudeRatio <= PROFILE_FIT_LIMITS.maxAmplitudeRatio &&
      normalizedRmse <= PROFILE_FIT_LIMITS.maxNormalizedRmse &&
      maxErrorM <= PROFILE_FIT_LIMITS.maxNormalizedError * targetStd;
  return {
    passes,
    rmseM,
    maxErrorM,
    normalizedRmse,
    correlation,
    amplitudeRatio,
  };
}
