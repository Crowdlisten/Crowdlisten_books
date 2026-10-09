import test from 'node:test';import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';import {mkdtemp,writeFile,readFile,rm,stat} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join,resolve} from 'node:path';
import {parseArgs} from '../src/commands.js';import {uploadFiles,extractSource} from '../src/upload.js';import {hash,saveCredentials,credentials} from '../src/account.js';import {zipSync,strToU8} from 'fflate';
const cli=resolve('bin/answer-with-books.js');
function run(args){return spawnSync(process.execPath,[cli,...args],{encoding:'utf8',env:{...process.env,ANSWER_WITH_BOOKS_CONFIG_DIR:'/tmp/awb-test-missing-session',ANSWER_WITH_BOOKS_API_URL:''}});}
test('public catalog, aliases, filtering, relevance floor and explicit book selection',()=>{
 const books=run(['books','--public','--json']);assert.equal(books.status,0,books.stderr);assert.ok(JSON.parse(books.stdout).count>=40);
 const list=run(['list','mom','test','--json']);assert.equal(JSON.parse(list.stdout).books[0].id,'the-mom-test');
 assert.equal(JSON.parse(run(['books','--topic','nonexistent-topic-123','--json']).stdout).count,0);
 assert.deepEqual(JSON.parse(run(['ask','Should I move to Mars?','--json']).stdout).objects.books,[]);
 assert.equal(JSON.parse(run(['answer','How do I choose a career where I can do great work?','--json']).stdout).status,'hit');
 const selected=run(['ask','Plan a customer interview','--book','the-mom-test','--json']);assert.equal(selected.status,0,selected.stderr);assert.ok(JSON.parse(selected.stdout).selected_book_notes?.length>100);
 assert.equal(run(['ask','x','--book','missing-id','--json']).status,1);
 assert.equal(run(['books','--private']).status,1);
});
test('argument parser separates booleans, file paths, and value flags',()=>{
 assert.deepEqual(parseArgs(['--json','book.pdf','--topic','habits']).positionals,['book.pdf']);
 assert.throws(()=>parseArgs(['--topic']),/Missing value/);assert.throws(()=>parseArgs(['--typo']),/Unknown option/);assert.throws(()=>parseArgs(['--public','--private']),/either/);
 assert.equal(parseArgs(['--','--not-an-option.pdf']).positionals[0],'--not-an-option.pdf');
});
test('session files are private and outside the project',async t=>{
 const dir=await mkdtemp(join(tmpdir(),'book-cli-session-'));t.after(()=>rm(dir,{recursive:true,force:true}));const previous=process.env.ANSWER_WITH_BOOKS_CONFIG_DIR;process.env.ANSWER_WITH_BOOKS_CONFIG_DIR=dir;t.after(()=>{if(previous===undefined)delete process.env.ANSWER_WITH_BOOKS_CONFIG_DIR;else process.env.ANSWER_WITH_BOOKS_CONFIG_DIR=previous;});
 await saveCredentials({token:'awb_cli_'+'a'.repeat(64),expires_at:new Date(Date.now()+60000).toISOString()});assert.ok((await credentials(true)).token);
 assert.equal((await stat(join(dir,'session.json'))).mode&0o777,0o600);
 await saveCredentials({token:'awb_cli_'+'a'.repeat(64),expires_at:'2000-01-01'});await assert.rejects(()=>credentials(true),/Sign in/);
});
test('batch reuses fingerprints, offers public matches, stages sources, and isolates failures',async t=>{
 const dir=await mkdtemp(join(tmpdir(),'book-cli-upload-'));t.after(()=>rm(dir,{recursive:true,force:true}));
 const text='# Original source\n'+('Make a small reversible decision and test the result. '.repeat(10));
 const names=['cached.md','The Mom Test.pdf','new.md','empty.txt'];
 await Promise.all(names.map(name=>writeFile(join(dir,name),name==='empty.txt'?'':text+name)));
 let extracts=0,puts=0;const calls=[];
 const deps={extract:async()=>{extracts++;return {text,headings:[],extractor:'fixture'};},put:async()=>{puts++;},call:async b=>{calls.push(b);if(b.action==='lookup')return b.sha===hash(Buffer.from(text+'cached.md'))?{reused:true,job:{id:'cached',status:'ready'}}:{reused:false};if(b.action==='prepare')return {job:{id:'new'},upload:{},textUpload:{}};return {};}};
 const results=await uploadFiles(names.map(name=>join(dir,name)),{publicBooks:[{id:'the-mom-test',title:'The Mom Test',author:'Rob Fitzpatrick'}]},deps);
 assert.deepEqual(results.map(r=>r.status),['ready','library_match','queued','error']);assert.equal(extracts,1);assert.equal(puts,2);assert.ok(calls.some(c=>c.action==='finalize'));
 assert.equal(calls.find(c=>c.action==='prepare').options.depth,'study');
});
test('real pinned extraction supports Markdown, HTML, RTF, EPUB, DOCX and searchable PDF without Python',async()=>{
 const text='A useful method starts with an observation. Write down what happened, separate evidence from assumptions, and choose a small reversible test. '.repeat(4);
 const cases=[['.md',Buffer.from('# Test Method\n'+text)],['.html',Buffer.from('<h1>Test Method</h1><p>'+text+'</p>')],['.rtf',Buffer.from('{\\rtf1\\ansi '+text+'}')],['.epub',zipSync({'META-INF/container.xml':strToU8('<?xml version="1.0"?><container><rootfiles><rootfile full-path="content.opf"/></rootfiles></container>'),'content.opf':strToU8('<package><metadata/><manifest><item id="c" href="chapter.xhtml" media-type="application/xhtml+xml"/></manifest><spine><itemref idref="c"/></spine></package>'),'chapter.xhtml':strToU8('<html><body><h1>Test Method</h1><p>'+text+'</p></body></html>')})],['.docx',zipSync({'word/document.xml':strToU8('<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>'+text+'</w:t></w:r></w:p></w:body></w:document>')})]];
 const stream='BT /F1 12 Tf 50 750 Td ('+text+') Tj ET';
 const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`];
 let pdf='%PDF-1.4\n',offsets=[0];objects.forEach((obj,i)=>{offsets.push(pdf.length);pdf+=`${i+1} 0 obj\n${obj}\nendobj\n`;});const xref=pdf.length;pdf+='xref\n0 6\n0000000000 65535 f \n'+offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')+`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
 cases.push(['.pdf',Buffer.from(pdf)]);
 for(const [extension,bytes] of cases){const result=await extractSource(bytes,extension);assert.match(result.text,/observation/i,extension);assert.ok(result.upstreamCommit,extension);}
});

test('private evidence limits long sources and preserves exact citation line numbers',async()=>{
 const {bookEvidence}=await import('../src/book-evidence.js');
 const evidence=bookEvidence({'skill/SKILL.md':'# Skill\nRead S1:L2-L3.','skill/chapters/01.md':'Interview customers about past behavior. [S1:L2-L3]','skill/chapters/02.md':'Unrelated astronomy.','skill/source.txt':'line one\nPast behavior\nObserve the details\n'+'other\n'.repeat(10000)},'Interview customers');
 assert.equal(evidence.citations[0].start_line,2);assert.equal(evidence.citations[0].text,'2: Past behavior\n3: Observe the details');assert.equal(evidence.files['skill/source.txt'],undefined);assert.equal(evidence.available_chapters.length,2);assert.equal(evidence.complete,false);
});

test('paid upload finalizes staged text but never enqueues before price acceptance',async t=>{
 const dir=await mkdtemp(join(tmpdir(),'awb-paid-upload-'));t.after(()=>rm(dir,{recursive:true,force:true}));
 const file=join(dir,'source.txt');await writeFile(file,'Source observation. '.repeat(20));
 for(const staged of [false,true]){
  const calls=[];const results=await uploadFiles([file],{},{call:async b=>{calls.push(b.action);return b.action==='lookup'?{reused:false}:{job:{id:'paid',billing_required:true},...(staged?{textUpload:{}}:{})};},extract:async()=>({text:'Source observation. '.repeat(20)}),put:async()=>{}});
  assert.equal(results[0].status,'awaiting_price_acceptance');assert.equal(calls.includes('enqueue'),false);assert.equal(calls.includes('finalize'),staged);
 }
});


test('metered book operations bind the explicit policy and maximum additional spend',async()=>{
 const {bookOperation}=await import('../src/book-operations.js');const calls=[],id='10000000-0000-4000-8000-000000000001';
 const deps={session:{},resolve:async x=>x,call:async x=>{calls.push(x);return {};}};
 await bookOperation('quote',id,{ceilingCents:250},deps);
 await bookOperation('accept-price',id,{quote:id,ceilingCents:250},deps);
 assert.deepEqual(calls,[{action:'quote',id,ceilingCents:250},{action:'accept-price',id,quoteId:id,acceptedCeilingCents:250,pricingModel:'token-usage-v1'}]);
 assert.equal(parseArgs(['--ceiling-cents','250']).values.ceilingCents,'250');
 await assert.rejects(bookOperation('quote',id,{ceilingCents:-1},deps),/positive integer/);
});
