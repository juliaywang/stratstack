import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {mkdtempSync,existsSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
test('Vercel API renders demo without writing a temporary database',async()=>{
 const directory=mkdtempSync(join(tmpdir(),'stratstack-vercel-'));
 const child=spawn(process.execPath,['--input-type=module','-e',"import http from 'node:http';import api from './api/index.mjs';const s=http.createServer(api).listen(0,'127.0.0.1',()=>console.log(s.address().port));"],{cwd:new URL('..',import.meta.url),env:{...process.env,DATA_BACKEND:'legacy',VERCEL:'1',TURSO_DATABASE_URL:'',DATA_DIR:join(directory,'missing')},stdio:['ignore','pipe','pipe']});
 try{
  const [output]=await Promise.race([once(child.stdout,'data'),once(child,'exit').then(()=>{throw Error('API failed to start')})]);
  const origin='http://127.0.0.1:'+String(output).trim();
  const response=await fetch(origin+'/api/index?route=state');assert.equal(response.status,200);
  const state=await response.json();assert.equal(state.storageReady,false);assert.equal(state.records.length,28);assert.ok(state.maps.includes('Lotus'));
  const auth=await fetch(origin+'/api/index?route=auth',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:'a@example.com',password:'password1234'})});assert.equal(auth.status,503);
  assert.equal(existsSync(join(directory,'missing')),false);
  for(const path of ['index.html','app.js','style.css','engine.js','maps/lotus.jpg','fonts/inter-400.woff2'])assert.ok(existsSync(new URL('../dist/'+path,import.meta.url)),path);
  assert.match(readFileSync(new URL('../dist/app.js',import.meta.url),'utf8'),/storageReady/);
 }finally{if(child.exitCode===null){child.kill();await once(child,'exit')}rmSync(directory,{recursive:true,force:true});}
});
