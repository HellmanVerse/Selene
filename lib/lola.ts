import { readFile } from "node:fs/promises";
import { gunzipSync } from "node:zlib";
import path from "node:path";
import { destination, NATIVE_SPACING } from "./terrain";
const bands = new Map<number, Promise<Buffer>>();
async function band(index: number, mars = false) {
  const key = mars ? index + 18 : index;
  if (!bands.has(key))
    bands.set(
      key,
      readFile(
        path.join(
          process.cwd(),
          mars ? "data/mola" : "data/lola",
          `${index}.bin.gz`,
        ),
      )
        .then(gunzipSync)
        .catch((e) => {
          bands.delete(key);
          throw e;
        }),
    );
  return bands.get(key)!;
}
export async function extract(
  lat: number,
  lon: number,
  radius: number,
  spacing = NATIVE_SPACING,
  mars = false,
) {
  const half = Math.floor((radius * 1000) / spacing),
    n = half * 2 + 1;
  const positions = Array.from({ length: n }, (_, y) =>
    Array.from({ length: n }, (_, x) => {
      const p = destination(
        lat,
        lon,
        (x - half) * spacing,
        (half - y) * spacing,
        mars ? 3396000 : undefined,
      );
      return {
        row: Math.min(2879, Math.max(0, Math.floor((90 - p.lat) * 16))),
        col: Math.floor(p.lon * 16) % 5760,
      };
    }),
  );
  const needed = [
    ...new Set(positions.flat().map((p) => Math.floor(p.row / 160))),
  ];
  const buffers = new Map(
    await Promise.all(
      needed.map(async (b) => [b, await band(b, mars)] as const),
    ),
  );
  const grid = positions.map((row) =>
    row.map((p) => {
      const dn = buffers
        .get(Math.floor(p.row / 160))!
        .readInt16LE(((p.row % 160) * 5760 + p.col) * 2);
      if (dn === -32768)
        throw new Error("Missing LOLA data in selected region.");
      return dn * (mars ? 1 : 0.5);
    }),
  );
  return { grid, spacing };
}
