YªçŠx-®éÜj×¢ëiºÚ+Š§j[h‘éÜ¢éíç¯¢Ö¥¢ëiºÙbë5import assert from "node:assert/strict";
const origin = process.argv[2] ?? "http://localhost:3000";
const weights = { slope: 40, relief: 25, roughness: 25, std: 10 };
const cases = [
  { lat: -43.31, lon: -11.36, radius: 100, weights },
  { lat: -89.54, lon: 0, radius: 50, weights },
  { lat: 0, lonß¯-¢G§²ÚîÆ­yÓt response = await fetch(origin + "/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  assert.equal(response.status, 400);
}
console.log(
  "PASS invalid-coordinate, invalid-radius and zero-weight request handling",
);

