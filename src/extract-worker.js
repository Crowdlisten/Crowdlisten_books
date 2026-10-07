import {parentPort,workerData} from 'node:worker_threads';
import {readFile} from 'node:fs/promises';
import {loadPyodide} from 'pyodide';
import limits from '../assets/upload-limits.json' with {type:'json'};
try {
 const bundle=JSON.parse(await readFile(new URL('../assets/book-extractor.json',import.meta.url),'utf8'));
 const python=await loadPyodide({stdout:()=>{},stderr:()=>{}});
 for(const [name,content] of Object.entries(bundle.files)){const path='/bookcli/'+name;python.FS.mkdirTree(path.slice(0,path.lastIndexOf('/')));python.FS.writeFile(path,content);}
 python.runPython("import sys; sys.path.insert(0, '/bookcli/scripts/book-adapter'); import adapter, json");
 let result;
 if(workerData.extension==='.pdf') {
  const {getDocument}=await import('pdfjs-dist/legacy/build/pdf.mjs');
  const task=getDocument({data:new Uint8Array(workerData.bytes),isEvalSupported:false,useSystemFonts:false,disableFontFace:true});
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
   python.globals.set('book_text',text);result=python.runPython('json.dumps(adapter.analyze(book_text), ensure_ascii=False)');
  }finally{await task.destroy();}
 }else {
  const path='/tmp/source'+workerData.extension;python.FS.writeFile(path,new Uint8Array(workerData.bytes));python.globals.set('book_path',path);
  result=python.runPython('json.dumps(adapter.extract(book_path, browser=True), ensure_ascii=False)');
 }
 parentPort.postMessage({result:JSON.parse(result)});
}catch(error){parentPort.postMessage({error:error.message||'Could not extract the source.'});}
