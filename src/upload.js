import {expandSources,collectionText} from './source-selection.js';
import {readFile,stat,writeFile} from 'node:fs/promises';
import {basename,extname,resolve} from 'node:path';
import {Worker} from 'node:worker_threads';
import {hash,privateCall,nativeCall,credentials} from './account.js';
import {exportFiles,checkExportReview} from './book-install.js';
import limits from '../assets/upload-limits.json' with {type:'json'};
export async function extractSource(bytes,extension,runtime) {
 return new Promise((resolve,reject)=>{
  const worker=new Worker(new URL('./extract-worker.js',import.meta.url),{workerData:{bytes,extension,runtime},execArgv:process.execArgv.filter(arg=>!arg.startsWith('--input-type')),stdout:true,stderr:true});
  const timer=setTimeout(()=>{void worker.terminate();reject(new Error('Source extraction timed out.'));},120000);
  const finish=()=>{clearTimeout(timer);void worker.terminate();};
  worker.on('message',data=>{finish();data.error?reject(new Error(data.error)):resolve(data.result);});
  worker.on('error',error=>{finish();reject(new Error('Source extraction failed: '+error.message));});
  worker.on('exit',code=>{clearTimeout(timer);if(code!==0)reject(new Error('Source extractor exited before finishing.'));});
 });
}
export async function putSource(upload,bytes,fetcher=fetch) {
 const base='https://yozeqanibszoxnowmvsm.supabase.co/storage/v1/object/upload/sign/private-books/';
 const url=new URL(base+upload.path.split('/').map(encodeURIComponent).join('/'));url.searchParams.set('token',upload.token);
 const response=await fetcher(url,{method:'PUT',redirect:'error',headers:{'Content-Type':'application/octet-stream','x-upsert':'true'},body:bytes,signal:AbortSignal.timeout(300000)});
 if(!response.ok)throw new Error('Upload did not finish. Retry the same file to resume.');
}
export function libraryMatch(filename,books) {
 const normalize=s=>s.toLowerCase().normalize('NFKD').replace(/\p{M}/gu,'').replace(/[^a-z0-9]+/g,' ').trim();
 const name=normalize(basename(filename,extname(filename)));
 const matches=books.filter(b=>[b.title,`${b.title} ${b.author}`,`${b.author} ${b.title}`].some(v=>normalize(v)===name));
 return matches.length===1?matches[0]:null;
}
export async function uploadFiles(paths,options={},deps={}) {
 if(!paths.length)throw new Error('Choose at least one source: upload ./book.pdf');
 paths=await expandSources(paths);
 if(paths.length>10)throw new Error('Choose up to ten files per batch.');
 if(options.book&&!options.revision||options.revision&&!options.book)throw new Error('Use --book ID together with --revision append or replace.');
 if(options.revision&&!['append','replace'].includes(options.revision))throw new Error('--revision must be append or replace.');
 if(options.book&&paths.length!==1)throw new Error('A book revision accepts exactly one source file.');
 if(options.mode&&!['analysis','full'].includes(options.mode))throw new Error('--mode must be analysis or full.');
 if(options.extraction&&!['text','technical'].includes(options.extraction))throw new Error('--extraction must be text or technical.');
 const session=deps.session||(!deps.call?await credentials(true):undefined);
 const call=deps.call||(body=>privateCall(body,session)),native=deps.nativeCall||(body=>nativeCall(body,session)),extract=deps.extract||extractSource,put=deps.put||putSource;
 if(options.combine){
  if(options.book||options.extraction==='technical')throw new Error('Combined collections support new books with local text extraction. Upload native or technical sources separately.');
  if(typeof options.combine!=='string'||!options.combine.trim()||options.combine.length>200||/[\r\n]/.test(options.combine))throw new Error('Use --combine with a one-line collection title up to 200 characters.');
  const parts=[];let bytesTotal=0;
  for(const file of paths){
   if(/\.(mobi|azw|azw3)$/i.test(file))throw new Error('Convert Kindle sources to EPUB first, or upload them separately.');
   const info=await stat(file);bytesTotal+=info.size;if(!info.isFile()||info.size<1||bytesTotal>limits.maxFileBytes)throw new Error('Combined originals must be non-empty and total at most 50 MB.');
   const bytes=await readFile(file);parts.push({file,bytes,sha:hash(bytes),report:await extract(bytes,extname(file).toLowerCase())});
  }
  const report=collectionText(parts,options.combine.trim());
  if(report.text.length<100||report.text.length>limits.maxTextCharacters)throw new Error('Combined text must contain 100 to six million characters.');
  const {zipSync,strToU8}=await import('fflate');const entries=Object.create(null);
  parts.forEach((part,index)=>{entries[`sources/${index+1}-${basename(part.file)}`]=[new Uint8Array(part.bytes),{mtime:new Date(1980,0,1)}];});
  entries['collection.txt']=[strToU8(report.text),{mtime:new Date(1980,0,1)}];
  entries['manifest.json']=[strToU8(JSON.stringify({title:options.combine,sources:report.sources},null,2)),{mtime:new Date(1980,0,1)}];
  const bytes=zipSync(entries),sha=hash(bytes),text=Buffer.from(report.text);
  if(bytes.length>limits.maxFileBytes)throw new Error('Combined source archive exceeds 50 MB.');
  const cached=await call({action:'lookup',sha});
  if(cached.reused)return [{file:options.combine,id:cached.job.id,status:cached.job.status,reused:true}];
  const prepared=await call({action:'prepare',name:options.combine.trim()+'.collection.zip',size:bytes.length,sha,textSha:hash(text),textBytes:text.length,extraction:{method:'combined-collection',sources:report.sources,headings:report.sources.map(source=>({line:source.startLine,title:source.name}))},options:{mode:options.mode||'full',depth:options.depth||'study',purpose:options.purpose||'apply'}});
  if(!prepared.reused){await put(prepared.upload,bytes);await put(prepared.textUpload,text);await call({action:'finalize',id:prepared.job.id});}
  return [{file:options.combine,id:prepared.job.id,status:prepared.reused?prepared.job.status:prepared.job.billing_required?'awaiting_price_acceptance':'queued',reused:!!prepared.reused,sources:report.sources.length,url:`https://answerwithbooks.com/your-book/?id=${prepared.job.id}`}];
 }
 const results=[];
 for(const file of paths) {
  try {
   const source=resolve(file),info=await stat(source),extension=extname(source).toLowerCase();
   if(!info.isFile()||info.size<1||info.size>limits.maxFileBytes)throw new Error('Choose a non-empty file up to 50 MB.');
   if(!/^\.(pdf|epub|docx|html|htm|xhtml|rtf|txt|text|md|markdown|rst|adoc|asciidoc|mobi|azw|azw3)$/.test(extension))throw new Error('Unsupported source format. Use PDF, EPUB, DOCX, HTML, RTF, Markdown, text, or a DRM-free Kindle book.');
   const bytes=await readFile(source);if(!bytes.length||bytes.length>limits.maxFileBytes)throw new Error('Source changed while reading; choose a non-empty file up to 50 MB.');const sha=hash(bytes);
   const cached=options.book?{reused:false}:await call({action:'lookup',sha});
   if(cached.reused){results.push({file,id:cached.job.id,status:cached.job.status,reused:true,url:`https://answerwithbooks.com/your-book/?id=${cached.job.id}`});continue;}
   const match=libraryMatch(file,options.publicBooks||[]);
   if(match&&!options.processFile&&!options.book) {
    results.push({file,status:'library_match',book:match.id,url:match.url||`https://answerwithbooks.com/books/${match.id}/`,message:'Saved public digest available. No upload or processing. Use ask --book '+match.id+'; use --process-file only if you want this particular source processed.'});continue;
   }
   const revision=options.book?{parentId:options.book,revisionKind:options.revision}:{};
   const processing={mode:options.mode||'full',depth:options.depth||'study',purpose:options.purpose||'apply'};
   const useNative=/^\.(mobi|azw|azw3)$/.test(extension)||options.extraction==='technical';
   if(useNative){
    const prepared=await native({action:'prepare',name:basename(file),size:bytes.length,sha,extractionMode:options.extraction||'text',options:processing,...revision});
    if(!prepared.reused){if(!prepared.upload)throw new Error('Native extraction did not provide an upload destination.');await put(prepared.upload,bytes);await native({action:'finalize',id:prepared.job.id});}
    results.push({file,id:prepared.job.id,status:prepared.reused?prepared.job.status:prepared.job.billing_required?'awaiting_price_acceptance':'queued',reused:!!prepared.reused,url:`https://answerwithbooks.com/your-book/?id=${prepared.job.id}`});continue;
   }
   options.progress?.(`Reading ${basename(file)}…`);
   const report=await extract(bytes,extension);
   if(report.text.trim().length<100||report.text.length>limits.maxTextCharacters)throw new Error('Source must contain 100 to six million readable characters.');
   const sourceText=Buffer.from(report.text),{text,...extraction}=report;
   // Always stage bytes, avoiding Edge Function JSON request-size limits.
   const prepared=await call({action:'prepare',name:basename(file),size:bytes.length,sha,textSha:hash(sourceText),textBytes:sourceText.length,extraction,options:processing,...revision});
   if(!prepared.reused){if(prepared.upload)await put(prepared.upload,bytes);if(prepared.textUpload)await put(prepared.textUpload,sourceText);await call({action:prepared.textUpload?'finalize':'enqueue',id:prepared.job.id});}
   results.push({file,id:prepared.job.id,status:prepared.reused?prepared.job.status:prepared.job.billing_required?'awaiting_price_acceptance':'queued',reused:!!prepared.reused,url:`https://answerwithbooks.com/your-book/?id=${prepared.job.id}`});
  }catch(error){results.push({file,status:'error',error:error.message});}
 }
 return results;
}
export async function downloadBook(id,options={},deps={}) {
 const result=await (deps.call||privateCall)({action:'export',id,reviewAccepted:options.acceptReview===true});
 checkExportReview(result,options.acceptReview===true);
 const {zipSync,strToU8}=await import('fflate');
 const entries=Object.create(null);for(const [name,text] of Object.entries(exportFiles(result))){
  entries[name]=strToU8(text);
 }
 const path=resolve(options.output||`book-${id}.zip`);
 await writeFile(path,zipSync(entries),{flag:'wx',mode:0o600});return path;
}
