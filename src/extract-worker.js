import {parentPort,workerData} from 'node:worker_threads';
import {readFile,mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,dirname,resolve} from 'node:path';
import {spawn} from 'node:child_process';
import limits from '../assets/upload-limits.json' with {type:'json'};

function runPython(root,request) {
 return new Promise((resolve,reject)=>{
  // argv and stdin only: neither filenames nor source text become shell code.
  const child=spawn('python3',['-I','-c',"import sys,json;sys.path.insert(0,sys.argv[1]);import adapter;r=json.load(sys.stdin);v=adapter.analyze(r['text']) if 'text' in r else adapter.extract(r['path'],browser=True);print(json.dumps(v,ensure_ascii=False))",join(root,'scripts/book-adapter')],{stdio:['pipe','pipe','pipe'],env:{...process.env,PYTHONIOENCODING:'utf-8'}});
  const timer=setTimeout(()=>child.kill(),110000);
  const stop=()=>child.kill();process.once('exit',stop);
  let output='',errors='';child.stdout.setEncoding('utf8');child.stderr.setEncoding('utf8');
  child.stdout.on('data',part=>{output+=part;if(output.length>limits.maxTextBytes*2)child.kill();});
  child.stderr.on('data',part=>{errors=(errors+part).slice(-1000);});
  child.on('error',error=>{clearTimeout(timer);process.removeListener('exit',stop);reject(error);});
  child.on('close',code=>{clearTimeout(timer);process.removeListener('exit',stop);if(code!==0)reject(new Error('Native source extraction failed.'));else{try{resolve(JSON.parse(output));}catch{reject(new Error('Native source extraction returned invalid data.'));}}});
  child.stdin.on('error',()=>{});child.stdin.end(JSON.stringify(request));
 });
}
async function pdfText(bytes) {
 const {getDocument}=await import('pdfjs-dist/legacy/build/pdf.mjs');
 const task=getDocument({data:new Uint8Array(bytes),isEvalSupported:false,useSystemFonts:false,disableFontFace:true});
 task.onPassword=()=>{void task.destroy();};
 try {
  const pdf=await task.promise;if(pdf.numPages>limits.maxPdfPages)throw new Error('This PDF exceeds the 1,500-page limit.');
  let text='';
  for(let pageNumber=1;pageNumber<=pdf.numPages;pageNumber++){
   const page=await pdf.getPage(pageNumber),content=await page.getTextContent();
   const value=content.items.map(item=>'str' in item?item.str+(item.hasEOL?'\n':' '):'').join('');page.cleanup();
   if(value.trim().length<20&&pageNumber>2&&pageNumber<pdf.numPages-1)throw new Error('Scanned PDF pages need OCR before upload.');
   text+=`\n[Page ${pageNumber}]\n${value}\n`;if(text.length>limits.maxTextCharacters)throw new Error('Source exceeds six million extracted characters.');
  }
  return text;
 }finally{await task.destroy();}
}
let directory;
try {
 const bundle=JSON.parse(await readFile(new URL('../assets/book-extractor.json',import.meta.url),'utf8'));
 const text=workerData.extension==='.pdf'?await pdfText(workerData.bytes):null;
 let result;
 if(workerData.runtime!=='wasm'){
  directory=await mkdtemp(join(tmpdir(),'awb-extract-'));
  for(const [name,content] of Object.entries(bundle.files)){
   const target=resolve(directory,name);if(!target.startsWith(directory+'/'))throw new Error('Invalid bundled extractor path.');
   await mkdir(dirname(target),{recursive:true});await writeFile(target,content,{mode:0o600});
  }
  const path=join(directory,'source'+workerData.extension);if(text===null)await writeFile(path,workerData.bytes,{mode:0o600});
  try {result=await runPython(directory,text===null?{path}:{text});result.extractionRuntime='python3';}
  catch(error){if(error.code!=='ENOENT')throw error;}
 }
 if(!result){
  const {loadPyodide}=await import('pyodide');
  const python=await loadPyodide({stdout:()=>{},stderr:()=>{}});
  for(const [name,content] of Object.entries(bundle.files)){const path='/bookcli/'+name;python.FS.mkdirTree(path.slice(0,path.lastIndexOf('/')));python.FS.writeFile(path,content);}
  python.runPython("import sys; sys.path.insert(0, '/bookcli/scripts/book-adapter'); import adapter, json");
  let raw;
  if(text!==null){python.globals.set('book_text',text);raw=python.runPython('json.dumps(adapter.analyze(book_text), ensure_ascii=False)');}
  else{const path='/tmp/source'+workerData.extension;python.FS.writeFile(path,new Uint8Array(workerData.bytes));python.globals.set('book_path',path);raw=python.runPython('json.dumps(adapter.extract(book_path, browser=True), ensure_ascii=False)');}
  result=JSON.parse(raw);result.extractionRuntime='pyodide';
 }
 if(directory){await rm(directory,{recursive:true,force:true});directory=null;}
 parentPort.postMessage({result});
}catch(error){if(directory)await rm(directory,{recursive:true,force:true});parentPort.postMessage({error:error.message||'Could not extract the source.'});}
