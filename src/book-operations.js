import {credentials,privateCall,nativeCall,resolvePrivateId} from './account.js';
export async function bookOperation(action,id,options={},deps={}){
 if(!['pause','retry','generate','revisions','activate','status'].includes(action))throw new Error('Unsupported book operation.');
 if(!id)throw new Error('Choose a private book or revision ID.');
 if(action==='activate'&&options.acceptReview!==true)throw new Error('Review this ready revision, then use activate ID --accept-review.');
 const session=deps.session||await credentials(true);
 const resolved=await (deps.resolve||resolvePrivateId)(id,session);
 const call=deps.call||privateCall;
 if(['pause','retry','generate'].includes(action)){
  const {job}=await call({action:'status',id:resolved},session);
  if(!job)throw new Error('The service did not return the selected revision status.');
  if(job.source_import?.kind==='native'&&job.source_import.state!=='complete'){
   if(action==='retry')return (deps.nativeCall||nativeCall)({action:'retry',id:resolved},session);
   if(action==='pause')throw new Error('Native source extraction cannot be paused yet. Check status before pausing skill generation.');
   throw new Error('Native source extraction must finish before generating the skill. Use retry for a failed extraction.');
  }
 }
 return call({action,id:resolved,...(action==='activate'?{reviewAccepted:true}:{})},session);
}
