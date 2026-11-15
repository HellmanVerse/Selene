YªçŠx-®éÜj×¢ëiºÚ+Š§j[h‘éÜ¢éíßžÓ¢Ö¥¢ëiºÙbë5import { test } from "node:test";
import assert from "node:assert/strict";
import { extract } from "../lib/lola";
import { metrics } from "../lib/terrain";
import { readFile } from "node:fs/promises";
import { gunzipSync } from "node:zlib";
test("Mars uses meter-scaled MOLA data, Mars radius and dis×ží¢G§²ÚîÆ­yÐ   assert.equal(a.grid.length, 11);
    const m = metrics(a.grid, 10000);
    assert.ok(Number.isFinite(m.slope));
    assert.ok(m.min >= -8177 && m.max <= 21171);
  }
  assert.deepEqual(
    (await extract(0, 0, 50, 10000, true)).grid,
    (await extract(0, 360, 50, 10000, true)).grid,
  );
});

