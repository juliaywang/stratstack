// Versioned editorial inputs. Patch facts are sourced; numerical weights are heuristics.
export const competitiveRotation = {
 maps:['Abyss','Bind','Corrode','Haven','Lotus','Summit','Sunset'],
 patch:'13.08', verifiedAt:'2026-10-15',
 source:'https://www.dotesports.com/valorant/news/valorants-competitive-map-pool-rotation-explained'
};
export const patch = {
 id:'13.08', verifiedAt:'2026-10-13',
 source:'https://playvalorant.com/en-us/news/game-updates/valorant-patch-notes-13-08/',
 summary:'Bind and Corrode enter the competitive pool; Ascent and Split leave. Corrode rotation routes, mid cover and the A plant zone changed.',
 poolStatus:Object.fromEntries([...competitiveRotation.maps.map(m=>[m,'In rotation']),...['Ascent','Split','Breeze','Icebox','Fracture','Pearl'].map(m=>[m,'Out of rotation'])]),
 changes:[
  {agent:'Iso',delta:5,patch:'13.01',note:'Faster weapon equip after Double Tap.',source:'https://playvalorant.com/en-us/news/game-updates/valorant-patch-notes-13-01/'},
  {agent:'Yoru',delta:5,patch:'13.01',note:'Gatecrash beacon duration increased.',source:'https://playvalorant.com/en-us/news/game-updates/valorant-patch-notes-13-01/'},
  {agent:'Phoenix',delta:-5,patch:'13.02',note:'Run It Back requires 7 ultimate points, up from 6.',source:'https://playvalorant.com/en-us/news/game-updates/valorant-patch-notes-13-02/'},
  {agent:'Killjoy',delta:0,patch:'13.08',note:'Alarmbot feedback fix; no balance score adjustment.',source:'https://playvalorant.com/en-us/news/game-updates/valorant-patch-notes-13-08/'}
 ],
 note:'Patch adjustments and map scores are editorial estimates, not measured win-rate changes. This snapshot is maintained manually.'
};
export const mapFits = {
 Ascent:{Jett:90,Sova:90,'KAY/O':85,Omen:90,Killjoy:90},
 Haven:{Jett:85,Sova:90,Breach:90,Omen:90,Cypher:85},
 Bind:{Raze:95,Skye:90,Brimstone:95,Viper:90,Cypher:80},
 Lotus:{Raze:90,Fade:90,Omen:95,Viper:85,Killjoy:85},
 Sunset:{Raze:85,Neon:85,Breach:85,Fade:85,Omen:90,Cypher:90},
 Split:{Raze:95,Skye:85,Omen:90,Viper:85,Cypher:90},
 Icebox:{Jett:90,Sova:90,Viper:95,Harbor:85,Killjoy:90},
 Breeze:{Jett:90,Yoru:85,Sova:90,Viper:95,Cypher:90},
 Pearl:{Jett:85,Yoru:85,Fade:85,Astra:90,Harbor:85,Killjoy:85},
 Fracture:{Raze:90,Neon:90,Breach:95,Brimstone:90,Killjoy:85},
 Abyss:{Jett:90,Sova:90,Omen:90,Astra:85,Cypher:85},
 Corrode:{Yoru:85,Raze:85,Fade:85,Omen:90,Viper:85,Cypher:85},
 Summit:{}
};
