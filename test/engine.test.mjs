import test from 'node:test';
import assert from 'node:assert/strict';
import {recommend,examples,agents} from '../engine.mjs';
import {patch,mapFits} from '../game-data.mjs';
const players=examples[0].agents.map((a,i)=>({id:String(i),name:'Player '+i,tiers:{[a]:4}}));
test('finds unique optimal assignments across all agents, independent of player order',()=>{
 const [r]=recommend([...players].reverse(),[],'Ascent',100);
 assert.equal(r.comfort,100);assert.equal(r.score,100);assert.equal(r.evidence,0);
 assert.equal(new Set(r.assignment.map(a=>a.agent)).size,5);assert.ok(r.assignment.every(a=>a.tier===4));assert.equal(r.roles.length,4);
});
test('requires exactly five distinct players and valid settings',()=>{
 assert.throws(()=>recommend(players.slice(1),[],'Ascent'));
 assert.throws(()=>recommend([players[0],...players.slice(0,4)],[],'Ascent'));
 assert.throws(()=>recommend(players,[],'Fake map'));assert.throws(()=>recommend(players,[],'Ascent',101));
});
test('unrated and infeasible rosters are explicit',()=>{
 const empty=players.map(p=>({...p,tiers:{}}));
 assert.equal(recommend(empty,[],'Ascent')[0].comfort,0);
 assert.match(recommend(empty,[],'Ascent')[0].warnings.join(' '),/unrated/);
 assert.deepEqual(recommend(empty,[],'Ascent',70,{ratedOnly:true}),[]);
 assert.deepEqual(recommend(players,[],'Ascent',70,{excluded:['Omen','Viper','Brimstone','Astra','Harbor','Clove','Miks']}),[]);
});
test('map-specific evidence aggregates agent appearances, excluding templates and other maps',()=>{
 const records=[{...examples[0],example:false,sample:3},{...examples[0],example:false,sample:1,agents:['Jett','Sova','KAY/O','Omen','Cypher']},{...examples[1],example:false,sample:100}];
 const [r]=recommend(players,records,'Ascent',100);assert.equal(r.sample,4);assert.equal(r.evidence,95);assert.equal(r.patch,patch.id);
 assert.match(r.warnings.join(' '),/predate/);
});
test('map selection, exclusions and patch overrides influence composition',()=>{
 const empty=players.map(p=>({...p,tiers:{}}));
 const bind=recommend(empty,[],'Bind',0)[0],ascent=recommend(empty,[],'Ascent',0)[0];assert.notDeepEqual(bind.agents,ascent.agents);
 assert.ok(!recommend(players,[],'Ascent',70,{excluded:['Jett']}).some(r=>r.agents.includes('Jett')));
 const changed=recommend(empty,[],'Summit',0,{adjustments:{Miks:50,Veto:50,Tejo:50,Waylay:50,Neon:50}})[0];
 assert.ok(changed.agents.includes('Miks'));assert.ok(changed.agents.includes('Veto'));
});
test('top three global results match independent exhaustive enumeration',()=>{
 const available=['Jett','Raze','Sova','Omen','Killjoy','Cypher','Miks'];
 const p=players.map((x,i)=>({...x,tiers:Object.fromEntries(available.map((a,j)=>[a,(i*3+j*2)%5]))}));
 const excluded=Object.keys(agents).filter(a=>!available.includes(a));const best=new Map();
 function enumerate(chosen){
  if(chosen.length===5){if(new Set(chosen.map(a=>agents[a])).size!==4)return;
   const score=chosen.reduce((n,a,i)=>n+p[i].tiers[a]/4*70+((mapFits.Ascent[a]??60)*.5+50*.2)*.3,0)/5;
   const key=[...chosen].sort().join('|');best.set(key,Math.max(best.get(key)??-Infinity,score));return;}
  for(const a of available)if(!chosen.includes(a))enumerate([...chosen,a]);
 }enumerate([]);
 const expected=[...best.values()].sort((a,b)=>b-a).slice(0,3).map(Math.round);
 const actual=recommend(p,[],'Ascent',70,{excluded});assert.deepEqual(actual.map(r=>r.score),expected);
 assert.equal(new Set(actual.map(r=>[...r.agents].sort().join('|'))).size,3);
});
