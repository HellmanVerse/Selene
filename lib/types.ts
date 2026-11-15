YªçŠx-®éÜj×¢ëiºÚ+Š§j[h‘éÜ¢éíã~¢Ö¥¢ëiºÙbë5import type { AnalogWeights, FactorResult, SiteEvidence } from "./analog";
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
 Û~-¢G§²ÚîÆ­yİber;
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

