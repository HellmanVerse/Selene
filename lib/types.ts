import type { AnalogWeights, FactorResult, SiteEvidence } from "./analog";
export type Metrics = {
  min: number;
  max: number;
  mean: number;
  median: number;
  std: number;
  relief: number;
  slope: number;
  maxSlope: number;
  roughness: number;
  ruggedness: number;
  histogram: number[];
  profile: number[];
};
export type Weights = {
  slope: number;
  relief: number;
  roughness: number;
  std: number;
};
export type Candidate = {
  name: string;
  lat: number;
  lon: number;
  catalog: boolean;
  resolution: number;
  metrics: Record<string, Metrics>;
};
export type Match = Candidate & {
  profileFit?: {
    passes: boolean;
    rmseM: number;
    maxErrorM: number;
    normalizedRmse: number;
    correlation: number | null;
    amplitudeRatio: number | null;
  };
  terrainScore?: number;
  analog?: { factors: FactorResult[]; coverage: number; earth?: SiteEvidence };
  score: number;
  similarity: Weights;
  differences: Weights;
  profileSimilarity: number;
  alignedProfile: number[];
  eastShiftKm: number;
};
export type Analysis = {
  closestProfile?: Match;
  profileRequirement?: {
    required: boolean;
    qualifiedCount: number;
    screenedCount: number;
    bestRmseM: number;
    limits: Record<string, number>;
  };
  analogWeights?: AnalogWeights;
  targetEvidence?: SiteEvidence;
  body: "moon" | "mars";
  lat: number;
  lon: number;
  radius: number;
  metrics: Metrics;
  comparison: Metrics;
  candidates: Match[];
  candidateCount: number;
  source: Record<string, unknown>;
  coverage: number;
  grid: number[][];
  spacing: number;
  limitations: string[];
  created: string;
  weights: Weights;
  version: string;
};
