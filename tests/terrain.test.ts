import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { gunzipSync } from "node:zlib";
import {
  coordinates,
  destination,
  metrics,
  rank,
  NATIVE_SPACING,
} from "../lib/terrain";
import { extract } from "../lib/lola";
import type { Candidate } from "../lib/types";

test("east-positive longitudes normalize without changing the selected location", () => {
  assert.deepEqual(coordinates(0, 360), { lat: 0, lon: 0 });
  assert.equal(coordinates(-90, 270).lon, -90);
  for (const pair of [
    [91, 0],
    [0, 361],
    [NaN, 0],
    [0, Infinity],
  ])
    assert.throws(() => coordinates(...(pair as [number, number])));
});
test("local spherical extraction crosses poles and longitude seams continuously", () => {
  const p = destination(89.99, 179.99, 10000, 10000);
  assert.ok(p.lat < 90 && p.lat > 89);
  assert.ok(p.lon >= 0 && p.lon < 360);
  assert.equal(destination(0, 0, 0, 0).lat, 0);
  assert.ok(
    Math.abs(
      destination(0, 0, 0, 10000).lat - ((10000 / 1737400) * 180) / Math.PI,
    ) < 1e-10,
  );
});
test("known planar raster yields analytic slope and zero plane-residual roughness", () => {
  const z = Array.from({ length: 11 }, (_, y) =>
    Array.from({ length: 11 }, (_, x) => 100 + 2 * x + 3 * y),
  );
  const m = metrics(z, 10);
  assert.equal(m.min, 100);
  assert.equal(m.max, 150);
  assert.equal(m.mean, 125);
  assert.equal(m.median, 125);
  assert.ok(
    Math.abs(m.slope - (Math.atan(Math.sqrt(13) / 10) * 180) / Math.PI) < 1e-10,
  );
  assert.ok(m.roughness < 1e-10);
  assert.equal(
    m.histogram.reduce((a, b) => a + b, 0),
    121,
  );
});
test("metric slopes use actual meter spacing and reject unavailable pixels", () => {
  const z = [
    [0, 10, 20],
    [0, 10, 20],
    [0, 10, 20],
  ];
  assert.ok(metrics(z, 10).slope > metrics(z, 20).slope);
  assert.throws(
    () =>
      metrics(
        [
          [0, 1, 2],
          [0, NaN, 2],
          [0, 1, 2],
        ],
        10,
      ),
    /missing/,
  );
  assert.throws(() => metrics(z, 0));
});
test("published global NASA grid is fully present and raw extraction is correctly scaled", async () => {
  const meta = JSON.parse(await readFile("data/lola-metadata.json", "utf-8"));
  assert.equal(meta.validCells, 16588800);
  assert.equal(meta.validCells, meta.totalCells);
  let count = 0;
  for (let b = 0; b < 18; b++) {
    const buffer = gunzipSync(await readFile(`data/lola/${b}.bin.gz`));
    assert.equal(buffer.length, 160 * 5760 * 2);
    for (let i = 0; i < buffer.length; i += 2) {
      assert.notEqual(buffer.readInt16LE(i), -32768);
      count++;
    }
  }
  assert.equal(count, 16588800);
  const z = await extract(0, 0, 50);
  const band = gunzipSync(await readFile("data/lola/9.bin.gz"));
  assert.equal(
    z.grid[Math.floor(z.grid.length / 2)][Math.floor(z.grid.length / 2)],
    band.readInt16LE(0) * 0.5,
  );
  assert.ok(Math.abs(z.spacing - 1895.21) < 0.01);
});
test("polar, equatorial, near-side, far-side, seam and exact pole terrain are valid", async () => {
  for (const [lat, lon] of [
    [-89.54, 0],
    [0, 23.47],
    [9.62, -20.08],
    [-20.4, 129.1],
    [0, 180],
    [90, 0],
    [-90, 360],
  ]) {
    const native = await extract(lat, lon, 50),
      coarse = await extract(lat, lon, 50, 10000);
    const m = metrics(native.grid, NATIVE_SPACING);
    assert.ok(Number.isFinite(m.slope));
    assert.ok(m.min >= -10000 && m.max <= 12000);
    assert.equal(coarse.grid.length, 11);
  }
  assert.deepEqual(
    (await extract(0, 0, 50)).grid,
    (await extract(0, 360, 50)).grid,
  );
});
test("exact match outranks differing terrain and mission weights change ranking", () => {
  const base = metrics(
    [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ],
    10000,
  );
  const c = (name: string, slope: number, relief: number): Candidate => ({
    name,
    lat: 0,
    lon: 0,
    catalog: false,
    resolution: 10000,
    metrics: { "100": { ...base, slope, relief } },
  });
  const candidates = [
    c("exact", 0, 0),
    c("slope-match", 0, 1000),
    c("relief-match", 2, 0),
  ];
  const a = rank(base, candidates, 100, {
    slope: 100,
    relief: 0,
    roughness: 0,
    std: 0,
  });
  assert.equal(a[0].score, 100);
  assert.ok(
    a.find((x) => x.name === "slope-match")!.score >
      a.find((x) => x.name === "relief-match")!.score,
  );
  const b = rank(base, candidates, 100, {
    slope: 0,
    relief: 100,
    roughness: 0,
    std: 0,
  });
  assert.ok(
    b.find((x) => x.name === "slope-match")!.score <
      b.find((x) => x.name === "relief-match")!.score,
  );
  assert.throws(() =>
    rank(base, candidates, 100, { slope: 0, relief: 0, roughness: 0, std: 0 }),
  );
});
test("Earth index has genuine non-catalog coverage, all radius metrics, and attribution", async () => {
  const candidates: Candidate[] = JSON.parse(
    await readFile("data/earth-candidates.json", "utf-8"),
  );
  assert.equal(candidates.length, 632);
  assert.ok(candidates.filter((c) => !c.catalog).length > 600);
  for (const c of candidates)
    for (const r of ["50", "100", "150"]) {
      const m = c.metrics[r];
      assert.ok(Number.isFinite(m.slope));
      assert.ok(m.max >= m.min);
      assert.ok(m.profile.length >= 11);
    }
  const source = JSON.parse(
    await readFile("data/earth-metadata.json", "utf-8"),
  );
  assert.match(source.source, /Mapzen/);
  assert.match(source.acquisitionDates, /Not supplied/);
});
