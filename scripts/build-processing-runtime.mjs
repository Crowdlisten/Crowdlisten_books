// Copy the exact dependency closure used by the hosted text compiler.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,dirname,join} from 'node:path';
import {createHash} from 'node:crypto';
const source=resolve(process.argv[2]||'../web/supabase/functions/_shared');
const target=new URL('../assets/processing/',import.meta.url);mkdirSync(target,{recursive:true});
const pending=['book-export.mjs','book-distillation.mjs','book-overview.mjs','book-sections.mjs','upstream-sanitize.mjs','book-options.mjs','book-skill-review.mjs'];const hashes={};
while(pending.length){const name=pending.pop();if(hashes[name])continue;const text=readFileSync(join(source,name),'utf8');hashes[name]=createHash('sha256').update(text).digest('hex');writeFileSync(new URL(name,target),text);for(const match of text.matchAll(/from\s+['"]\.\/([^'"]+)['"]/g))pending.push(match[1]);}
writeFileSync(new URL('manifest.json',target),JSON.stringify({source:'Answer With Books hosted text pipeline',files:hashes},null,2)+'\n');
