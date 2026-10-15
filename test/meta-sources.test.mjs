import test from 'node:test';
import assert from 'node:assert/strict';
import {metaCompositions} from '../meta-data.mjs';
import {agents,maps,recommend,observationsForMap} from '../engine.mjs';
test('source compositions preserve evidence scope and can be assigned without inventing pro samples',()=>{
 for(const row of metaCompositions){
  assert.equal(new Set(row.agents).size,5);
  assert.ok(row.agents.every(a=>Object.hasOwn(agents,a)));
  assert.ok(row.map===null||maps.includes(row.map));
  assert.ok(row.winRate>=0&&row.winRate<=100);
  assert.equal(new URL(row.source).protocol,'https:');
  if(row.kind==='ranked'){assert.ok(row.matches>0);assert.ok(Math.abs(row.wins/row.matches*100-row.winRate)<.15);assert.equal(row.map,null)}
  else {assert.equal(row.kind,'editorial');assert.equal(row.matches,null);assert.equal(row.wins,null)}
 }
 assert.equal(observationsForMap(metaCompositions,'Lotus').length,0);
 const source=metaCompositions.find(r=>r.map==='Lotus');
 const roster=source.agents.map((a,i)=>({id:String(i),name:'Player '+i,tiers:{[a]:4}}));
 const excluded=Object.keys(agents).filter(a=>!source.agents.includes(a));
 const [result]=recommend(roster,[],'Lotus',70,{excluded,ratedOnly:true});
 assert.deepEqual(new Set(result.assignment.map(a=>a.agent)),new Set(source.agents));
 assert.equal(result.professional.exactSamples,0);
 assert.deepEqual(recommend(roster,[],'Lotus',70,{excluded,ratedOnly:true,observedOnly:true}),[]);
});
