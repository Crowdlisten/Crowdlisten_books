import {readFile,writeFile,rename,lstat} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {credentials,serviceCall,accountKey} from './account.js';
import {compileDistillation} from '../assets/processing/book-distillation.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex');
export async function localImportPayload(directory){
 const dir=resolve(directory),path=join(dir,'processing-state.json');
 if((await lstat(path)).isSymbolicLink())throw Error('Local workspace state must not be a symlink.');
 const state=JSON.parse(await readFile(path,'utf8'));
 if(state.version!==1||state.route!=='customer-agent'||state.status!=='ready')throw Error('Finish local generation before publishing.');
 if((state.revision||1)>1)throw Error('Hosted sync of local revisions is outside this workflow. Keep using or install this updated guide locally.');
 let book;
 // Replay cached responses through the existing compiler; never call a model or re-extract.
 const replay=async(system,input,options)=>{const id=hash(JSON.stringify({system,input,options,attempts:state.attempts}));if(!Object.hasOwn(state.responses,id))throw Error('This workspace lacks a completed cached response. Use the CLI version that generated it.');const value=state.responses[id];if(options.name==='book_synthesis')book=value;return value;};
 await compileDistillation(state,state.notes,replay,async bytes=>hash(bytes));
 return {schemaVersion:1,title:state.title,author:state.author,sourceText:state.source_text,...(state.source_import?.sources?{sources:state.source_import.sources}:{}),book,chapters:state.notes,glossary:book.glossary||[]};
}
export async function publishLocal(directory,options={},deps={}){
 const session=deps.session||await credentials(true),dir=resolve(directory);
 if(options.expectedAccount&&accountKey(session)!==options.expectedAccount)throw Error('The connected account changed. Reconnect the original account before automatic upload.');
 const payload=await localImportPayload(dir);
 const result=await (deps.call||serviceCall)('book-import',payload,session.token);
 const tmp=join(dir,'.library-sync-'+randomUUID());await writeFile(tmp,JSON.stringify({...result,account:accountKey(session)},null,2)+'\n',{mode:0o600,flag:'wx'});await rename(tmp,join(dir,'library-sync.json'));
 return result;
}
