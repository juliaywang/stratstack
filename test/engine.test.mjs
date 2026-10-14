import test from 'node:test';
import assert from 'node:assert/strict';
import {recommend,examples} from '../engine.mjs';
const players=examples[0].agents.map((a,i)=>({id:String(i),name:'Player '+i,tiers:{[a]:4}}));
test('finds the optimal unique assignment regardless of player order',()=>{const [r]=recommend([...players].reverse(),[],'Ascent');assert.equal(r.comfort,100);assert.equal(r.score,70);assert.equal(r.evidence,0);assert.equal(new Set(r.assignment.map(a=>a.agent)).size,5);assert.ok(r.assignment.every(a=>a.tier===4));});
test('requires exactly five players',()=>{assert.throws(()=>recommend(players.slice(1),[],'Ascent'));assert.throws(()=>recommend([...players,players[0]],[],'Ascent'));});
test('uses only observed map samples when available',()=>{const r=recommend(players,[{...examples[0],example:false,sample:3},{...examples[0],agents:['Jett','Sova','KAY/O','Omen','Cypher'],example:false,sample:1},{...examples[1],example:false,sample:100}],'Ascent',0);assert.deepEqual(r.map(x=>x.score),[75,25]);});
test('unrated players have zero comfort',()=>{const [r]=recommend(players.map(p=>({...p,tiers:{}})),[],'Ascent');assert.equal(r.comfort,0);assert.equal(r.score,0);});

test('combines identical compositions across teams into one frequency',()=>{const r=recommend(players,[{...examples[0],example:false,team:'A',sample:2},{...examples[0],example:false,team:'B',sample:3}],'Ascent');assert.equal(r.length,1);assert.equal(r[0].sample,5);assert.equal(r[0].evidence,100);});
