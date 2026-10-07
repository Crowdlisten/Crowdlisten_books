import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,rm,mkdir,readlink,symlink,stat,readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {installBook,syncLibrary,exportFiles,checkedPackage} from '../src/book-install.js';
import {accountKey,accountCache,serviceCall} from '../src/account.js';
import {bookOperation} from '../src/book-operations.js';
import {uploadFiles} from '../src/upload.js';
import {parseArgs} from '../src/commands.js';
import {filterBooks} from '../src/library-cli.js';
import {bookCard,bookDocument} from '../src/semantic.js';

const bookId='10000000-0000-4000-8000-000000000001';
const revisionId='20000000-0000-4000-8000-000000000001';
const nextId='20000000-0000-4000-8000-000000000002';
const sessionA={user_id:'account-a',token:'awb_cli_'+'a'.repeat(64)};
const sessionB={user_id:'account-b',token:'awb_cli_'+'b'.repeat(64)};
const book={id:revisionId,book_id:bookId,revision:1,status:'ready',is_current:true,source_kind:'full-source',title:'A method',visibility:'private'};
const next={...book,id:nextId,revision:2};
function bundle(b=book){return {files:{'skill/SKILL.md':'---\nname: method\ndescription: Apply this method.\n---\n# Method\nRead chapters/01.md.','skill/package.json':JSON.stringify({bookId:b.book_id,revisionId:b.id,revision:b.revision,sourceKind:b.source_kind}),'skill/source.txt':'Evidence line one\nEvidence line two\n','skill/chapters/01.md':'# Method\nAct on observed evidence. [S1:L1-L2]\nRevision '+b.revision,'skill/chapters/02.md':'# Second method\nA second useful method.','book/digest.md':'# Digest'}};}
async function setup(t){
 const dir=await mkdtemp(join(tmpdir(),'awb-account-books-'));t.after(()=>rm(dir,{recursive:true,force:true}));
 const deps={session:sessionA,books:[book],skillsDir:join(dir,'skills'),cacheRoot:join(dir,'cache-a'),call:async()=>bundle()};
 return {dir,deps};
}
test('two accounts install identical book IDs separately, preserve all files, and update atomically',async t=>{
 const {dir,deps}=await setup(t);
 const a=await installBook(bookId,{},deps),b=await installBook(bookId,{}, {...deps,session:sessionB,cacheRoot:join(dir,'cache-b')});
 assert.notEqual(a.path,b.path);assert.notEqual(accountKey(sessionA),accountKey(sessionB));assert.notEqual(accountCache(sessionA),accountCache(sessionB));
 assert.equal(await readFile(join(a.path,'chapters/02.md'),'utf8'),bundle().files['skill/chapters/02.md']);
 assert.equal(await readFile(join(a.path,'source.txt'),'utf8'),bundle().files['skill/source.txt']);
 assert.equal(await readFile(join(a.path,'exported/book/digest.md'),'utf8'),'# Digest');
 const oldLink=await readlink(a.path);const otherLink=await readlink(b.path);
 assert.equal((await installBook(bookId,{},deps)).status,'unchanged');
 const updated=await installBook(bookId,{}, {...deps,books:[next],call:async()=>bundle(next)});
 assert.equal(updated.path,a.path);assert.equal(updated.status,'updated');assert.notEqual(await readlink(a.path),oldLink);assert.equal(await readlink(b.path),otherLink);
 assert.match(await readFile(join(a.path,'chapters/01.md'),'utf8'),/Revision 2/);
 assert.match(await readFile(join(oldLink,'chapters/01.md'),'utf8'),/Revision 1/);
 assert.equal((await stat(join(await readlink(a.path),'source.txt'))).mode&0o777,0o600);
 const manifest=JSON.parse(await readFile(join(a.path,'.awb-install.json'),'utf8'));
 assert.equal(manifest.accountKey,accountKey(sessionA));assert.equal(manifest.revision,2);assert.ok(manifest.files['source.txt']);assert.doesNotMatch(JSON.stringify(manifest),/awb_cli_/);
});
test('failed export or atomic switch keeps the previous installed version intact',async t=>{
 const {deps}=await setup(t),installed=await installBook(bookId,{},deps),old=await readlink(installed.path);
 const updated={...deps,books:[next],call:async()=>bundle(next)};
 await assert.rejects(()=>installBook(bookId,{}, {...updated,call:async()=>{throw new Error('service unavailable');}}),/unavailable/);
 assert.equal(await readlink(installed.path),old);
 await assert.rejects(()=>installBook(bookId,{}, {...updated,rename:async()=>{throw new Error('switch failure');}}),/switch failure/);
 assert.equal(await readlink(installed.path),old);assert.match(await readFile(join(installed.path,'chapters/01.md'),'utf8'),/Revision 1/);
 assert.ok(!(await readdir(deps.skillsDir)).some(p=>p.startsWith('.awb-link-')));
 assert.equal((await installBook(bookId,{},updated)).status,'updated');
});
test('edited, extra, missing, or symlinked files refuse an update without discarding user work',async t=>{
 for(const kind of ['edited','extra','missing','symlink']){
  const {dir,deps}=await setup(t),installed=await installBook(bookId,{},deps),link=await readlink(installed.path);
  if(kind==='edited')await writeFile(join(installed.path,'chapters/01.md'),'user changes');
  if(kind==='extra')await writeFile(join(installed.path,'notes.md'),'personal notes');
  if(kind==='missing')await rm(join(installed.path,'chapters/02.md'));
  if(kind==='symlink'){await rm(join(installed.path,'source.txt'));const outside=join(dir,'outside.txt');await writeFile(outside,'outside');await symlink(outside,join(installed.path,'source.txt'));}
  await assert.rejects(()=>installBook(bookId,{}, {...deps,books:[next],call:async()=>bundle(next)}),/user-edited|symbolic link/);
  assert.equal(await readlink(installed.path),link);
  if(kind==='edited')assert.equal(await readFile(join(installed.path,'chapters/01.md'),'utf8'),'user changes');
 }
});
test('unmanaged paths, foreign links and symlinked cache ancestors are rejected',async t=>{
 const {dir,deps}=await setup(t),installed=await installBook(bookId,{},deps);
 await rm(installed.path);await mkdir(installed.path);await writeFile(join(installed.path,'SKILL.md'),'user owned');
 await assert.rejects(()=>installBook(bookId,{},deps),/unmanaged/);
 await rm(installed.path,{recursive:true});await symlink(dir,installed.path);
 await assert.rejects(()=>installBook(bookId,{},deps),/foreign/);
 const real=join(dir,'real');await mkdir(real);const link=join(dir,'linked');await symlink(real,link);
 await assert.rejects(()=>installBook(bookId,{}, {...deps,cacheRoot:join(link,'cache')}),/Unsafe library directory/);
});
test('foreign account cannot adopt an existing cached payload even if pointed at the same cache root',async t=>{
 const {deps}=await setup(t);await installBook(bookId,{},deps);
 await assert.rejects(()=>installBook(bookId,{}, {...deps,session:sessionB}),/different account/);
});
test('package identity, completeness, review, and path schemas are enforced before installation',async t=>{
 const {deps}=await setup(t);
 for(const path of ['../escape','skill/../escape','skill/./x','/absolute','skill/a\\b','skill/C:bad','skill/x\u0000bad','skill/.awb-install.json','skill/exported/book.md']){
  const data=bundle();data.files[path]='bad';
  await assert.rejects(()=>installBook(bookId,{}, {...deps,call:async()=>data}),/Invalid|Reserved/);
 }
 for(const [a,b] of [['skill/x','skill/X'],['skill/x','skill/x/y'],['skill/café','skill/cafe\u0301']]){
  assert.throws(()=>exportFiles({files:{[a]:'a',[b]:'b'}}),/Colliding/);
 }
 const wrong=bundle(next);assert.throws(()=>checkedPackage(wrong,book),/identity/);
 const incomplete=bundle();delete incomplete.files['skill/source.txt'];assert.throws(()=>checkedPackage(incomplete,book),/citation source/);
 const findings=[{path:'skill/SKILL.md',rule_id:'frontmatter.allowed_tools'}];
 await assert.rejects(()=>installBook(bookId,{}, {...deps,call:async body=>{assert.equal(body.reviewAccepted,false);return {...bundle(),findings};}}),e=>{assert.deepEqual(e.findings,findings);return true;});
 assert.equal((await installBook(bookId,{acceptReview:true},{...deps,call:async body=>{assert.equal(body.reviewAccepted,true);return {...bundle(),findings};}})).status,'installed');
 for(const overrides of [{status:'processing'},{is_current:false},{source_kind:'editorial_digest'}])await assert.rejects(()=>installBook(bookId,{}, {...deps,books:[{...book,...overrides}]}),/ready, current full-source/);
 await assert.rejects(()=>installBook('atomic-habits',{},deps),/Public editorial/);
});
test('sync skips incomplete/noncurrent/editorial books and isolates failure from other books',async t=>{
 const {deps}=await setup(t),other={...book,book_id:'30000000-0000-4000-8000-000000000001',id:'40000000-0000-4000-8000-000000000001'};
 const result=await syncLibrary({}, {...deps,list:async()=>[book,{...next,is_current:false},{...book,status:'processing'},other],call:async body=>{if(body.id===other.id)throw new Error('Review required');return bundle();}});
 assert.deepEqual(result.results.map(r=>r.status),['installed','skipped','skipped','error']);
});
test('parser, operations and private discovery expose revision controls and useful method metadata',async()=>{
 const {values}=parseArgs(['book.pdf','--book',bookId,'--revision','append','--mode','analysis','--extraction','technical']);
 assert.deepEqual(values,{book:bookId,revision:'append',mode:'analysis',extraction:'technical'});
 const calls=[],deps={session:sessionA,resolve:async()=>revisionId,call:async(body,session)=>{assert.equal(session,sessionA);calls.push(body);return {job:book};}};
 for(const action of ['pause','retry','generate','revisions','status'])await bookOperation(action,bookId,{},deps);
 await assert.rejects(()=>bookOperation('activate',nextId,{},deps),/--accept-review/);
 await bookOperation('activate',nextId,{acceptReview:true},{...deps,resolve:async()=>nextId});assert.deepEqual(calls.at(-1),{action:'activate',id:nextId,reviewAccepted:true});
 const rich={...book,one_liner:'Good decisions under uncertainty',read_if:'A decision needs a test',tags:['uncertainty'],methods:[{name:'Reversible test'}]};
 assert.equal(filterBooks([rich],'reversible').length,1);assert.deepEqual(bookCard(rich).methods,rich.methods);assert.match(bookDocument(rich).text,/Reversible/);
});
test('native Kindle/technical uploads bypass local extraction and revision uploads bypass old-source lookup',async t=>{
 const {dir}=await setup(t),file=join(dir,'book.azw3');await writeFile(file,'kindle bytes');
 const calls=[],puts=[],nativeCall=async body=>{calls.push(body);return body.action==='prepare'?{job:next,upload:{path:'native/source',token:'signed'}}:{job:next};};
 const results=await uploadFiles([file],{book:revisionId,revision:'append',mode:'analysis',extraction:'technical'},{call:async()=>{throw new Error('must not lookup existing revision source');},extract:async()=>{throw new Error('must not extract locally');},nativeCall,put:async(upload,bytes)=>puts.push([upload,bytes])});
 assert.equal(results[0].status,'queued');assert.equal(calls[0].parentId,revisionId);assert.equal(calls[0].revisionKind,'append');assert.equal(calls[0].extractionMode,'technical');assert.equal(calls[0].options.mode,'analysis');assert.equal(calls[1].action,'finalize');assert.equal(puts.length,1);
 const textFile=join(dir,'new.md');await writeFile(textFile,'text');const normal=[];
 const out=await uploadFiles([textFile],{book:revisionId,revision:'replace',mode:'full'},{call:async body=>{normal.push(body);return {job:next,upload:{},textUpload:{}};},extract:async()=>({text:'An observed method. '.repeat(20)}),put:async()=>{}});
 assert.equal(out[0].status,'queued');assert.deepEqual(normal.map(c=>c.action),['prepare','finalize']);assert.equal(normal[0].revisionKind,'replace');assert.equal(normal[0].parentId,revisionId);
 await assert.rejects(()=>uploadFiles([textFile],{book:revisionId}),/together/);await assert.rejects(()=>uploadFiles([file,textFile],{book:revisionId,revision:'append'}),/exactly one/);
});
test('actual CLI installs and syncs a schema-valid service export without extractor dependencies or credential output',async t=>{
 const {dir}=await setup(t),config=join(dir,'config');await mkdir(config);
 await writeFile(join(config,'session.json'),JSON.stringify({...sessionA,expires_at:new Date(Date.now()+60000).toISOString()}),{mode:0o600});
 const preload=join(dir,'service.mjs');
 await writeFile(preload,`const book=${JSON.stringify(book)},bundle=${JSON.stringify(bundle())};globalThis.fetch=async(url,options)=>{const body=JSON.parse(options.body);if(!options.headers.Authorization)throw Error('missing authorization');return {ok:true,json:async()=>body.action==='list'?{books:[book],next_offset:null}:body.action==='export'?bundle:{job:book}}};`);
 const env={...process.env,ANSWER_WITH_BOOKS_CONFIG_DIR:config,ANSWER_WITH_BOOKS_CACHE_DIR:join(dir,'cache'),CODEX_HOME:join(dir,'codex'),ANSWER_WITH_BOOKS_API_URL:''};
 for(const args of [['library','install-book',bookId,'--json'],['library','sync','--json'],['install-book',bookId,'--json'],['revisions',bookId,'--json']]){
  const child=spawnSync(process.execPath,['--import',preload,resolve('bin/answer-with-books.js'),...args],{env,encoding:'utf8'});
  assert.equal(child.status,0,child.stderr);assert.doesNotMatch(child.stdout+child.stderr,/awb_cli_/);assert.ok(JSON.parse(child.stdout));
 }
});
test('service failures redact credentials from errors and review findings',async()=>{
 const token=sessionA.token;
 await assert.rejects(()=>serviceCall('book-process',{action:'list'},token,async()=>({ok:false,status:403,json:async()=>({error:'Rejected '+token,findings:[{message:'Do not print '+token}]})})),error=>{
  assert.doesNotMatch(error.message+JSON.stringify(error.findings),/awb_cli_/);assert.match(error.message,/redacted/);return true;
 });
});
test('unfinished native source retries use native worker and cannot queue placeholder text or pause',async()=>{
 const calls=[],nativeCalls=[];
 const deps={session:sessionA,resolve:async()=>revisionId,call:async(body)=>{calls.push(body);return {job:{...book,source_import:{kind:'native',state:'failed'}}};},nativeCall:async(body)=>{nativeCalls.push(body);return {job:{...book,status:'queued'}};}};
 await bookOperation('retry',revisionId,{},deps);
 assert.deepEqual(nativeCalls,[{action:'retry',id:revisionId}]);assert.deepEqual(calls,[{action:'status',id:revisionId}]);
 await assert.rejects(()=>bookOperation('pause',revisionId,{},deps),/cannot be paused/);
 await assert.rejects(()=>bookOperation('generate',revisionId,{},deps),/must finish/);
 const completed=[];
 await bookOperation('retry',revisionId,{}, {...deps,call:async(body)=>{completed.push(body);return {job:{...book,source_import:{kind:'native',state:'complete'}}};}});
 assert.deepEqual(completed.map(b=>b.action),['status','retry']);assert.equal(nativeCalls.length,1);
});
