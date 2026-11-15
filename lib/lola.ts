YªçŠx-®éÜj×¢ëiºÚ+Š§j[h‘éÜ¢éíë_¢Ö¥¢ëiºÙbë5import { readFile } from "node:fs/promises";
import { gunzipSync } from "node:zlib";
import path from "node:path";
import { destination, NATIVE_SPACING } from "./terrain";
const bands = new Map<number, Promise<Buffer>>();
async function band(index: number, mars = false) {
  const key = mars ? index ã_-¢G§²ÚîÆ­yŞ {
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

