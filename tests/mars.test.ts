import { test } from "node:test";
import assert from "node:assert/strict";
import { extract } from "../lib/lola";
import { metrics } from "../lib/terrain";
import { readFile } from "node:fs/promises";
import { gunzipSync } from "node:zlib";
test("Mars uses meter-scaled MOLA data, Mars radius and distinct cached bands", async () => {
  const earthward = await extract(0, 0, 50, 10000, false);
  const mars = await extract(0, 0, 50, 10000, true);
  const raw = gunzipSync(await readFile("data/mola/9.bin.gz"));
  assert.equal(mars.grid[5][5], raw.readInt16LE(0));
  assert.notDeepEqual(mars.grid, earthward.grid);
  for (const [lat, lon] of [
    [18.44, 77.45],
    [90, 0],
    [-90, 360],
    [0, 180],
  ]) {
    const a = await extract(lat, lon, 50, 10000, true);
    assert.equal(a.grid.length, 11);
    const m = metrics(a.grid, 10000);
    assert.ok(Number.isFinite(m.slope));
    assert.ok(m.min >= -8177 && m.max <= 21171);
  }
  assert.deepEqual(
    (await extract(0, 0, 50, 10000, true)).grid,
    (await extract(0, 360, 50, 10000, true)).grid,
  );
});
