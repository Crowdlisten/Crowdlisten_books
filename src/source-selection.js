import {lstat,readdir} from 'node:fs/promises';
import {resolve,join,extname,dirname,basename,sep} from 'node:path';
export const supportedSource=path=>/^\.(pdf|epub|docx|html|htm|xhtml|rtf|txt|text|md|markdown|rst|adoc|asciidoc|mobi|azw|azw3)$/i.test(extname(path));
function globPattern(value){
 let result='^';
 for(let i=0;i<value.length;i++){
  const c=value[i];
  if(c==='*'&&value[i+1]==='*'){i++;if(value[i+1]==='/'){i++;result+='(?:.*/)?';}else result+='.*';}
  else if(c==='*')result+='[^/]*';else if(c==='?')result+='[^/]';else result+=c.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 }
 return new RegExp(result+'$');
}
export async function expandSources(inputs){
 const found=new Set();let visited=0;
 async function add(path){found.add(resolve(path));if(found.size>10)throw new Error('Choose up to ten files per batch. Narrow the folder or glob.');}
 async function walk(path,pattern){
  if(++visited>5000)throw new Error('Source selection is too broad. Choose a smaller folder or glob.');
  const info=await lstat(path);if(info.isSymbolicLink())return;
  if(info.isFile()){if(supportedSource(path)&&(!pattern||pattern.test(path.split(sep).join('/'))))await add(path);return;}
  if(!info.isDirectory())return;
  for(const item of (await readdir(path)).filter(name=>!name.startsWith('.')).sort())await walk(join(path,item),pattern);
 }
 for(const input of inputs){
  const path=resolve(input);
  if(/[?*]/.test(path)){
   const first=path.search(/[?*]/),prefix=path.slice(0,first),root=prefix.endsWith(sep)?prefix:dirname(prefix);
   await walk(root,globPattern(path.split(sep).join('/')));
  }else{const info=await lstat(path);if(info.isDirectory())await walk(path);else await add(path);}
 }
 if(!found.size)throw new Error('No supported source files matched your selection.');
 return [...found];
}
export function collectionText(parts,title){
 let text=`# ${title}\n\nThis is a collection of separate sources. Keep author claims and document boundaries distinct.\n`,sources=[];
 for(const part of parts){
  const startLine=text.split('\n').length+1;
  text+=`\n# SOURCE: ${basename(part.file)}\nSource SHA-256: ${part.sha}\n\n${part.report.text.trim()}\n`;
  sources.push({name:basename(part.file),sha256:part.sha,startLine,endLine:text.split('\n').length-1});
 }
 return {text,sources};
}
