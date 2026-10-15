import test from 'node:test';import assert from 'node:assert/strict';
import {agents,maps,entryAgents,recommend,globalAgentScore} from '../engine.mjs';import {valkingSnapshot} from '../valking-agent-data.mjs';
const roster=Array.from({length:5},(_,i)=>({id:String(i),name:'Player '+i,tiers:Object.fromEntries(Object.keys(agents).map(a=>[a,a==='Reyna'||a==='Phoenix'?4:3]))}));
test('every map keeps entry and all roles even if an old setting disabled balance',()=>{
 for(const map of maps)for(const r of recommend(roster,[],map,50,{requireRoles:false})){
  assert.ok(r.agents.some(a=>entryAgents.includes(a)));assert.equal(new Set(r.agents.map(a=>agents[a])).size,4);assert.equal(r.weights.comfort,50);assert.equal(r.weights.global,5);
 }
 assert.deepEqual(recommend(roster,[],'Lotus',50,{excluded:entryAgents}),[]);
 const unrated=roster.map(p=>({...p,tiers:Object.fromEntries(Object.entries(p.tiers).filter(([a])=>!entryAgents.includes(a)))}));assert.deepEqual(recommend(unrated,[],'Lotus',50,{ratedOnly:true}),[]);
});
test('observed-only does not permit a composition without entry',()=>{
 const r={map:'Lotus',agents:['Reyna','Sova','Omen','Killjoy','Breach'],sample:10,team:'Test',source:'https://example.com/match'};
 assert.deepEqual(recommend(roster,[r],'Lotus',50,{observedOnly:true}),[]);
});
test('Valking signal preserves published scope and unknown counts',()=>{
 assert.equal(Object.keys(valkingSnapshot.agents).length,29);
 for(const [a,r] of Object.entries(valkingSnapshot.agents)){assert.ok(agents[a]);assert.equal(r.matches,null);assert.ok(r.winRate>=0&&r.winRate<=100)}
 assert.ok(globalAgentScore('Clove')>globalAgentScore('Omen'));assert.equal(globalAgentScore('Unknown'),50);
});
