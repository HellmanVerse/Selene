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
  score: number;
  similarity: Weights;
  differences: Weights;
};
export type Analysis = {
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
