import {writeFile} from 'node:fs/promises';
import {locations} from '../lib/locations';
import {extract} from '../lib/lola';
import {metrics,rank} from '../lib/terrain';
import earth from '../data/earth-candidates.json';
import type {Candidate} from '../lib/types';
async function main(){
const verified=[[0.67416,23.47314],[-3.0128,-23.4219],[-3.64589,-17.47194],[26.13239,3.63330],[-8.9734,15.5011],[20.1911,30.7723]];
const reports=[];
for(const [i,site] of locations.filter(p=>p.category==='Landing sites').entries()){
 if(site.lat!==verified[i][0]||site.lon!==verified[i][1])throw Error('NASA coordinate mismatch: '+site.name);
 for(const radius of [50,100,150]){
  const native=await extract(site.lat,site.lon,radius),coarse=await extract(site.lat,site.lon,radius,10000);
  const measured=metrics(native.grid,native.spacing),comparison=metrics(coarse.grid,10000);
  const matches=rank(comparison,earth as Candidate[],radius,{slope:40,relief:25,roughness:25,std:10});
  reports.push({site:site.name,lat:site.lat,lon:site.lon,radius,spacing:native.spacing,grid:native.grid,metrics:measured,comparison,topScore:matches[0].score});
 }
}
await writeFile('data/raw/mission-check.json',JSON.stringify(reports));
console.log('18 mission/radius cases extracted; NASA coordinates match all six Apollo landings.');

}
main().catch(e=>{console.error(e);process.exitCode=1;});
