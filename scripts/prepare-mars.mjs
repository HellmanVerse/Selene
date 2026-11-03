import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const raw=await readFile('data/raw/mola.img');
const label=await readFile('data/mola.lbl','utf8');
if(raw.length!==5760*2880*2 || !label.includes('MSB_INTEGER')) throw Error('Unexpected MOLA product');
await mkdir('data/mola',{recursive:true});
let min=Infinity,max=-Infinity;
for(let b=0;b<18;b++) {
 const out=Buffer.alloc(160*5760*2);
 for(let i=0;i<out.length;i+=2){const v=raw.readInt16BE(b*out.length+i); if(v===-32768) throw Error('Missing data'); min=Math.min(min,v);max=Math.max(max,v);out.writeInt16LE(v,i);}
 await writeFile(`data/mola/${b}.bin.gz`,gzipSync(out));
}
await writeFile('data/mola-metadata.json',JSON.stringify({product:'MOLA MEGDR MEGT90N000EB',version:'2.0',rows:2880,columns:5760,pixelsPerDegree:16,radius:3396000,scale:1,datum:'GMM3 areoid',coordinates:'IAU2000 planetocentric east-positive',sha256:createHash('sha256').update(raw).digest('hex'),min,max,source:'https://pds-geosciences.wustl.edu/missions/mgs/megdr.html',limits:'Interpolated gaps; approximately 55% of equatorial bins contain laser observations.'},null,2));
console.log({min,max,bytes:raw.length});
