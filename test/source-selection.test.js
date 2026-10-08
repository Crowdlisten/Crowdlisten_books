import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm,symlink} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {expandSources,collectionText} from '../src/source-selection.js';import {extractSource,uploadFiles} from '../src/upload.js';
test('folder and quoted glob selection are bounded, deterministic and do not follow hidden directories or symlinks',async()=>{
 const root=await mkdtemp(join(tmpdir(),'awb-select-test-'));
 try{await mkdir(join(root,'sub'));await mkdir(join(root,'.hidden'));await writeFile(join(root,'one.txt'),'source');await writeFile(join(root,'sub','two.md'),'source');await writeFile(join(root,'.hidden','secret.txt'),'hidden');await symlink(root,join(root,'sub','loop'));
  assert.deepEqual(await expandSources([root]),[join(root,'one.txt'),join(root,'sub','two.md')]);assert.deepEqual(await expandSources([join(root,'**','*.md')]),[join(root,'sub','two.md')]);
  assert.deepEqual(await expandSources([join(root,'sub','two.md'),join(root,'one.txt')]),[join(root,'sub','two.md'),join(root,'one.txt')]);
  for(let i=0;i<10;i++)await writeFile(join(root,`${i}.txt`),'extra');await assert.rejects(expandSources([root]),/ten files/);
 }finally{await rm(root,{recursive:true,force:true});}
});
test('a combined collection stages preserved original files and distinct source boundaries',async()=>{
 const root=await mkdtemp(join(tmpdir(),'awb-combine-test-'));const calls=[],uploads=[];
 try{for(const name of ['a.txt','b.txt'])await writeFile(join(root,name),'A complete source. '.repeat(20));
 const results=await uploadFiles([root],{combine:'Two sources'},{call:async body=>{calls.push(body);return body.action==='lookup'?{reused:false}:body.action==='prepare'?{job:{id:'collection'},upload:{path:'original'},textUpload:{path:'text'}}:{};},extract:async bytes=>({text:bytes.toString()}),put:async(target,bytes)=>uploads.push([target,bytes])});
 assert.equal(results[0].sources,2);assert.equal(calls[1].name,'Two sources.collection.zip');assert.equal(calls[1].extraction.headings.length,2);
 const {unzipSync,strFromU8}=await import('fflate');const archive=unzipSync(uploads[0][1]);assert.ok(archive['sources/1-a.txt']);assert.ok(archive['sources/2-b.txt']);assert.match(strFromU8(archive['collection.txt']),/# SOURCE: b.txt/);assert.equal(uploads[1][1].toString(),strFromU8(archive['collection.txt']));
 }finally{await rm(root,{recursive:true,force:true});}
});
test('Python startup optimization preserves the pinned fallback extractor output',async()=>{
 const bytes=Buffer.from('CHAPTER I.\nRepeated practice may improve dexterity.\n'.repeat(30));
 const native=await extractSource(bytes,'.txt'),wasm=await extractSource(bytes,'.txt','wasm');
 const clean=report=>{const {extractionRuntime,...rest}=report;return rest;};assert.deepEqual(clean(native),clean(wasm));
});
