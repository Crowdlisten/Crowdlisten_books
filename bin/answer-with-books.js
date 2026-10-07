#!/usr/bin/env node
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {spawn} from 'node:child_process';
import {commands,parseArgs} from '../src/commands.js';
import {catalog,filterBooks,askBooks,publicBooks} from '../src/library-cli.js';
import {credentials,privateCall,privateBooks,login,logout} from '../src/account.js';
const packageRoot=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const version=JSON.parse(readFileSync(join(packageRoot,'package.json'),'utf8')).version;
const args=process.argv.slice(2);
try {
 if(!args.length||args.includes('--help')||args[0]==='help')printHelp();
 else {
  const selected=commands.find(c=>c.name===args[0]||c.aliases?.includes(args[0]));
  if(!selected)throw new Error('Unknown command: '+args[0]+'. Run --help for available commands.');
  const {values,positionals}=parseArgs(args.slice(1));
  switch(selected.name){
   case 'install':install(args.slice(1));break;
   case 'serve':await import('../src/server.js');break;
   case 'login':await login(values);break;
   case 'logout':await logout();break;
   case 'books': {
    const books=filterBooks(await catalog(values),positionals.join(' '),values.topic);
    print({books,count:books.length},values,()=>books.length?books.map(b=>`${b.title} · ${b.author||'Unknown author'}\n  ${b.id} · ${b.visibility}${b.status?' · '+b.status:''}`).join('\n'):'No matching books. Try a different title or topic.');break;
   }
   case 'ask':{
    const result=await askBooks(positionals.join(' '),values);
    print(result,values,()=>`Question: ${result.question}\n${result.notice||''}\n`+(result.objects.books.map(m=>`- ${m.book.title} (${m.book.url||m.book.id})`).join('\n')||'No strongly matching books.')+'\n'+result.objects.answers.map(m=>`Published answer: ${m.answer?.title||m.content?.title||''}`).join('\n')+'\nYour agent applies the retrieved sources to your task. Use --json for the source notes.');break;
   }
   case 'status':{
    const result=positionals[0]?await privateCall({action:'status',id:positionals[0]}):{books:await privateBooks(await credentials(true))};
    print(result,values,()=> (result.job?[result.job]:result.books).map(b=>`${b.title}: ${b.status} · ${b.run_state} · ${b.cursor||0}${b.total_sections?'/'+b.total_sections:''} sections\n${b.error||''}\nhttps://answerwithbooks.com/your-book/?id=${b.id}`).join('\n')||'No private books yet. Use upload FILE.');break;
   }
   case 'upload':case 'download':{
    // Copied skill runtimes stay small; npx supplies extraction/ZIP dependencies on demand.
    try{await import('pyodide');await import('fflate');}catch{
     const child=spawn(process.platform==='win32'?'npx.cmd':'npx',['--yes',`answer-with-books@${version}`,...args],{stdio:'inherit'});
     process.exitCode=await new Promise((res,rej)=>{child.on('exit',code=>res(code??1));child.on('error',rej);});break;
    }
    await credentials(true);
    const {uploadFiles,downloadBook}=await import('../src/upload.js');
    if(selected.name==='upload'){
     const results=await uploadFiles(positionals,{...values,publicBooks:publicBooks(),progress:message=>console.error(message)});
     print({results},values,()=>results.map(r=>`${r.file}: ${r.status}${r.reused?' (reused)':''}\n${r.error||r.message||r.url}`).join('\n'));
     if(results.some(r=>r.status==='error'))process.exitCode=1;
    }else{
     if(!positionals[0])throw new Error('Choose a book ID: download BOOK_ID');
     const path=await downloadBook(positionals[0],values);print({path},values,()=>`Saved ${path}`);
    }
    break;
   }
  }
 }
}catch(error){console.error(error.message||'Command failed.');if(error.findings)console.error(JSON.stringify({findings:error.findings},null,2));process.exitCode=1;}
function print(value,options,format){console.log(options.json?JSON.stringify(value,null,2):format());}
function printHelp(){console.log(`Answer with Books ${version}\n\n`+commands.map(c=>`${c.usage}\n  ${c.description}${c.aliases?' Alias: '+c.aliases.join(', ')+'.':''}`).join('\n\n')+'\n\nPublic books and ask work without an account or server. Private commands require login.\nIn your agent: select the answer-with-books skill, then ask for books, ask, upload, or status.');}
function install(installArgs) {
  const flags = new Set(installArgs.filter((arg) => arg.startsWith('--')));
  const installSkill = flags.has('--skill') || (!flags.has('--skill') && !flags.has('--api'));
  const installApi = flags.has('--api') || (!flags.has('--skill') && !flags.has('--api'));
  const cwd = process.cwd();
  const codexHome = resolve(process.env.CODEX_HOME || join(homedir(), '.codex'));
  const installed = [];

  if (installSkill) {
    const source = join(packageRoot, 'skill', 'answer-with-books', 'SKILL.md');
    if (!existsSync(source)) {
      console.error(`Missing skill source: ${source}`);
      process.exit(1);
    }

    const targetDir = join(codexHome, 'skills', 'answer-with-books');
    mkdirSync(targetDir, { recursive: true });
    cpSync(join(packageRoot, 'skill', 'answer-with-books'), targetDir, { recursive: true });
    copyRuntime(join(targetDir, 'runtime'));
    installed.push(`skill -> ${targetDir}`);
  }

  if (installApi) {
    const configDir = join(cwd, '.answer-with-books');
    mkdirSync(configDir, { recursive: true });
    copyRuntime(join(configDir, 'runtime'));
    writeFileSync(
      join(configDir, 'api.json'),
      JSON.stringify(
        {
          name: 'answer-with-books',
          baseUrl: process.env.ANSWER_WITH_BOOKS_API_URL || 'http://127.0.0.1:8787',
          startCommand: 'node .answer-with-books/runtime/src/server.js',
          endpoints: {
            health: '/health',
            ask: '/v1/ask',
            topOfMind: '/v1/signals/top-of-mind',
          },
        },
        null,
        2
      )
    );
    installed.push(`api config -> ${configDir}/api.json`);
  }

  console.log('Answer with Books installed.');
  for (const item of installed) console.log(`- ${item}`);
  console.log(`Ask without a server: npx --yes answer-with-books@${version} ask "YOUR QUESTION" --json`);
  if (installApi) console.log('Optional local HTTP API: node .answer-with-books/runtime/src/server.js');
}

function copyRuntime(target) {
  mkdirSync(target, { recursive: true });
  for (const name of ['src', 'bin', 'assets', 'package.json']) cpSync(join(packageRoot, name), join(target, name), { recursive: true });
  mkdirSync(join(target, 'research'), { recursive: true });
  for (const name of ['book-corpus.json', 'retrieval-corpus.json']) cpSync(join(packageRoot, 'research', name), join(target, 'research', name));
}
