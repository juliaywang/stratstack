import test from 'node:test';import assert from 'node:assert/strict';
import {agents,recommend,rankedAgentScore} from '../engine.mjs';import {rankedAgentSnapshot as data} from '../ranked-agent-data.mjs';
test('ranked samples are valid and low counts are shrunk toward neutral',()=>{
 for(const m of Object.values(data.maps))for(const [a,r] of Object.entries(m.agents)){assert.ok(agents[a]);assert.ok(r.matches>0);assert.ok(r.winRate>=0&&r.winRate<=100)}
 assert.equal(rankedAgentScore(null),50);assert.equal(rankedAgentScore({matches:1000,winRate:50}),50);
 assert.ok(rankedAgentScore({matches:10,winRate:70})<rankedAgentScore({matches:5000,winRate:55}));
});
test('ranked agent results influence all-agent optimization without exact pro compositions',()=>{
 const available=['Jett','Sova','Cypher','Breach','Omen','Clove','Miks'];
 const players=Array.from({length:5},(_,i)=>({id:String(i),name:'Player '+i,tiers:Object.fromEntries(available.map(a=>[a,4]))}));
 const options={excluded:Object.keys(agents).filter(a=>!available.includes(a))};
 const r=recommend(players,[],'Lotus',50,options)[0];assert.ok(r.agents.includes('Clove'));assert.equal(r.professional.exactSamples,0);assert.equal(r.weights.comfort,50);assert.equal(r.weights.ranked,30);assert.ok(r.rankedSource.source.includes('/Lotus/'));
 const missing=recommend(players,[],'Icebox',50,options)[0];assert.equal(missing.rankedFit,50);assert.equal(missing.rankedSource,null);assert.match(missing.warnings.join(' '),/Missing map-specific/);
 const miks=data.maps.Breeze.agents.Miks;assert.ok(miks);assert.ok(rankedAgentScore(miks)>50);
});
