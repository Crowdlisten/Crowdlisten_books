import {stat} from 'node:fs/promises';
import {basename,extname} from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {credentials,serviceCall} from './account.js';
export async function readerCall(endpoint,body,{authenticated=false,session,call=serviceCall}={}){
 session??=await credentials(authenticated);return call(endpoint,body,session?.token);
}
export function guideRequest(question,key=randomUUID()){
 if(typeof question!=='string'||question.trim().length<3||question.length>2000)throw Error('Enter a question between 3 and 2,000 characters.');
 return {action:'propose',question:question.trim(),requestKey:key};
}
export function guideConfirmation(id,minutes){const length={10:'short',25:'standard',45:'long'}[minutes];if(!length)throw Error('Choose 10, 25, or 45 minutes.');return {action:'confirm',id,length};}
export async function uploadShared(paths,{call=readerCall,fetcher=fetch}={}){
 if(!paths.length||paths.length>10)throw Error('Choose 1–10 book files.');
 const results=[];
 for(const path of paths){
  const info=await stat(path);if(!info.isFile()||info.size<1||info.size>500*1024*1024)throw Error('Choose a non-empty file up to 500 MB.');
  if(!/^\.(pdf|epub|docx|mobi|azw|azw3|html|htm|xhtml|rtf|txt|text|md|markdown|rst|adoc|asciidoc)$/i.test(extname(path)))throw Error('Unsupported book file.');
  const digest=createHash('sha256');for await(const chunk of createReadStream(path))digest.update(chunk);const prepared=await call('book-native',{action:'prepare',visibility:'public',name:basename(path),size:info.size,sha:digest.digest('hex')},{authenticated:true});let id=prepared.job.id;
  if(!prepared.reused){
   const upload=prepared.upload;if(typeof upload?.path!=='string'||!/^[-a-f0-9]+\/[-a-f0-9]+\/source$/i.test(upload.path)||typeof upload.token!=='string')throw Error('Invalid upload destination');
   const url=new URL('https://yozeqanibszoxnowmvsm.supabase.co/storage/v1/object/upload/sign/private-books/'+upload.path);url.searchParams.set('token',upload.token);
   const response=await fetcher(url,{method:'PUT',redirect:'error',headers:{'Content-Type':'application/octet-stream','x-upsert':'true','Content-Length':String(info.size)},body:createReadStream(path),duplex:'half',signal:AbortSignal.timeout(1800000)});if(!response.ok)throw Error('Upload failed. Retry the same file.');
   const finalized=await call('book-native',{action:'finalize',id},{authenticated:true});id=finalized.job.id;
  }
  results.push({id,reused:!!prepared.reused,url:`https://answerwithbooks.com/books/read/?id=${id}`});
 }
 return {books:results};
}
