import {randomUUID} from 'node:crypto';
import {supabaseUrl,supabaseKey} from './supabase-config.mjs';
import {agents,maps,examples,recommend} from './engine.mjs';
import {patch} from './game-data.mjs';

const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
const text=(v,min=1,max=100)=>{if(typeof v!=='string'||v.trim().length<min||v.length>max)fail('Check the required fields.');return v.trim();};
const uuid=v=>{if(typeof v!=='string'||!/^[a-f0-9-]{36}$/i.test(v))fail('Invalid record identifier.');return v;};
function validateTiers(v){
 if(!v||typeof v!=='object'||Array.isArray(v)||Object.entries(v).some(([a,t])=>!Object.hasOwn(agents,a)||!Number.isInteger(t)||t<0||t>4))fail('Use known agent names and integer ratings 0–4.');
 return v;
}
export function validateSettings(v={}){
 if(!v||typeof v!=='object'||Array.isArray(v))fail('Invalid team settings.');
 const excluded=v.excluded||[],adjustments=v.adjustments||{};
 if(!Array.isArray(excluded)||excluded.some(a=>!Object.hasOwn(agents,a)))fail('Unknown excluded agent.');
 if(typeof adjustments!=='object'||Array.isArray(adjustments)||Object.entries(adjustments).some(([a,n])=>!Object.hasOwn(agents,a)||!Number.isInteger(n)||n < -50||n>50))fail('Patch adjustments must be integers between -50 and 50.');
 return {excluded:[...new Set(excluded)],adjustments,ratedOnly:v.ratedOnly===true,observedOnly:v.observedOnly===true,requireRoles:v.requireRoles!==false};
}
function cookies(res,session){
 const secure=process.env.NODE_ENV==='production'||process.env.VERCEL?'; Secure':'';
 res.setHeader('Set-Cookie',[
  `ss_access=${session?.access_token||''}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${session?session.expires_in||3600:0}${secure}`,
  `ss_refresh=${session?.refresh_token||''}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${session?2592000:0}${secure}`
 ]);
}
async function request(path,method='GET',body,token,prefer){
 let response;
 try{response=await fetch(supabaseUrl+path,{method,headers:{apikey:supabaseKey,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{}),...(prefer?{Prefer:prefer}:{})},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(15000)});}catch{fail('Cannot reach the account service. Please try again shortly.',503);}
 const data=await response.json().catch(()=>null);
 if(!response.ok){
  const message=path.startsWith('/auth/')?(data?.msg||data?.message||data?.error_description||'Authentication failed.'):'Unable to save or load this record.';
  fail(message,response.status===429?429:response.status>=500?503:response.status===401?401:response.status===403?403:400);
 }
 return data;
}
export async function supabaseHandler(req,res,url,b,send,snapshot){
 const path=url.pathname;
 if(path!=='/api/state'&&req.method!=='POST')fail('Use POST for this action.',405);
 const cookie=Object.fromEntries((req.headers.cookie||'').split(';').map(s=>s.trim().split('=')));
 let token=cookie.ss_access,user=null;
 if(path==='/api/auth'){
  const email=text(b.email,3,200).toLowerCase();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))fail('Enter a valid email.');
  if(typeof b.password!=='string'||b.password.length<10||b.password.length>200)fail('Use a password with 10–200 characters.');
  const data=await request(b.register?'/auth/v1/signup':'/auth/v1/token?grant_type=password','POST',{email,password:b.password,...(b.register?{data:{name:text(b.name,1,60)}}:{})});
  if(data?.access_token)cookies(res,data);
  return send({ok:true,confirmationRequired:!data?.access_token,message:!data?.access_token?'Check your email to confirm your account, then return here and sign in.':undefined});
 }
 if(path==='/api/verify'){
  const data=await request('/auth/v1/verify','POST',{email:text(b.email,3,200),token:text(b.code,6,12),type:'signup'});
  if(!data?.access_token)fail('Confirmation did not create a session. Sign in again.');
  cookies(res,data);return send({ok:true});
 }
 if(token){try{user=await request('/auth/v1/user','GET',undefined,token);}catch(e){if(e.status!==401&&e.status!==403)throw e;}}
 if(!user&&cookie.ss_refresh){
  try{const session=await request('/auth/v1/token?grant_type=refresh_token','POST',{refresh_token:cookie.ss_refresh});token=session.access_token;user=session.user;cookies(res,session);}catch(e){if(e.status===503||e.status===429)throw e;cookies(res,null);}
 }
 if(path==='/api/logout'){if(token&&user)await request('/auth/v1/logout','POST',{},token);cookies(res,null);return send({ok:true});}
 const rest=(table,method='GET',body,query='',prefer='return=representation')=>request('/rest/v1/'+table+query,method,body,token,prefer);
 const safeUser=user?{id:user.id,email:user.email,name:user.user_metadata?.name||user.email.split('@')[0]}:null;
 if(path==='/api/state'){
  const teams=user?await rest('ss_teams', 'GET',undefined,'?order=created_at.asc'):[];
  const team=teams.find(t=>t.id===url.searchParams.get('team'))||teams[0]||null;
  const [members,records,saved,personal]=await Promise.all([
   team?rest('ss_roster','GET',undefined,'?team_id=eq.'+team.id+'&order=created_at.asc'):[],
   team?rest('ss_observations','GET',undefined,'?team_id=eq.'+team.id):[],
   team?rest('ss_lineups','GET',undefined,'?team_id=eq.'+team.id+'&order=created_at.asc'):[],
   user?rest('ss_preferences','GET',undefined,'?user_id=eq.'+user.id):[]
  ]);
  return send({user:safeUser,teams,team,members,records:[...snapshot,...records.map(r=>r.body)],saved:saved.map(r=>r.body),personal:personal[0]?.tiers||{},agents,maps,examples,patch,storageReady:true,backend:'supabase',captainManaged:true});
 }
 if(!user)fail('Sign in to save your preferences and rosters.',401);
 if(path==='/api/personal'){
  await rest('ss_preferences','POST',{user_id:user.id,tiers:validateTiers(b.tiers)},'?on_conflict=user_id','resolution=merge-duplicates,return=representation');return send({ok:true});
 }
 if(path==='/api/team'){
  const [team]=await rest('ss_teams','POST',{name:text(b.name,1,60),owner:user.id});
  return send({teamId:team.id});
 }
 if(path==='/api/join')fail('This workspace uses captain-managed rosters. Each captain maintains their own team.',400);
 const teamId=uuid(b.teamId);
 const [team]=await rest('ss_teams','GET',undefined,'?id=eq.'+teamId);
 if(!team||team.owner!==user.id)fail('Only this team’s captain can access its roster.',403);
 if(path==='/api/member'){
  if(!['Starter','Sub'].includes(b.status))fail('Choose Starter or Sub.');
  const record={name:text(b.name,1,60),status:b.status};
  if(b.id){const rows=await rest('ss_roster','PATCH',record,'?id=eq.'+uuid(b.id)+'&team_id=eq.'+teamId);if(!rows.length)fail('Player not found.',404);}
  else await rest('ss_roster','POST',{...record,team_id:teamId,tiers:b.usePersonal?((await rest('ss_preferences','GET',undefined,'?user_id=eq.'+user.id))[0]?.tiers||{}):{}});
  return send({ok:true});
 }
 if(path==='/api/remove-member'){
  const rows=await rest('ss_roster','DELETE',undefined,'?id=eq.'+uuid(b.id)+'&team_id=eq.'+teamId);if(!rows.length)fail('Player not found.',404);return send({ok:true});
 }
 if(path==='/api/tiers'){
  const rows=await rest('ss_roster','PATCH',{tiers:validateTiers(b.tiers)},'?id=eq.'+uuid(b.id)+'&team_id=eq.'+teamId);if(!rows.length)fail('Player not found.',404);return send({ok:true});
 }
 if(path==='/api/settings'){await rest('ss_teams','PATCH',{settings:validateSettings(b.settings)},'?id=eq.'+teamId);return send({ok:true});}
 if(path==='/api/records'){
  if(!Array.isArray(b.records)||!b.records.length||b.records.length>100)fail('Import 1–100 records.');
  const rows=b.records.map(r=>{
   if(!maps.includes(r.map)||!Array.isArray(r.agents)||r.agents.length!==5||new Set(r.agents).size!==5||r.agents.some(a=>!Object.hasOwn(agents,a))||!Number.isInteger(r.sample)||r.sample<1||r.sample>100000)fail('Use a supported map, five unique agents, and a positive sample count.');
   let source;try{source=new URL(r.source);}catch{fail('Provide a valid source URL.');}if(!['https:','http:'].includes(source.protocol))fail('Source must be an HTTP URL.');
   if(typeof r.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(r.date)||!Number.isFinite(Date.parse(r.date))||new Date(r.date).toISOString().slice(0,10)!==r.date||r.date>new Date().toISOString().slice(0,10))fail('Provide a valid observation date.');
   return {team_id:teamId,body:{team:text(r.team),map:r.map,agents:r.agents,sample:r.sample,date:r.date,source:source.href,...(r.patch?{patch:text(r.patch,1,20)}:{})}};
  });await rest('ss_observations','POST',rows);return send({ok:true});
 }
 if(path==='/api/save'){
  if(!Array.isArray(b.players)||b.players.length!==5||new Set(b.players).size!==5||!maps.includes(b.map)||!Number.isInteger(b.weight)||b.weight<0||b.weight>100)fail('Select five different players and valid builder settings.');
  const members=(await rest('ss_roster','GET',undefined,'?team_id=eq.'+teamId)).filter(m=>b.players.includes(m.id));
  const imported=await rest('ss_observations','GET',undefined,'?team_id=eq.'+teamId);
  const options=validateSettings({...team.settings,ratedOnly:b.ratedOnly??team.settings.ratedOnly,observedOnly:b.observedOnly??team.settings.observedOnly});
  const results=recommend(members,[...snapshot,...imported.map(r=>r.body)],b.map,b.weight,options);
  if(!results.length)fail('No valid composition. Rate more agents or relax the exclusions.');
  const entry={id:randomUUID(),map:b.map,date:new Date().toISOString(),result:results[0],settings:options};
  await rest('ss_lineups','POST',{team_id:teamId,body:entry});return send({ok:true});
 }
 fail('Not found.',404);
}
