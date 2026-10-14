import {cpSync,mkdirSync,rmSync} from 'node:fs';
const root=new URL('../',import.meta.url);
const dist=new URL('dist/',root);
rmSync(dist,{recursive:true,force:true});mkdirSync(dist,{recursive:true});
cpSync(new URL('public/',root),dist,{recursive:true});
cpSync(new URL('engine.mjs',root),new URL('engine.js',dist));
console.log('Built static frontend in dist/');
