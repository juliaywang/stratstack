import test from 'node:test';
import assert from 'node:assert/strict';
import {supabaseHandler,validateSettings} from '../supabase-handler.mjs';
const user={id:'a0000000-0000-4000-8000-000000000001',email:'captain@example.invalid',user_metadata:{name:'Captain'}};
const team={id:'b0000000-0000-4000-8000-000000000001',owner:user.id,name:'Five',settings:{}};
function invoke(path,body={},cookie='',method=path==='state'?'GET':'POST'){
 const headers={};const res={setHeader:(k,v)=>headers[k]=v};let output;
 return supabaseHandler({method,headers:{cookie}},res,new URL('http://localhost/api/'+path),body,d=>{output=d},[]).then(()=>({data:output,headers}));
}
test('Supabase account, confirmation, refresh, ownership, ranking and save contract',async(t)=>{
 const original=globalThis.fetch;const calls=[];let loginFailure=false,confirmation=true;
 const members=['Jett','Sova','Omen','Killjoy','Breach'].map((a,i)=>({id:'c0000000-0000-4000-8000-00000000000'+i,team_id:team.id,name:'Player '+i,status:'Starter',tiers:{[a]:4}}));
 globalThis.fetch=async(url,options)=>{
  const u=new URL(url),body=options.body?JSON.parse(options.body):null;calls.push({u,options,body});
  const response=(v,status=200)=>new Response(JSON.stringify(v),{status,headers:{'content-type':'application/json'}});
  if(u.pathname==='/auth/v1/signup')return response(confirmation?{user}:{user,access_token:'valid',refresh_token:'refresh',expires_in:3600});
  if(u.pathname==='/auth/v1/token')return response(loginFailure?{message:'Invalid login credentials'}:{user,access_token:'valid',refresh_token:'rotated',expires_in:3600},loginFailure?400:200);
  if(u.pathname==='/auth/v1/user')return options.headers.Authorization==='Bearer valid'?response(user):response({message:'Expired'},401);
  if(u.pathname==='/auth/v1/logout')return response({});
  if(u.pathname==='/auth/v1/verify')return response({user,access_token:'valid',refresh_token:'refresh'});
  if(u.pathname==='/rest/v1/ss_teams')return response(u.searchParams.get('id')&&u.searchParams.get('id')!=='eq.'+team.id?[]:[team]);
  if(u.pathname==='/rest/v1/ss_roster')return response(members);
  if(u.pathname==='/rest/v1/ss_preferences')return response([{user_id:user.id,tiers:{Jett:4}}]);
  if(u.pathname==='/rest/v1/ss_observations'||u.pathname==='/rest/v1/ss_lineups')return response([]);
  throw Error('Unexpected backend request '+u.pathname);
 };
 try{
  const anonymous=await invoke('state');assert.equal(anonymous.data.user,null);assert.equal(anonymous.data.storageReady,true);assert.equal(calls.length,0);
  const pending=await invoke('auth',{register:true,email:user.email,name:'Captain',password:'  untrimmed password  '});assert.equal(pending.data.confirmationRequired,true);assert.equal(pending.headers['Set-Cookie'],undefined);assert.equal(calls.at(-1).body.password,'  untrimmed password  ');
  const verified=await invoke('verify',{email:user.email,code:'123456'});assert.match(verified.headers['Set-Cookie'][0],/HttpOnly/);
  const signed=await invoke('auth',{email:user.email,password:'a long password'});assert.equal(signed.data.confirmationRequired,false);assert.equal(signed.headers['Set-Cookie'].length,2);
  const refreshed=await invoke('state',{},'ss_access=expired; ss_refresh=refresh');assert.equal(refreshed.data.user.id,user.id);assert.match(refreshed.headers['Set-Cookie'][1],/rotated/);
  const own=await invoke('state',{},'ss_access=valid');assert.equal(own.data.members.length,5);assert.deepEqual(own.data.personal,{Jett:4});
  await assert.rejects(invoke('personal',{tiers:{Jett:4}}),/Sign in/);
  await invoke('personal',{tiers:{Jett:4}},'ss_access=valid');assert.equal(calls.at(-1).body.user_id,user.id);assert.equal(calls.at(-1).options.headers.Authorization,'Bearer valid');
  await assert.rejects(invoke('personal',{tiers:{constructor:4}},'ss_access=valid'),/known agent/);
  await assert.rejects(invoke('member',{teamId:'b0000000-0000-4000-8000-000000000099',name:'Intruder',status:'Starter'},'ss_access=valid'),/Only this team/);
  await assert.rejects(invoke('logout',{},'ss_access=valid','GET'),/POST/);
  await invoke('save',{teamId:team.id,players:members.map(m=>m.id),map:'Ascent',weight:70,ratedOnly:true},'ss_access=valid');
  const saved=calls.at(-1).body;assert.equal(saved.body.result.assignment.length,5);assert.equal(saved.body.result.patch,'13.08');assert.equal(saved.body.result.comfort,100);
  await assert.rejects(invoke('save',{teamId:team.id,players:Array(5).fill(members[0].id),map:'Ascent',weight:70},'ss_access=valid'),/different players/);
  const logout=await invoke('logout',{},'ss_access=valid');assert.ok(logout.headers['Set-Cookie'].every(c=>c.includes('Max-Age=0')));
  loginFailure=true;await assert.rejects(invoke('auth',{email:user.email,password:'a long password'}),/Invalid login/);
 }finally{globalThis.fetch=original;}
});
test('team model inputs are bounded and unknown agents rejected',()=>{
 assert.throws(()=>validateSettings({adjustments:{Jett:51}}));assert.throws(()=>validateSettings({adjustments:{Fake:2}}));assert.throws(()=>validateSettings({excluded:['Fake']}));assert.equal(validateSettings({}).requireRoles,true);
});
