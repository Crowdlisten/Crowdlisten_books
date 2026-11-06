#!/usr/bin/env node
import {dirname,resolve} from 'node:path';import {fileURLToPath} from 'node:url';
import {installSkill} from '../src/installer.js';
import {commands,parseArgs} from '../src/commands.js';import {login,logout} from '../src/account.js';
import {readerCall,uploadShared,guideRequest,guideConfirmation} from '../src/reader.js';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),args=process.argv.slice(2);
try{
 if(!args.length||args.includes('--help')||args[0]==='help')console.log('Answer with Books\n\n'+commands.map(c=>c.usage+'\n  '+c.description).join('\n\n'));
 else{const command=commands.find(c=>c.name===args[0]||c.aliases?.includes(args[0]));if(!command)throw Error('Unknown command. Run --help.');const {values,positionals:p}=parseArgs(args.slice(1));let result;const auth={authenticated:true};
 switch(command.name){
 case 'install':result=installSkill(root,values);break;
 case 'login':await login(values);break;case 'logout':await logout();break;
 case 'books':result=await readerCall('shared-library',{action:'list',offset:Number(values.offset||0)});break;
 case 'book':result=await readerCall('shared-library',{action:'get',id:p[0]});break;
 case 'guides':result=await readerCall('reading-guides',{action:values.mine?'list':'public-list'},{authenticated:!!values.mine});break;
 case 'guide':result=await readerCall('reading-guides',{action:'get',id:p[0]});break;
 case 'create-guide':result=await readerCall('reading-guides',guideRequest(p.join(' '),values.requestKey),auth);break;
 case 'confirm-guide':result=await readerCall('reading-guides',guideConfirmation(p[0],values.minutes),auth);break;
 case 'ask':result=await readerCall('reading-guides',{action:'answer',question:p.join(' ')},auth);break;
 case 'source':result=await readerCall('shared-library',{action:'source',id:p[0],startLine:Number(values.startLine||1),...(values.endLine?{endLine:Number(values.endLine)}:{})},auth);break;
 case 'upload':result=await uploadShared(p);break;
 case 'plan':result=await readerCall('reader-subscription',{action:'status'},auth);break;
 }
 if(result!==undefined)console.log(JSON.stringify(result,null,2));
 }
}catch(e){console.error(e.message||'Could not complete request');process.exitCode=1;}
