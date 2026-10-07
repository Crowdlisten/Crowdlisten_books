import {homedir} from 'node:os';
import {join} from 'node:path';
import {mkdir,readFile,writeFile,rename,rm,lstat,chmod} from 'node:fs/promises';
import {createHash,randomBytes} from 'node:crypto';
import {spawn} from 'node:child_process';
export const serviceUrl='https://yozeqanibszoxnowmvsm.supabase.co/functions/v1';
const configDir=()=>process.env.ANSWER_WITH_BOOKS_CONFIG_DIR||join(homedir(),'.config','answer-with-books');
const credentialsPath=()=>join(configDir(),'session.json');
export const hash=value=>createHash('sha256').update(value).digest('hex');
export async function credentials(required=false) {
 let value;
 try {
  const stat=await lstat(credentialsPath());if(stat.isSymbolicLink())throw new Error('Session file must not be a symbolic link.');
  value=JSON.parse(await readFile(credentialsPath(),'utf8'));
 }catch(error){if(error.code!=='ENOENT')throw new Error('Could not read the saved session. Run login again.');}
 if(value&&(!/^awb_cli_[a-f0-9]{64}$/.test(value.token)||!Number.isFinite(Date.parse(value.expires_at))||Date.parse(value.expires_at)<=Date.now()))value=null;
 if(!value&&required)throw new Error('Sign in first: answer-with-books login');
 return value;
}
export async function saveCredentials(value) {
 await mkdir(configDir(),{recursive:true,mode:0o700});
 if((await lstat(configDir())).isSymbolicLink())throw new Error('Session directory must not be a symbolic link.');
 await chmod(configDir(),0o700);
 const path=credentialsPath()+'.'+randomBytes(8).toString('hex');
 await writeFile(path,JSON.stringify(value),{mode:0o600,flag:'wx'});await rename(path,credentialsPath());
}
export async function serviceCall(endpoint,body,token,fetcher=fetch) {
 let response;
 try {response=await fetcher(`${serviceUrl}/${endpoint}`,{method:'POST',redirect:'error',headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify(body),signal:AbortSignal.timeout(120000)});}
 catch{throw new Error('Could not reach Answer with Books. Check your connection and retry.');}
 let result;try{result=await response.json();}catch{throw new Error('The service returned an unreadable response.');}
 if(!response.ok||result.error){const error=new Error(result.error||`Request failed (${response.status}).`);if(result.findings)error.findings=result.findings;throw error;}
 return result;
}
export async function privateCall(body,session) {session??=await credentials(true);return serviceCall('book-process',body,session.token);}
export function openBrowser(url) {
 const [command,args]=process.platform==='darwin'?['open',[url]]:process.platform==='win32'?['rundll32',['url.dll,FileProtocolHandler',url]]:['xdg-open',[url]];
 const child=spawn(command,args,{stdio:'ignore',detached:true});child.on('error',()=>{});child.unref();
}
export async function login({noBrowser=false}={}) {
 const token='awb_cli_'+randomBytes(32).toString('hex');
 const started=await serviceCall('book-cli-auth',{action:'start',tokenHash:hash(token)});
 const url=new URL('https://answerwithbooks.com/connect-agent/');url.searchParams.set('code',started.user_code);
 console.log(`Connect your agent: ${url}\nCode: ${started.user_code}\nSign in and confirm this code in your browser. Waiting up to ten minutes…`);
 if(!noBrowser)openBrowser(url.href);
 const expiry=Math.min(Date.parse(started.expires_at),Date.now()+600000);
 while(Date.now()<expiry) {
  await new Promise(resolve=>setTimeout(resolve,3000));
  const result=await serviceCall('book-cli-auth',{action:'poll'},token);
  if(result.status==='authorized') {await saveCredentials({token,user_id:result.user_id,expires_at:result.expires_at});console.log('Signed in. Your private books are available to this agent.');return;}
  if(result.status==='expired')break;
 }
 throw new Error('Sign-in expired. Run login again.');
}
export async function logout() {
 const session=await credentials();if(session)await serviceCall('book-cli-auth',{action:'logout'},session.token);
 await rm(credentialsPath(),{force:true});console.log('Signed out. This agent’s access has been revoked.');
}
export async function privateBooks(session) {
 const books=[];let offset=0;
 do {const result=await privateCall({action:'list',offset},session);books.push(...result.books.map(b=>({...b,visibility:'private',url:`https://answerwithbooks.com/your-book/?id=${b.id}`})));offset=result.next_offset;}while(offset!==null&&offset!==undefined);
 return books;
}
