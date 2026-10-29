import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { extract } from "@/lib/lola";
import { coordinates, metrics, rank } from "@/lib/terrain";
import type { Candidate, Weights } from "@/lib/types";
export const runtime = "nodejs";
export const maxDuration = 60;
const candidateData = readFile(
  process.cwd() + "/data/earth-candidates.json",
  "utf-8",
).then((v) => JSON.parse(v) as Candidate[]);
const metadata = readFile(
  process.cwd() + "/data/lola-metadata.json",
  "utf-8",
).then(JSON.parse);
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (typeof body.lat !== "number" || typeof body.lon !== "number")
      throw new Error("Coordinates must be numeric.");
    const { lat, lon } = coordinates(body.lat, body.lon),
      radius = Number(body.radius);
    if (![50, 100, 150].includes(radius))
      throw new Error("Choose a 50, 100, or 150 km region radius.");
    const weights: Weights = body.weights ?? {
      slope: 40,
      relief: 25,
      roughness: 25,
      std: 10,
    };
    const [native, coarse, candidates, source] = await Promise.all([
      extract(lat, lon, radius),
      extract(lat, lon, radius, 10000),
      candidateData,
      metadata,
    ]);
    const measured = metrics(native.grid, native.spacing),
      comparison = metrics(coarse.grid, 10000);
    const matches = rank(comparison, candidates, radius, weights).slice(0, 12);
    // Downsample the display mesh only; metrics use the full native extraction.
    const step = Math.max(1, Math.floor(native.grid.length / 51));
    const grid = native.grid
      .filter((_, i) => i % step === 0)
      .map((row) => row.filter((_, i) => i % step === 0));
    return NextResponse.json({
      lat,
      lon,
      radius,
      weights,
      metrics: measured,
      comparison,
      candidates: matches,
      candidateCount: candidates.length,
      source,
      coverage: 100,
      grid,
      spacing: native.spacing,
      created: new Date().toISOString(),
      version: "0.1.0",
      limitations: [
        "LOLA LDEM_16 is an interpolated 2019 global product. Grid coverage is not laser-shot coverage. Nominal north–south spacing is 1.895 km; east–west spacing contracts with latitude.",
        "Polar regions are sampled on a local spherical grid; nearest-neighbor values are retained. Coarse interpolated relief cannot resolve boulders, landing hazards, pits or traversable paths.",
        "Rankings compare both bodies at 10 km sample spacing in square windows of equal physical extent. Earth zoom-4 tiles have latitude-dependent native spacing up to 9.8 km; resampling does not add detail.",
        "Earth screening uses a 5-degree land lattice from 65°S to 80°N plus reference sites. This is a broad but incomplete search. Coastal windows can include water.",
        "Scores are deterministic topographic similarity indices, not probabilities or mission suitability. Environmental, material, geology, thermal and illumination similarity are unmeasured.",
        "Source vertical uncertainty and per-window interpolation uncertainty are not quantified. Product boundary artifacts may occur at 45-degree latitude bands.",
        "SLDEM2015, NAC DTMs, Diviner and M³ are reference sources, not active measurement layers in this deployment. No high-resolution coverage is inferred from a place name.",
      ],
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Analysis failed";
    const bad = /Enter|Choose|Coordinates|weight|JSON/.test(msg);
    return NextResponse.json(
      {
        error: bad
          ? msg
          : "The measured terrain service is unavailable. Please try again.",
      },
      { status: bad ? 400 : 503 },
    );
  }
}
