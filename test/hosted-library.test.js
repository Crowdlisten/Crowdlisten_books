import test from 'node:test';import assert from 'node:assert/strict';
import {searchHostedLibrary,hostedAskResult} from '../src/hosted-library.js';
const session={token:'awb_cli_'+'a'.repeat(64),user_id:'owner'},book='00000000-0000-4000-8000-000000000001';
test('hosted search uses one authenticated request without catalog download or skill installation',async()=>{
 const calls=[];
 const result=await searchHostedLibrary('How should we specialize?',{book},{session,call:async(...args)=>{calls.push(args);return {status:'needs_reasoning',method:'hybrid',matches:[{book:{book_id:book,title:'Smith'},summary:'Market extent',citations:[]}]};}});
 assert.equal(calls.length,1);assert.equal(calls[0][0],'book-library');assert.deepEqual(calls[0][1],{action:'search',question:'How should we specialize?',book});assert.equal(calls[0][2],session.token);
 const answer=hostedAskResult(result);assert.equal(answer.objects.books[0].summary,'Market extent');assert.equal(answer.status,'needs_reasoning');
});
test('invalid scopes, response shapes, and missing deployment fail visibly without public fallback',async()=>{
 for(const options of [{public:true},{book:'../../file'},{apiUrl:'https://example.invalid'}])await assert.rejects(()=>searchHostedLibrary('Work',options,{session}));
 await assert.rejects(()=>searchHostedLibrary('Work',{}, {session,call:async()=>({matches:[]})}),/invalid library/);
 await assert.rejects(()=>searchHostedLibrary('Work',{}, {session,call:async()=>{throw Error('Endpoint unavailable');}}),/Endpoint unavailable/);
});
