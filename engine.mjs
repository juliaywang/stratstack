import {patch,mapFits} from './game-data.mjs';
export const agents = {Jett:'Duelist',Raze:'Duelist',Neon:'Duelist',Reyna:'Duelist',Phoenix:'Duelist',Yoru:'Duelist',Iso:'Duelist',Waylay:'Duelist',Sova:'Initiator',Breach:'Initiator',Skye:'Initiator',Fade:'Initiator',Gekko:'Initiator','KAY/O':'Initiator',Tejo:'Initiator',Omen:'Controller',Viper:'Controller',Brimstone:'Controller',Astra:'Controller',Harbor:'Controller',Clove:'Controller',Killjoy:'Sentinel',Cypher:'Sentinel',Sage:'Sentinel',Chamber:'Sentinel',Deadlock:'Sentinel',Vyse:'Sentinel',Veto:'Sentinel',Miks:'Controller'};
export const maps = ['Ascent','Haven','Bind','Lotus','Sunset','Split','Icebox','Breeze','Pearl','Fracture','Abyss','Corrode','Summit'];
export const examples = [
 {map:'Ascent',team:'Example · default control',agents:['Jett','Sova','KAY/O','Omen','Killjoy'],sample:1,example:true},
 {map:'Haven',team:'Example · three-site control',agents:['Jett','Sova','Breach','Omen','Cypher'],sample:1,example:true},
 {map:'Bind',team:'Example · double controller',agents:['Raze','Skye','Viper','Brimstone','Cypher'],sample:1,example:true},
 {map:'Lotus',team:'Example · double controller',agents:['Raze','Fade','Omen','Viper','Killjoy'],sample:1,example:true}
];
export function observationsForMap(records,map){
 const unique=new Map();
 records.forEach((r,i)=>{
  if(r.map!==map||r.example||!Number.isFinite(r.sample)||r.sample<=0||!Array.isArray(r.agents)||r.agents.length!==5||new Set(r.agents).size!==5||r.agents.some(a=>!Object.hasOwn(agents,a)))return;
  const matchId=r.source?.match(/^https?:\/\/(?:www\.)?vlr\.gg\/(\d+)(?:\/|\?|$)/)?.[1];
  const key=r.source?`${matchId?'vlr:'+matchId:r.source.split('?')[0].replace(/\/$/,'')}|${r.map}|${r.team}`:`unsourced-${i}`;
  if(!unique.has(key))unique.set(key,r);
 });return [...unique.values()];
}
export function compositionEvidence(picks,records,map){
 const selected=new Set(picks), observed=observationsForMap(records,map);
 const ranked=observed.map(r=>({...r,shared:r.agents.filter(a=>selected.has(a)).length})).sort((a,b)=>b.shared-a.shared||String(b.date||'').localeCompare(String(a.date||'')));
 const exact=ranked.filter(r=>r.shared===5),similar=ranked.filter(r=>r.shared>=3&&r.shared<5);
 const count=rows=>rows.reduce((sum,r)=>sum+r.sample,0);
 const source=r=>({team:r.team,map:r.map,agents:r.agents,date:r.date,source:r.source,event:r.event||'',sample:r.sample,shared:r.shared,patch:r.patch||null});
 const dates=observed.map(r=>r.date).filter(Boolean).sort();
 return {exactSamples:count(exact),mapSamples:count(observed),exactRate:count(observed)?Math.round(count(exact)/count(observed)*100):0,exactSources:exact.slice(0,5).map(source),similarSources:similar.slice(0,5).map(source),from:dates[0]||null,through:dates.at(-1)||null};
}
export function recommend(players, records, map, weight=50, options={}) {
 if(players.length!==5 || new Set(players.map(p=>p.id)).size!==5) throw new Error('Select exactly five different players.');
 if(!maps.includes(map)||!Number.isFinite(weight)||weight<0||weight>100) throw new Error('Invalid composition settings.');
 const roles=['Duelist','Initiator','Controller','Sentinel'];
 const observed=observationsForMap(records,map);
 if(options.observedOnly){
  const sets=new Map(observed.map(r=>[[...r.agents].sort().join('|'),r.agents]));
  return [...sets.values()].flatMap(picks=>recommend(players,observed,map,weight,{...options,observedOnly:false,excluded:[...new Set([...(options.excluded||[]),...Object.keys(agents).filter(a=>!picks.includes(a))])]}))
   .sort((a,b)=>b.score-a.score||b.professional.exactSamples-a.professional.exactSamples).slice(0,3).map(r=>({...r,observedOnly:true}));
 }
 const total=observed.reduce((n,r)=>n+r.sample,0), frequency={};
 for(const r of observed)for(const a of r.agents)frequency[a]=(frequency[a]||0)+r.sample;
 const changes=Object.fromEntries(patch.changes.map(c=>[c.agent,c.delta]));
 const excluded=new Set(options.excluded||[]), overrides=options.adjustments||{};
 const candidates=Object.keys(agents).filter(a=>!excluded.has(a));
 // Dynamic programming over agents: each agent is considered once, preventing duplicates.
 // For every player-mask and role-mask retain the three best distinct agent sets.
 // All future choices depend only on these masks, so pruning preserves the top 3 sets.
 let dp=new Map([[0,[{value:0,assignment:[],key:''}]]]);
 const insert=(table,key,item)=>{
  const list=table.get(key)||[], duplicate=list.findIndex(x=>x.key===item.key);
  if(duplicate>=0){if(list[duplicate].value>=item.value)return;list.splice(duplicate,1);}
  list.push(item);list.sort((a,b)=>b.value-a.value||a.key.localeCompare(b.key));
  if(list.length>3)list.pop();table.set(key,list);
 };
 for(const agent of candidates){
  const role=1<<roles.indexOf(agents[agent]);
  const mapFit=mapFits[map]?.[agent]??60;
  const adjustment=Object.hasOwn(overrides,agent)?overrides[agent]:(changes[agent]||0);
  if(!Number.isFinite(adjustment)||adjustment < -50||adjustment > 50)throw new Error('Patch adjustments must be between -50 and 50.');
  const patchFit=50+adjustment,evidence=total?(frequency[agent]||0)/total*100:0;
  const next=new Map([...dp].map(([k,v])=>[k,[...v]]));
  for(const [key,paths] of dp){const used=key>>4,roleMask=key&15;
   for(let i=0;i<5;i++){if(used&(1<<i))continue;
    const tier=players[i].tiers?.[agent]??0;
    if(!Number.isInteger(tier)||tier<0||tier>4)throw new Error('Invalid player rating.');
    if(options.ratedOnly&&tier===0)continue;
    const value=tier/4*weight+(mapFit*.5+patchFit*.2+evidence*.3)*(100-weight)/100;
    for(const path of paths){const assignment=[...path.assignment,{player:players[i].name,playerId:players[i].id,agent,tier,mapFit,patchFit,evidence}];
     insert(next,((used|(1<<i))<<4)|(roleMask|role),{value:path.value+value,assignment,key:assignment.map(a=>a.agent).sort().join('|')});
    }
   }
  }dp=next;
 }
 const complete=options.requireRoles===false?[...dp].filter(([k])=>(k>>4)===31).flatMap(([,v])=>v):dp.get((31<<4)|15)||[];
 const unique=new Map();for(const p of complete.sort((a,b)=>b.value-a.value)){if(!unique.has(p.key))unique.set(p.key,p);}
 return [...unique.values()].slice(0,3).map(p=>{
  const assignment=p.assignment.sort((a,b)=>players.findIndex(x=>x.id===a.playerId)-players.findIndex(x=>x.id===b.playerId));
  const avg=key=>Math.round(assignment.reduce((s,a)=>s+a[key],0)/5);
  const exactComfort=Math.round(assignment.reduce((s,a)=>s+a.tier,0)/20*100);
  const professional=compositionEvidence(assignment.map(a=>a.agent),observed,map);
  const warnings=[];
  if(assignment.some(a=>a.tier===0))warnings.push('Includes unrated agents. Rate more agents or enable rated-only picks.');
  if(!total)warnings.push('No professional observations for this map; evidence contributes zero.');
  if(patch.poolStatus[map]==='Out of rotation')warnings.push('This map is outside the verified competitive rotation; suitable for custom practice.');
  if(!Object.keys(mapFits[map]||{}).length)warnings.push('Map suitability is neutral until this map has been reviewed.');
  if(map==='Corrode')warnings.push('Corrode changed in 13.08; validate lineups and retake timings in practice.');
  if(professional.through&&Date.parse(patch.verifiedAt)-Date.parse(professional.through)>90*86400000)warnings.push('Historical evidence only: the newest match for this map is over 90 days before this patch.');
  if(observed.some(r=>!r.patch||r.patch!==patch.id))warnings.push('Professional samples may predate this patch.');
  return {map,team:'Optimized roster composition',agents:assignment.map(a=>a.agent),assignment,comfort:exactComfort,evidence:avg('evidence'),professional,mapFit:avg('mapFit'),patchFit:avg('patchFit'),score:Math.round(p.value/5),sample:total,example:false,generated:true,patch:patch.id,verifiedAt:patch.verifiedAt,source:professional.exactSources[0]?.source||professional.similarSources[0]?.source||null,patchSource:patch.source,date:patch.verifiedAt,warnings,roles:[...new Set(assignment.map(a=>agents[a.agent]))],weights:{comfort:weight,map:(100-weight)*.5,patch:(100-weight)*.2,evidence:(100-weight)*.3}};
 });
}
