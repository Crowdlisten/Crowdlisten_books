import {cpSync,existsSync,mkdirSync,readFileSync} from 'node:fs';
import {homedir} from 'node:os';
import {join,resolve} from 'node:path';
export const agentFolders={codex:'.codex/skills','claude-code':'.claude/skills',cursor:'.cursor/skills','github-copilot':'.copilot/skills','gemini-cli':'.gemini/skills',opencode:'.config/opencode/skills',openclaw:'.openclaw/skills'};
export function installSkill(root,{agent='codex',skillDir}={},env=process.env,home=homedir()){
 if(!agentFolders[agent])throw Error('Unsupported agent. Choose '+Object.keys(agentFolders).join(', '));
 const folder=skillDir?resolve(skillDir):agent==='codex'&&env.CODEX_HOME?join(resolve(env.CODEX_HOME),'skills'):join(home,agentFolders[agent]);
 const target=join(folder,'answer-with-books'),source=join(root,'skill','answer-with-books');
 // A changed reference is also a user edit; check the whole skill before writing.
 for(const name of ['SKILL.md','references/commands.md'])if(existsSync(join(target,name))&&readFileSync(join(target,name),'utf8')!==readFileSync(join(source,name),'utf8'))throw Error('An existing skill differs. Review it before replacing; no files were changed.');
 const previous=join(target,'runtime/package.json');if(existsSync(previous)){const old=JSON.parse(readFileSync(previous,'utf8')).version.split('.').map(Number),next=JSON.parse(readFileSync(join(root,'package.json'),'utf8')).version.split('.').map(Number);for(let i=0;i<3;i++){if(old[i]>next[i])throw Error('A newer runtime is installed; no files were changed.');if(old[i]<next[i])break;}}
 mkdirSync(target,{recursive:true});cpSync(source,target,{recursive:true});
 const runtime=join(target,'runtime');mkdirSync(join(runtime,'src'),{recursive:true});
 for(const name of ['bin','package.json'])cpSync(join(root,name),join(runtime,name),{recursive:true});
 for(const name of ['account.js','commands.js','reader.js','installer.js'])cpSync(join(root,'src',name),join(runtime,'src',name));
 return {installed:target,agent};
}
