YªçŠx-®éÜj×¢ëiºÚ+Š§j[h‘éÜ¢éíïS¢Ö¥¢ëiºÙbë5import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import AnalogEvidence from "../components/AnalogEvidence";
import {
  defaultAnalogWeights,
  targetEvidence,
  weightAnalogs,
} çm¢G§²ÚîÆ­yØhtml.includes('id="analog-heading">Analog factors</h2>'));
  for (const removed of [
    "MEASURED ELEVATION",
    "CITED REGIONAL CONTEXT",
    "Where the analogy breaks down",
    "Comparing with",
    "Four Earth reference regions currently",
  ])
    assert.ok(!html.includes(removed));
});

