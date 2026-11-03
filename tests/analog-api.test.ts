import { test } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { POST } from "../app/api/analyze/route";
import { defaultAnalogWeights } from "../lib/analog";
test("Mars API exposes regional evidence, weights and contributions and reranks the complete candidate pool", async () => {
  const weights = Object.fromEntries(
    Object.keys(defaultAnalogWeights).map((k) => [
      k,
      k === "geology" ? 100 : 0,
    ]),
  );
  const response = await POST(
    new NextRequest("http://localhost/api/analyze", {
      method: "POST",
      body: JSON.stringify({
        body: "mars",
        lat: 18.65,
        lon: -133.8,
        radius: 50,
        analogWeights: weights,
      }),
    }),
  );
  assert.equal(response.status, 200);
  const a = await response.json();
  assert.equal(a.targetEvidence.name, "Olympus Mons");
  assert.equal(a.analogWeights.geology, 100);
  assert.ok(a.candidates[0].analog.earth);
  assert.equal(a.analogWeights.terrain, 70);
  assert.equal(
    a.candidates[0].score,
    0.7 * a.candidates[0].profileSimilarity + 30,
  );
  assert.ok(a.candidates.some((c: { name: string }) => c.name === "Mauna Kea"));
  const top = a.candidates[0];
  assert.equal(
    top.score,
    top.analog.factors.reduce(
      (s: number, f: { contribution: number }) => s + f.contribution,
      0,
    ),
  );
  const bad = await POST(
    new NextRequest("http://localhost/api/analyze", {
      method: "POST",
      body: JSON.stringify({
        body: "mars",
        lat: 0,
        lon: 0,
        radius: 50,
        analogWeights: { ...weights, geology: -1 },
      }),
    }),
  );
  assert.equal(bad.status, 400);
  const moon = await POST(
    new NextRequest("http://localhost/api/analyze", {
      method: "POST",
      body: JSON.stringify({
        body: "moon",
        lat: 0,
        lon: 0,
        radius: 50,
        analogWeights: defaultAnalogWeights,
      }),
    }),
  );
  assert.equal(moon.status, 200);
  const lunar = await moon.json();
  assert.equal(lunar.analogWeights.terrain, 70);
  assert.equal(lunar.targetEvidence.factors.geology.scope, "planetary");
  assert.ok(lunar.candidates.every((c: { analog?: unknown }) => c.analog));
  assert.equal(lunar.profileRequirement.required, true);
  assert.equal(
    lunar.candidates.length,
    Math.min(12, lunar.profileRequirement.qualifiedCount),
  );
  assert.ok(
    lunar.candidates.every(
      (c: { profileFit: { passes: boolean } }) => c.profileFit.passes,
    ),
  );
});
test("Moon analysis returns a truthful empty result instead of falling back to a poor graph", async () => {
  const response = await POST(
    new NextRequest("http://localhost/api/analyze", {
      method: "POST",
      body: JSON.stringify({ body: "moon", lat: -87, lon: -11.36, radius: 50 }),
    }),
  );
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.ok(data.candidateCount > 0);
  assert.equal(data.profileRequirement.required, true);
  assert.equal(data.profileRequirement.qualifiedCount, 0);
  assert.deepEqual(data.candidates, []);
  assert.ok(data.closestProfile);
  assert.equal(data.closestProfile.profileFit.passes, false);
  assert.equal(
    data.closestProfile.profileFit.rmseM,
    data.profileRequirement.bestRmseM,
  );
  assert.ok(Number.isFinite(data.profileRequirement.bestRmseM));
});
