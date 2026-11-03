import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import AnalogEvidence from "../components/AnalogEvidence";
import {
  defaultAnalogWeights,
  targetEvidence,
  weightAnalogs,
} from "../lib/analog";
import { metrics, rank } from "../lib/terrain";
test("planetary baseline cards stay visible even when Earth local evidence is missing", () => {
  const m = metrics(
    [
      [0, 1, 0],
      [0, 1, 0],
      [0, 1, 0],
    ],
    10000,
  );
  const target = targetEvidence("mars", 18.65, -133.8);
  const matches = rank(
    m,
    [
      {
        name: "Mauna Kea",
        lat: 19.82,
        lon: -155.47,
        catalog: true,
        resolution: 10000,
        metrics: { "50": m },
      },
    ],
    50,
    { slope: 40, relief: 25, roughness: 25, std: 10 },
  );
  const candidate = weightAnalogs(matches, target, defaultAnalogWeights)[0];
  const html = renderToStaticMarkup(
    createElement(AnalogEvidence, {
      body: "mars",
      lat: 18.65,
      lon: -133.8,
      analysis: null,
      candidate,
      weights: defaultAnalogWeights,
      onWeights: () => {},
      busy: false,
    }),
  );
  const visibleCards = html.split("<details")[0];
  assert.equal((visibleCards.match(/<article/g) ?? []).length, 9);
  assert.ok(visibleCards.includes("Temperature &amp; environmental extremes"));
  assert.ok(visibleCards.includes("Mars baseline · not a local measurement"));
  assert.ok(!visibleCards.includes("Caves &amp; subsurface environments"));
  assert.ok(html.includes("View unavailable factors"));
  assert.equal((html.match(/<details/g) ?? []).length, 1);
  assert.ok(html.includes("Temperature &amp; environmental extremes"));
  assert.ok(!html.includes("EVIDENCE GAP"));
  assert.ok(!html.includes("Terrain shape importance"));
  assert.ok(html.includes("70% terrain shape"));
  assert.ok(html.includes('id="analog-heading">Analog factors</h2>'));
  for (const removed of [
    "MEASURED ELEVATION",
    "CITED REGIONAL CONTEXT",
    "Where the analogy breaks down",
    "Comparing with",
    "Four Earth reference regions currently",
  ])
    assert.ok(!html.includes(removed));
});
