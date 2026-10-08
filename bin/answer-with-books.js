#!/usr/bin/env node
import {searchHostedLibrary} from '../src/hosted-library.js';
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {commands,parseArgs} from '../src/commands.js';
import {catalog,filterBooks,askBooks,publicBooks} from '../src/library-cli.js';
import {credentials,privateCall,nativeCall,privateBooks,login,logout,accountCache,resolvePrivateId} from '../src/account.js';
import {installBook,syncLibrary} from '../src/book-install.js';
import {bookOperation} from '../src/book-operations.js';
const packageRoot=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const version=JSON.parse(readFileSync(join(packageRoot,'package.json'),'utf8')).version;
const releasePackage=`https://github.com/Crowdlisten/Crowdlisten_books/releases/download/v${version}/answer-with-books-${version}.tgz`;
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
   case 'search': {
    const result=await searchHostedLibrary(positionals.join(' '),values);
    print(result,values,()=>`${result.method} · ${result.matches.length} chapter matches\n${result.semanticNotice||''}\n`+result.matches.map(m=>`- ${m.book.title} · ${m.section_id}\n  ${m.summary}`).join('\n')+'\nYour agent checks applicability and applies the cited methods. Use --json for evidence.');break;
   }
   case 'match': {
    if(values.private&&!values.catalog){
     const result=await searchHostedLibrary(positionals.join(' '),values);
     print(result,values,()=>`${result.method}\n`+result.matches.map(m=>`- ${m.book.title} (${m.book.book_id}) · ${m.section_id}`).join('\n')+'\nCandidates include cited chapter methods. Your agent must check applicability.');break;
    }
    if(values.apiUrl || process.env.ANSWER_WITH_BOOKS_API_URL) throw new Error('match runs locally; unset ANSWER_WITH_BOOKS_API_URL or call POST /v1/books/match on your server.');
    const {matchBookCandidates}=await import('../src/semantic.js');
    const session=values.public?null:await credentials(values.private===true);
    const result=await matchBookCandidates(positionals.join(' '),await catalog(values,session),{catalogOnly:values.catalog,...(session?{cacheDir:accountCache(session)}:{}),progress:message=>console.error(message)});
    print(result,values,()=>`${result.method}\n`+result.candidates.map(b=>`- ${b.title} (${b.id})`).join('\n')+'\nCandidates require your agent’s relevance assessment before use.');break;
   }
   case 'ask':{
    const result=await askBooks(positionals.join(' '),values);
    print(result,values,()=>`Question: ${result.question}\n${result.notice||''}\n`+(result.objects.books.map(m=>`- ${m.book.title} (${m.book.url||m.book.id})`).join('\n')||'No strongly matching books.')+'\n'+result.objects.answers.map(m=>`Published answer: ${m.answer?.title||m.content?.title||''}`).join('\n')+'\nYour agent applies the retrieved sources to your task. Use --json for the source notes.');break;
   }
   case 'status':{
    const result=positionals[0]?await bookOperation('status',positionals[0],values):{books:await privateBooks(await credentials(true))};
    print(result,values,()=> (result.job?[result.job]:result.books).map(b=>`${b.title}: ${b.status} · ${b.run_state} · ${b.cursor||0}${b.total_sections?'/'+b.total_sections:''} sections\n${b.error||''}\nhttps://answerwithbooks.com/your-book/?id=${b.id}`).join('\n')||'No private books yet. Use upload FILE.');break;
   }
   case 'library':case 'install-book':{
    const operation=selected.name==='install-book'?'install-book':positionals.shift();
    let result;
    if(operation==='sync'){if(positionals.length)throw new Error('Use library sync without a book ID.');result=await syncLibrary(values);}
    else if(operation==='install-book'){if(positionals.length!==1)throw new Error('Choose one book: library install-book BOOK_ID');result=await installBook(positionals[0],values);}
    else throw new Error('Use library sync or library install-book BOOK_ID.');
    print(result,values,()=>(result.results||[result]).map(r=>`${r.book_id||r.id}: ${r.status}${r.path?' · '+r.path:''}${r.error?' · '+r.error:''}${r.reason?' · '+r.reason:''}${r.findings?'\n'+JSON.stringify({findings:r.findings},null,2):''}`).join('\n')||'No private books to sync.');
    if(result.results?.some(r=>r.status==='error'))process.exitCode=1;
    break;
   }
   case 'pause':case 'retry':case 'generate':case 'revisions':case 'activate':{
    if(positionals.length!==1)throw new Error('Choose one private book or revision ID.');
    const result=await bookOperation(selected.name,positionals[0],values);
    print(result,values,()=>JSON.stringify(result,null,2));break;
   }
   case 'upload':case 'download':{
    // Do not delegate development-only revision flags to an older npm release.
    const needsExtract=selected.name==='upload'&&values.extraction!=='technical'&&positionals.some(p=>! /\.(mobi|azw|azw3)$/i.test(p));
    try{if(needsExtract)await import('pyodide');if(selected.name==='download')await import('fflate');}catch{throw new Error('Install this runtime’s dependencies with npm install --omit=dev in '+packageRoot+' before extracting or downloading sources.');}
    const session=await credentials(true),call=body=>privateCall(body,session);
    const {uploadFiles,downloadBook}=await import('../src/upload.js');
    if(selected.name==='upload'){
     if(values.book)values.book=await resolvePrivateId(values.book,session);
     const results=await uploadFiles(positionals,{...values,publicBooks:publicBooks(),progress:message=>console.error(message)},{call,nativeCall:body=>nativeCall(body,session)});
     print({results},values,()=>results.map(r=>`${r.file}: ${r.status}${r.reused?' (reused)':''}\n${r.error||r.message||r.url}`).join('\n'));
     if(results.some(r=>r.status==='error'))process.exitCode=1;
    }else{
     if(!positionals[0])throw new Error('Choose a book ID: download BOOK_ID');
     const id=await resolvePrivateId(positionals[0],session);
     const path=await downloadBook(id,values,{call});print({path},values,()=>`Saved ${path}`);
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
  console.log(`Ask without a server: npx --yes ${releasePackage} ask "YOUR QUESTION" --json`);
  if (installApi) console.log('Optional local HTTP API: node .answer-with-books/runtime/src/server.js');
}

function copyRuntime(target) {
  mkdirSync(target, { recursive: true });
  for (const name of ['src', 'bin', 'assets', 'package.json']) cpSync(join(packageRoot, name), join(target, name), { recursive: true });
  mkdirSync(join(target, 'research'), { recursive: true });
  for (const name of ['book-corpus.json', 'retrieval-corpus.json']) cpSync(join(packageRoot, 'research', name), join(target, 'research', name));
}
