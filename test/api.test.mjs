import test from 'node:test';import assert from 'node:assert/strict';import {spawn} from 'node:child_process';import {mkdtempSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';import {once} from 'node:events';
test('persistent team workflow and authorization boundaries',async()=>{
 const data=mkdtempSync(join(tmpdir(),'stratstack-test-'));const port=32000+Math.floor(Math.random()*10000);const child=spawn(process.execPath,['server.mjs'],{cwd:new URL('..',import.meta.url),env:{...process.env,PORT:String(port),DATA_DIR:data},stdio:['ignore','pipe','pipe']});
 try{await Promise.race([once(child.stdout,'data'),once(child,'exit').then(()=>{throw Error('Server failed to start')})]);async function call(path,body,cookie,origin){const r=await fetch(`http://127.0.0.1:${port}/api/${path}`,{method:body?'POST':'GET',headers:{...(body?{'Content-Type':'application/json'}:{}),...(cookie?{cookie}:{}),...(origin?{origin}:{})},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};}
 const a=await call('auth',{register:true,email:'captain@example.com',name:'Captain',password:'secret-password'});assert.equal(a.status,200);assert.ok(a.cookie);
 const team=await call('team',{name:'Test roster'},a.cookie);assert.equal(team.status,200);const teamId=team.data.teamId;
 let s=await call('state',undefined,a.cookie);assert.equal(s.data.members.length,1);assert.equal(s.data.team.name,'Test roster');
 for(let i=0;i<4;i++)assert.equal((await call('member',{teamId,name:'Player '+i,status:i===3?'Sub':'Starter'},a.cookie)).status,200);
 s=await call('state',undefined,a.cookie);assert.equal(s.data.members.length,5);
 const m=s.data.members[0];assert.equal((await call('tiers',{teamId,id:m.id,tiers:{Jett:4,Omen:3}},a.cookie)).status,200);
 assert.equal((await call('tiers',{teamId,id:m.id,tiers:{FakeAgent:4}},a.cookie)).status,400);
 const b=await call('auth',{register:true,email:'sub@example.com',name:'Sub',password:'another-secret'});
 assert.equal((await call('member',{teamId,name:'Intruder',status:'Starter'},b.cookie)).status,403);
 assert.equal((await call('join',{code:s.data.team.code},b.cookie)).status,200);
 assert.equal((await call('tiers',{teamId,id:m.id,tiers:{Jett:1}},b.cookie)).status,403);
 const sb=await call('state',undefined,b.cookie);const own=sb.data.members.find(m=>m.user_id===sb.data.user.id);assert.equal(own.status,'Sub');assert.equal((await call('tiers',{teamId,id:own.id,tiers:{Raze:4}},b.cookie)).status,200);
 const record={team:'Observed team',map:'Ascent',agents:['Jett','Sova','KAY/O','Omen','Killjoy'],sample:2,date:'2025-01-01',source:'https://www.vlr.gg/123'};
 assert.equal((await call('records',{teamId,records:[record]},b.cookie)).status,403);
 assert.equal((await call('records',{teamId,records:[record]},a.cookie)).status,200);
 assert.equal((await call('records',{teamId,records:[{...record,source:'javascript:alert(1)'}]},a.cookie)).status,400);
 assert.equal((await call('records',{teamId,records:[record,{...record,agents:['Jett']}]},a.cookie)).status,400);
 assert.equal((await call('save',{teamId,players:s.data.members.map(m=>m.id),map:'Ascent',weight:70},a.cookie)).status,200);
 const final=await call('state',undefined,a.cookie);assert.equal(final.data.records.filter(r=>r.team==='Observed team').length,1);assert.equal(final.data.saved.length,1);assert.equal(final.data.saved[0].result.assignment.length,5);
 assert.equal((await call('team',{name:'CSRF'},a.cookie,'https://evil.example')).status,403);
 await call('logout',{},a.cookie);assert.equal((await call('state',undefined,a.cookie)).data.user,null);
 assert.equal((await call('auth',{email:'captain@example.com',password:'wrong-password'})).status,401);
 assert.equal((await call('auth',{email:'captain@example.com',password:'secret-password'})).status,200);
 }finally{if(child.exitCode===null){child.kill();await once(child,'exit');}rmSync(data,{recursive:true,force:true});}
});
