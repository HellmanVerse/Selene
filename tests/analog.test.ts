import { test } from "node:test";
import assert from "node:assert/strict";
import {
  defaultAnalogWeights,
  targetEvidence,
  validateAnalogWeights,
  weightAnalogs,
} from "../lib/analog";
import { metrics, rank } from "../lib/terrain";
import type { Candidate } from "../lib/types";
const base = metrics(
  [
    [0, 1, 0],
    [0, 1, 0],
    [0, 1, 0],
  ],
  10000,
);
const candidates: Candidate[] = [
  "Mauna Kea",
  "Atacama Desert",
  "Global unknown",
].map((name) => ({
  name,
  lat: 0,
  lon: 0,
  catalog: name !== "Global unknown",
  resolution: 10000,
  metrics: { "50": base },
}));
const ranked = () =>
  rank(base, candidates, 50, { slope: 40, relief: 25, roughness: 25, std: 10 });
const only = (key: keyof typeof defaultAnalogWeights) =>
  Object.fromEntries(
    Object.keys(defaultAnalogWeights).map((k) => [k, k === key ? 100 : 0]),
  ) as typeof defaultAnalogWeights;
test("geology priority rewards documented volcanic process while biology rewards preservation context", () => {
  const volcanic = weightAnalogs(
    ranked(),
    targetEvidence("mars", 18.65, -133.8),
    only("geology"),
  );
  assert.equal(volcanic[0].name, "Mauna Kea");
  assert.equal(volcanic[0].score, 100);
  const biosignatures = weightAnalogs(
    ranked(),
    targetEvidence("mars", 18.44, 77.45),
    only("biology"),
  );
  assert.equal(biosignatures[0].name, "Atacama Desert");
  assert.equal(biosignatures[0].score, 100);
});
test("missing evidence earns no credit, reports coverage, and is never filled from latitude", () => {
  const target = targetEvidence("mars", 0, 0);
  assert.deepEqual(target.factors, {});
  const a = weightAnalogs(ranked(), target, defaultAnalogWeights);
  assert.equal(a[0].score, 60);
  assert.equal(a[0].analog?.coverage, 60);
  const b = weightAnalogs(
    ranked(),
    targetEvidence("mars", -8.35, -120.1),
    only("subsurface"),
  );
  assert.ok(b.every((c) => c.score === 60 && c.analog?.coverage === 60));
});
test("shape share stays fixed and inputs reject invalid weights", () => {
  const a = ranked();
  const b = weightAnalogs(
    a,
    targetEvidence("mars", 18.44, 77.45),
    only("terrain"),
  );
  assert.deepEqual(
    a.map((c) => [c.name, c.profileSimilarity * 0.6]),
    b.map((c) => [c.name, c.score]),
  );
  for (const value of [
    null,
    {},
    [],
    { ...defaultAnalogWeights, geology: -1 },
    { ...defaultAnalogWeights, water: NaN },
    { ...defaultAnalogWeights, terrain: 101 },
  ])
    assert.throws(() => validateAnalogWeights(value));
  assert.deepEqual(
    validateAnalogWeights(defaultAnalogWeights),
    defaultAnalogWeights,
  );
  assert.equal(validateAnalogWeights(only("geology")).terrain, 60);
});
test("shape is exactly 60 percent and other priorities only divide the remaining 40 percent", () => {
  const matches = ranked().map((c) => ({
    ...c,
    score: 100,
    profileSimilarity: 20,
  }));
  const target = targetEvidence("mars", 18.65, -133.8);
  const a = weightAnalogs(matches, target, only("geology"));
  assert.equal(a[0].name, "Mauna Kea");
  assert.equal(a[0].score, 52);
  assert.equal(
    a[0].analog?.factors.find((f) => f.key === "terrain")?.contribution,
    12,
  );
  assert.equal(
    a[0].analog?.factors.find((f) => f.key === "geology")?.contribution,
    40,
  );
  const zeros = Object.fromEntries(
    Object.keys(defaultAnalogWeights).map((k) => [k, 0]),
  ) as typeof defaultAnalogWeights;
  assert.ok(weightAnalogs(matches, target, zeros).every((c) => c.score === 12));
});
test("Mars evidence normalizes longitudes and does not assign skylights to arbitrary coordinates", () => {
  assert.equal(targetEvidence("mars", 18.65, 226.2).name, "Olympus Mons");
  assert.equal(targetEvidence("mars", 0, -120).factors.subsurface, undefined);
});
