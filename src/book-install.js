import {mkdir, lstat, realpath, readFile, writeFile, readdir, readlink, symlink, rename, rm} from 'node:fs/promises';
import {homedir} from 'node:os';
import {join, resolve, dirname, relative, sep, parse} from 'node:path';
import {randomUUID} from 'node:crypto';
import {credentials, privateBooks, privateCall, accountKey, accountCache, hash} from './account.js';

const marker='.awb-install.json';
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
async function stat(path){try{return await lstat(path);}catch(e){if(e.code==='ENOENT')return null;throw e;}}

// Resolve system aliases (/tmp and /var on macOS), then require every newly used
// directory below that boundary to be a real directory, never a planted link.
async function directory(path){
 path=resolve(path);
 if(process.platform==='darwin')for(const alias of ['/tmp','/var'])if(path===alias||path.startsWith(alias+'/'))path=(await realpath(alias))+path.slice(alias.length);
 let current=parse(path).root;
 for(const part of path.slice(current.length).split(sep).filter(Boolean)){
  current=join(current,part);
  await mkdir(current,{mode:0o700}).catch(e=>{if(e.code!=='EEXIST')throw e;});
  const info=await lstat(current);if(info.isSymbolicLink()||!info.isDirectory())throw new Error('Unsafe library directory: symbolic links and non-directories are not allowed.');
 }
 return current;
}
export function exportFiles(result){
 if(!result||!result.files||Array.isArray(result.files)||typeof result.files!=='object')throw new Error('Invalid exported package.');
 const files=Object.create(null),seen=new Set();let size=0;
 for(const [name,text] of Object.entries(result.files)){
  if(typeof text!=='string'||name.length>512||name.startsWith('/')||name.includes('\\')||/[\x00-\x1f\x7f:]/.test(name)||name.split('/').some(p=>!p||p==='.'||p==='..'||/[. ]$/.test(p)||/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(p)))throw new Error('Invalid path or content in exported package.');
  const key=name.normalize('NFC').toLowerCase();if(seen.has(key))throw new Error('Colliding paths in exported package.');seen.add(key);
  size+=Buffer.byteLength(text);if(size>100*1024*1024||seen.size>2000)throw new Error('Exported package exceeds the installation limit.');
  files[name]=text;
 }
 for(const name of seen)for(let path=name;path.includes('/');){path=path.slice(0,path.lastIndexOf('/'));if(seen.has(path))throw new Error('Colliding file and directory in exported package.');}
 return files;
}
export function checkExportReview(result,acceptReview=false){
 const findings=[...(Array.isArray(result.findings)?result.findings:[]),...(Array.isArray(result.audit?.findings)?result.audit.findings:[])];
 if((Array.isArray(findings)&&findings.length||result.reviewRequired||result.review_required)&&!acceptReview){const e=new Error('Review the export findings before using --accept-review.');e.findings=findings;throw e;}
}
export function checkedPackage(result,book,acceptReview=false){
 checkExportReview(result,acceptReview);
 const exported=exportFiles(result);let meta;
 try{meta=JSON.parse(exported['skill/package.json']);}catch{throw new Error('Missing or invalid skill/package.json; update the service before installing.');}
 if(!uuid.test(book.book_id)||!uuid.test(book.id)||meta.bookId!==book.book_id||meta.revisionId!==book.id||meta.revision!==book.revision||!Number.isSafeInteger(meta.revision)||meta.revision<1||meta.sourceKind!=='full-source')throw new Error('Exported package identity or full-source provenance does not match the selected book.');
 if(!exported['skill/SKILL.md']?.trim()||!exported['skill/source.txt']?.trim())throw new Error('A complete skill and citation source are required for installation.');
 const files=Object.create(null);
 for(const [path,text] of Object.entries(exported)){
  const target=path.startsWith('skill/')?path.slice(6):'exported/'+path;
  if(target.toLowerCase()===marker||target.startsWith('exported/')&&path.startsWith('skill/'))throw new Error('Reserved path in exported skill.');
  files[target]=text;
 }
 return {meta,files};
}
function skillEntrypoint(text,name){
 const match=text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
 if(!match||!/^name:\s*.+$/m.test(match[1])||!/^description:\s*.+$/m.test(match[1]))throw new Error('The exported skill requires name and description frontmatter.');
 const header=match[1].replace(/^name:.*$/m,'name: '+name);
 return '---\n'+header+'\n---\n'+text.slice(match[0].length);
}
async function fileHashes(root){
 const result=Object.create(null);
 async function walk(dir,prefix=''){
  for(const item of await readdir(dir,{withFileTypes:true})){
   const name=prefix+item.name,path=join(dir,item.name),info=await lstat(path);
   if(info.isSymbolicLink()||!info.isFile()&&!info.isDirectory())throw new Error('Installed skill contains an unsafe symbolic link or special file.');
   if(info.isDirectory())await walk(path,name+'/');else if(name!==marker)result[name]=hash(await readFile(path));
  }
 }
 await walk(root);return result;
}
function sameHashes(a,b){return JSON.stringify(Object.entries(a).sort())===JSON.stringify(Object.entries(b).sort());}
async function verifyPayload(root,identity){
 if((await lstat(root)).isSymbolicLink())throw new Error('Unsafe cached skill link.');
 const manifestPath=join(root,marker),info=await stat(manifestPath);if(!info?.isFile()||info.isSymbolicLink())throw new Error('Refusing to replace an unmanaged book skill.');
 let manifest;try{manifest=JSON.parse(await readFile(manifestPath,'utf8'));}catch{throw new Error('Invalid installed book manifest.');}
 if(manifest.schema!==1||manifest.accountKey!==identity.accountKey||manifest.bookId!==identity.bookId||!uuid.test(manifest.revisionId)||!manifest.files||typeof manifest.files!=='object')throw new Error('Installed skill belongs to a different account or book.');
 if(!sameHashes(await fileHashes(root),manifest.files))throw new Error('The installed skill has user-edited, missing, or additional files. Preserve those changes before syncing.');
 return manifest;
}
async function existingInstallation(target,bookRoot,identity){
 const info=await stat(target);if(!info)return null;
 if(!info.isSymbolicLink())throw new Error('Refusing to overwrite an unmanaged skill path.');
 const link=await readlink(target),payload=resolve(dirname(target),link),rel=relative(bookRoot,payload);
 if(rel.startsWith('..')||rel.includes(sep)||!rel)throw new Error('Refusing to replace a foreign skill link.');
 const manifest=await verifyPayload(payload,identity);
 const expected=manifest.revisionId+'-'+hash(JSON.stringify(Object.entries(manifest.files).sort()));
 if(rel!==expected)throw new Error('Cached skill directory does not match its manifest.');
 return {link,payload,manifest};
}

export async function installBook(id,options={},deps={}){
 const session=deps.session||await credentials(true),key=accountKey(session);
 const books=deps.books||await (deps.list||privateBooks)(session);
 const book=books.find(b=>b.book_id===id||b.id===id);
 if(!book)throw new Error('Private book not found in this account. Public editorial digests cannot be installed as full-source books.');
 if(book.status!=='ready'||book.is_current!==true||book.source_kind!=='full-source')throw new Error('Only a ready, current full-source book can be installed.');
 if(!uuid.test(book.book_id)||!uuid.test(book.id)||!Number.isSafeInteger(book.revision)||book.revision<1)throw new Error('Invalid book identity in account library.');
 // Pin the session throughout export and installation; never reread mutable login state.
 const result=await (deps.call||privateCall)({action:'export',id:book.id,reviewAccepted:options.acceptReview===true},session);
 const {meta,files}=checkedPackage(result,book,options.acceptReview===true);
 const skillName=`awb-${key.slice(0,24)}-${book.book_id.replaceAll('-','')}`;
 // Match the host skill name to its collision-safe directory. Preserve the
 // original generated entrypoint with the unmodified exported artifacts.
 files['exported/skill/ORIGINAL-SKILL.txt']=files['SKILL.md'];
 files['SKILL.md']=skillEntrypoint(files['SKILL.md'],skillName);
 const hashes=Object.fromEntries(Object.entries(files).map(([path,text])=>[path,hash(text)]));
 const digest=hash(JSON.stringify(Object.entries(hashes).sort()));
  const cache=await directory(deps.cacheRoot||accountCache(session));
 const binding=join(cache,'.awb-account.json');
 await writeFile(binding,JSON.stringify({schema:1,accountKey:key})+'\n',{flag:'wx',mode:0o600}).catch(e=>{if(e.code!=='EEXIST')throw e;});
 const bindingInfo=await lstat(binding);
 if(!bindingInfo.isFile()||bindingInfo.isSymbolicLink())throw new Error('Unsafe account cache binding.');
 let owner;try{owner=JSON.parse(await readFile(binding,'utf8'));}catch{throw new Error('Invalid account cache binding.');}
 if(owner.schema!==1||owner.accountKey!==key)throw new Error('This cache belongs to a different account.');
 const bookRoot=await directory(join(cache,'books',book.book_id));
 const skills=await directory(deps.skillsDir||join(resolve(process.env.CODEX_HOME||join(homedir(),'.codex')),'skills'));
 const target=join(skills,skillName);
 const identity={accountKey:key,bookId:book.book_id};
 const lock=join(bookRoot,'.install-lock');await mkdir(lock,{mode:0o700}).catch(()=>{throw new Error('Another installation is using this book. Retry after it finishes.');});
 let stage,temporaryLink;
 try{
  const previous=await existingInstallation(target,bookRoot,identity);
  const payload=join(bookRoot,`${book.id}-${digest}`),cached=await stat(payload);
  if(cached){const manifest=await verifyPayload(payload,identity);if(!sameHashes(manifest.files,hashes))throw new Error('Cached package differs from this revision.');}
  else{
   stage=join(bookRoot,'.stage-'+randomUUID());await mkdir(stage,{mode:0o700});
   for(const [path,text] of Object.entries(files)){await mkdir(dirname(join(stage,path)),{recursive:true,mode:0o700});await writeFile(join(stage,path),text,{flag:'wx',mode:0o600});}
   await writeFile(join(stage,marker),JSON.stringify({schema:1,...identity,revisionId:meta.revisionId,revision:meta.revision,sourceKind:meta.sourceKind,files:hashes},null,2)+'\n',{flag:'wx',mode:0o600});
   await rename(stage,payload);stage=null;
  }
  if(previous?.payload===payload)return {status:'unchanged',book_id:book.book_id,id:book.id,revision:book.revision,path:target};
  // Verify again immediately before the atomic pointer switch. Failed writes,
  // review gates, and edited files never disturb the previous revision.
  const current=await existingInstallation(target,bookRoot,identity);
  if(current?.link!==previous?.link)throw new Error('Installed revision changed during sync. Retry.');
  temporaryLink=join(skills,'.awb-link-'+randomUUID());await symlink(payload,temporaryLink,'dir');
  await (deps.rename||rename)(temporaryLink,target);temporaryLink=null;
  return {status:previous?'updated':'installed',book_id:book.book_id,id:book.id,revision:book.revision,path:target};
 }finally{
  if(temporaryLink)await rm(temporaryLink,{force:true});if(stage)await rm(stage,{recursive:true,force:true});await rm(lock,{recursive:true,force:true});
 }
}
export async function syncLibrary(options={},deps={}){
 const session=deps.session||await credentials(true),books=await (deps.list||privateBooks)(session),results=[];
 for(const book of books){
  if(book.status!=='ready'||book.is_current!==true||book.source_kind!=='full-source'){results.push({book_id:book.book_id,id:book.id,status:'skipped',reason:'not_ready_current_full_source'});continue;}
  try{results.push(await installBook(book.book_id,options,{...deps,session,books}));}
  catch(error){results.push({book_id:book.book_id,id:book.id,status:'error',error:error.message,...(error.findings?{findings:error.findings}:{})});}
 }
 return {results};
}
