import assert from "node:assert/strict";
const origin = process.argv[2] ?? "http://localhost:3000";
const weights = { slope: 40, relief: 25, roughness: 25, std: 10 };
const cases = [
  { lat: -43.31, lon: -11.36, radius: 100, weights },
  { lat: -89.54, lon: 0, radius: 50, weights },
  { lat: 0, lon: 23.47, radius: 150, weights },
  { lat: -20.4, lon: 129.1, radius: 100, weights },
  { lat: 90, lon: 360, radius: 50, weights },
];
for (const body of cases) {
  const response = await fetch(origin + "/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  assert.equal(response.status, 200);
  const a = await response.json();
  assert.equal(a.candidateCount, 632);
  assert.equal(a.coverage, 100);
  assert.equal(a.source.product, "LDEM_16");
  assert.ok(
    a.candidates.every(
      (c, i) => i === 0 || c.score <= a.candidates[i - 1].score,
    ),
  );
  assert.ok(a.grid.flat().every(Number.isFinite));
  assert.ok(a.limitations.length >= 6);
  console.log(
    `PASS ${body.lat}, ${body.lon}; radius ${body.radius}; ${a.candidates[0].name}; score ${a.candidates[0].score.toFixed(2)}`,
  );
}
for (const body of [
  { lat: 91, lon: 0, radius: 50, weights },
  { lat: 0, lon: 0, radius: 1, weights },
  {
    lat: 0,
    lon: 0,
    radius: 50,
    weights: { slope: 0, relief: 0, roughness: 0, std: 0 },
  },
]) {
  const response = await fetch(origin + "/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  assert.equal(response.status, 400);
}
console.log(
  "PASS invalid-coordinate, invalid-radius and zero-weight request handling",
);
