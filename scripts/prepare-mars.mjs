YªçŠx-®éÜj×¢ëiºÚ+Š§j[h‘éÜ¢éíã]“¢Ö¥¢ëiºÙbë5import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const raw=await readFile('data/raw/mola.img');
const label=await readFile('data/mola.lbl','utf8');
if(raw.length!==5760*2880*2 || !label.includes('MSB_INTEGER')) tÛ]­¢G§²ÚîÆ­yÓentric east-positive',sha256:createHash('sha256').update(raw).digest('hex'),min,max,source:'https://pds-geosciences.wustl.edu/missions/mgs/megdr.html',limits:'Interpolated gaps; approximately 55% of equatorial bins contain laser observations.'},null,2));
console.log({min,max,bytes:raw.length});

