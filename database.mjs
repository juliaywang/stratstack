import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const schema = [
 'CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,email TEXT UNIQUE,name TEXT,password TEXT)',
 'CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,user_id TEXT,expires INTEGER)',
 'CREATE TABLE IF NOT EXISTS teams(id TEXT PRIMARY KEY,name TEXT,owner TEXT,code TEXT UNIQUE)',
 'CREATE TABLE IF NOT EXISTS members(id TEXT PRIMARY KEY,team_id TEXT,user_id TEXT,name TEXT,status TEXT,tiers TEXT)',
 'CREATE TABLE IF NOT EXISTS records(id TEXT PRIMARY KEY,team_id TEXT,body TEXT)',
 'CREATE TABLE IF NOT EXISTS saved(id TEXT PRIMARY KEY,team_id TEXT,body TEXT)',
];
export async function connectDatabase() {
 if (process.env.TURSO_DATABASE_URL) {
  const { createClient } = await import('@libsql/client');
  const client = createClient({url:process.env.TURSO_DATABASE_URL,authToken:process.env.TURSO_AUTH_TOKEN});
  await client.batch(schema,'write');
  return {
   get: async(sql,...args)=>(await client.execute({sql,args})).rows[0],
   all: async(sql,...args)=>(await client.execute({sql,args})).rows,
   run: async(sql,...args)=>client.execute({sql,args}),
   batch: async(statements)=>client.batch(statements,'write'),
  };
 }
 // Never store accounts on Vercel's temporary or read-only filesystem.
 if (process.env.VERCEL) return null;
 const {DatabaseSync}=await import('node:sqlite');
 const directory=process.env.DATA_DIR||fileURLToPath(new URL('./data',import.meta.url));
 mkdirSync(directory,{recursive:true});
 const db=new DatabaseSync(directory+'/app.sqlite');
 db.exec('PRAGMA foreign_keys=ON;'+schema.join(';'));
 return {
  get:(sql,...args)=>db.prepare(sql).get(...args),
  all:(sql,...args)=>db.prepare(sql).all(...args),
  run:(sql,...args)=>db.prepare(sql).run(...args),
  batch:(statements)=>{db.exec('BEGIN');try{for(const {sql,args} of statements)db.prepare(sql).run(...args);db.exec('COMMIT')}catch(e){db.exec('ROLLBACK');throw e;}},
 };
}
