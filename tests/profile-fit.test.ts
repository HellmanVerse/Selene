import { test } from "node:test";
import assert from "node:assert/strict";
import { alignProfile, compareProfiles, metrics, rank } from "../lib/terrain";
import {
  weightAnalogs,
  defaultAnalogWeights,
  targetEvidence,
} from "../lib/analog";
test("close-profile requirement allows datum offsets but rejects different amplitudes and opposite shapes", () => {
  const target = [0, 100, 400, 800, 400, 100, 0];
  assert.ok(
    compareProfiles(
      target,
      target.map((v) => v + 5000),
    ).passes,
  );
  assert.ok(
    compareProfiles(
      target,
      target.map((v) => v * 1.1 + 5000),
    ).passes,
  );
  assert.ok(
    !compareProfiles(
      target,
      target.map((v) => v * 0.1),
    ).passes,
  );
  assert.ok(
    !compareProfiles(
      target,
      target.map((v) => -v),
    ).passes,
  );
  assert.ok(
    !compareProfiles(
      target,
      target.map(() => 0),
    ).passes,
  );
  assert.throws(() => compareProfiles(target, [0, 1, 2]));
});
test("flat profiles use absolute tolerances and alignment retains correct score at zero shift", () => {
  assert.ok(compareProfiles([0, 0, 0], [5000, 5000, 5000]).passes);
  assert.ok(!compareProfiles([0, 0, 0], [0, 1000, 0]).passes);
  const flat = alignProfile([0, 0, 0], [0, 0, 0, 0, 0, 0, 0], true);
  assert.equal(flat.eastShiftKm, 0);
  assert.equal(flat.similarity, 100);
  const target = [0, 100, 400, 800, 400, 100, 0];
  const wider = [900, 800, 700, 600, 500, 400, 300, ...target, 500, 600, 700];
  const aligned = alignProfile(target, wider, true);
  assert.deepEqual(aligned.profile, target);
  assert.ok(aligned.fit.passes);
  assert.equal(aligned.similarity, 100);
});
test("condition priorities cannot rescue a profile rejected by the requirement", () => {
  const target = metrics(
    [
      [0, 100, 0],
      [0, 100, 0],
      [0, 100, 0],
    ],
    10000,
  );
  const candidates = [
    {
      name: "Mauna Kea",
      catalog: true,
      lat: 0,
      lon: 0,
      resolution: 10000,
      metrics: { "50": { ...target, profile: [0, 10000, 0] } },
    },
    {
      name: "Matching Earth",
      catalog: false,
      lat: 0,
      lon: 0,
      resolution: 10000,
      metrics: { "50": target },
    },
  ];
  const screened = rank(
    target,
    candidates,
    50,
    { slope: 40, relief: 25, roughness: 25, std: 10 },
    true,
  );
  const qualified = screened.filter((c) => c.profileFit?.passes);
  const results = weightAnalogs(qualified, targetEvidence("moon", 0, 0), {
    ...defaultAnalogWeights,
    geology: 100,
  });
  assert.deepEqual(
    results.map((c) => c.name),
    ["Matching Earth"],
  );
});
