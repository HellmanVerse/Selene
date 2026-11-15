YªçŠx-®éÜj×¢ëiºÚ+Š§j[h‘éÜ¢éí÷ßS¢Ö¥¢ëiºÙbë5import { test } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { POST } from "../app/api/analyze/route";
import { defaultAnalogWeights } from "../lib/analog";
test("Mars API exposes regional evidence, weights and contributions and reranksïßm¢G§²ÚîÆ­yÐassert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.candidates.length, 12);
    assert.equal(data.profileRequirement, undefined);
    assert.equal(data.closestProfile, undefined);
    assert.ok(data.candidates[0].alignedProfile.length > 0);
  }
});

