export const agents = {Jett:'Duelist',Raze:'Duelist',Neon:'Duelist',Reyna:'Duelist',Phoenix:'Duelist',Yoru:'Duelist',Iso:'Duelist',Waylay:'Duelist',Sova:'Initiator',Breach:'Initiator',Skye:'Initiator',Fade:'Initiator',Gekko:'Initiator','KAY/O':'Initiator',Tejo:'Initiator',Omen:'Controller',Viper:'Controller',Brimstone:'Controller',Astra:'Controller',Harbor:'Controller',Clove:'Controller',Killjoy:'Sentinel',Cypher:'Sentinel',Sage:'Sentinel',Chamber:'Sentinel',Deadlock:'Sentinel',Vyse:'Sentinel'};
export const maps = ['Ascent','Haven','Bind','Lotus','Sunset','Split','Icebox','Breeze','Pearl','Fracture','Abyss','Corrode','Summit'];
export const examples = [
 {map:'Ascent',team:'Example · default control',agents:['Jett','Sova','KAY/O','Omen','Killjoy'],sample:1,example:true},
 {map:'Haven',team:'Example · three-site control',agents:['Jett','Sova','Breach','Omen','Cypher'],sample:1,example:true},
 {map:'Bind',team:'Example · double controller',agents:['Raze','Skye','Viper','Brimstone','Cypher'],sample:1,example:true},
 {map:'Lotus',team:'Example · double controller',agents:['Raze','Fade','Omen','Viper','Killjoy'],sample:1,example:true}
];
export function recommend(players, records, map, weight=70) {
 if(players.length!==5) throw new Error('Select exactly five players.');
 const grouped=new Map();
 for(const r of records.filter(r=>r.map===map)){const key=[...r.agents].sort().join('|');const old=grouped.get(key);if(old){old.sample+=r.sample;if(!old.teams.includes(r.team))old.teams.push(r.team);old.team=old.teams.join(' + ');}else grouped.set(key,{...r,teams:[r.team]});}
 const real=[...grouped.values()], templates=real.length?real:examples.filter(r=>r.map===map);
 if(!templates.length) templates.push({map,team:'Role-balanced example',agents:['Raze','Sova','Omen','Cypher','Breach'],sample:1,example:true});
 const total=templates.reduce((s,r)=>s+r.sample,0);
 return templates.map(t=>{
   let best=-1, assignment=[];
   function visit(i,remaining,chosen,sum){if(i===5){if(sum>best){best=sum;assignment=chosen;}return;} for(const a of remaining)visit(i+1,remaining.filter(x=>x!==a),[...chosen,{player:players[i].name,playerId:players[i].id,agent:a,tier:players[i].tiers[a]??0}],sum+(players[i].tiers[a]??0));}
   visit(0,t.agents,[],0);
   const comfort=Math.round(best/20*100), evidence=t.example?0:Math.round(t.sample/total*100);
   return {...t,assignment,comfort,evidence,score:Math.round(comfort*weight/100+evidence*(100-weight)/100)};
 }).sort((a,b)=>b.score-a.score).slice(0,3);
}
