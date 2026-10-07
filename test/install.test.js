import test from 'node:test';import assert from 'node:assert/strict';import {mkdtempSync,readFileSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import {join,resolve} from 'node:path';import {spawnSync,spawn} from 'node:child_process';
test('npm tarball installs a self-contained skill and HTTP API in an empty directory',async t=>{
 const temp=mkdtempSync(join(tmpdir(),'awb-packed-install-'));t.after(()=>rmSync(temp,{recursive:true,force:true}));
 const packed=spawnSync('npm',['pack','--json','--pack-destination',temp],{encoding:'utf8'});assert.equal(packed.status,0,packed.stderr);const tar=join(temp,JSON.parse(packed.stdout)[0].filename);
 assert.equal(spawnSync('tar',['-xzf',tar,'-C',temp]).status,0);
 const cli=join(temp,'package/bin/answer-with-books.js');const env={...process.env,CODEX_HOME:join(temp,'codex')};delete env.ANSWER_WITH_BOOKS_API_URL;
 const installed=spawnSync(process.execPath,[cli,'install','--skill','--api'],{cwd:temp,env,encoding:'utf8'});assert.equal(installed.status,0,installed.stderr);assert.doesNotMatch(installed.stdout,/npm run dev/);
 const skillDir=join(env.CODEX_HOME,'skills/answer-with-books');assert.equal(readFileSync(join(skillDir,'SKILL.md'),'utf8'),readFileSync(resolve('skill/answer-with-books/SKILL.md'),'utf8'));
 for(const executable of [cli,join(skillDir,'runtime/bin/answer-with-books.js')]){
 const result=spawnSync(process.execPath,[executable,'ask','Am I validating this idea or collecting compliments?','--json'],{cwd:temp,env,encoding:'utf8'});assert.equal(result.status,0,result.stderr);assert.equal(JSON.parse(result.stdout).status,'hit');
 const match=spawnSync(process.execPath,[executable,'match','如何养成习惯？','--public','--catalog','--json'],{cwd:temp,env,encoding:'utf8'});assert.equal(match.status,0,match.stderr);assert.equal(JSON.parse(match.stdout).status,'needs_reasoning');assert.ok(JSON.parse(match.stdout).candidates.some(b=>b.id==='atomic-habits'));
 }
 const server=spawn(process.execPath,[join(temp,'.answer-with-books/runtime/src/server.js')],{cwd:temp,env:{...env,PORT:'0'},stdio:['ignore','pipe','pipe']});
 t.after(()=>server.kill());let out='',stderr='';server.stderr.on('data',x=>stderr+=x);const base=await new Promise((res,rej)=>{const timer=setTimeout(()=>rej(Error('server timeout: '+stderr)),30000);server.stdout.on('data',x=>{out+=x;const m=out.match(/http:\/\/127\.0\.0\.1:(\d+)/);if(m){clearTimeout(timer);res(m[0]);}});server.on('error',error=>{clearTimeout(timer);rej(error);});server.on('exit',code=>{clearTimeout(timer);rej(Error('server exited '+code+': '+stderr));});});
 assert.equal((await (await fetch(base+'/health')).json()).version,'0.3.0');
 const result=await (await fetch(base+'/v1/ask',{method:'POST',body:JSON.stringify({question:'Should I move to Mars?'})})).json();assert.equal(result.status,'new_question');assert.deepEqual(result.books,[]);
 assert.equal((await fetch(base+'/v1/questions')).status,403);
});
