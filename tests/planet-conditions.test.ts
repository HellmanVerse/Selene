import { test } from "node:test";
import assert from "node:assert/strict";
import {
  targetEvidence,
  earthSiteEvidence,
  defaultAnalogWeights,
  weightAnalogs,
} from "../lib/analog";
import { metrics, rank } from "../lib/terrain";
test("both bodies have distinct sourced baselines and local geology overrides only its own factor", () => {
  const moon = targetEvidence("moon", 0, 0),
    mars = targetEvidence("mars", 0, 0),
    jezero = targetEvidence("mars", 18.44, 77.45);
  for (const body of [moon, mars])
    for (const key of [
      "geology",
      "temperature",
      "environment",
      "dust",
      "water",
      "illumination",
      "biology",
      "operations",
    ] as const) {
      assert.ok(body.factors[key]?.source.startsWith("https://"));
      assert.equal(body.factors[key]?.scope, "planetary");
    }
  assert.ok(moon.factors.geology?.traits.includes("anorthosite"));
  assert.ok(mars.factors.geology?.traits.includes("basalt"));
  assert.ok(moon.factors.environment?.traits.includes("near-vacuum"));
  assert.ok(mars.factors.environment?.traits.includes("thin-co2-atmosphere"));
  assert.ok(jezero.factors.geology?.traits.includes("carbonate"));
  assert.notEqual(jezero.factors.geology?.scope, "planetary");
  assert.ok(jezero.baselineFactors?.geology?.traits.includes("basalt"));
  assert.ok(
    targetEvidence("mars", 0, 0).factors.geology?.traits.includes("basalt"),
  );
  assert.equal(jezero.factors.temperature?.scope, "planetary");
});
test("Earth defaults do not invent local rock or climate and known atmospheric differences receive zero credit", () => {
  const m = metrics(
    [
      [0, 1, 0],
      [0, 1, 0],
      [0, 1, 0],
    ],
    10000,
  );
  const candidates = rank(
    m,
    [
      {
        name: "Unstudied Earth center",
        lat: 0,
        lon: 0,
        catalog: false,
        resolution: 10000,
        metrics: { "50": m },
      },
    ],
    50,
    { slope: 40, relief: 25, roughness: 25, std: 10 },
  );
  const earth = earthSiteEvidence(candidates[0]);
  assert.equal(earth?.factors.geology, undefined);
  assert.equal(earth?.factors.temperature, undefined);
  assert.equal(earth?.factors.environment?.scope, "planetary");
  for (const body of ["moon", "mars"] as const) {
    const result = weightAnalogs(
      candidates,
      targetEvidence(body, 0, 0),
      defaultAnalogWeights,
    )[0];
    assert.equal(
      result.analog?.factors.find((f) => f.key === "environment")?.score,
      0,
    );
    assert.equal(
      result.analog?.factors.find((f) => f.key === "geology")?.score,
      null,
    );
    assert.equal(
      result.analog?.factors.find((f) => f.key === "water")?.score,
      null,
    );
  }
});
