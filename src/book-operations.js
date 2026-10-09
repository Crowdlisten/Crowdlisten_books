import {credentials,privateCall,nativeCall,resolvePrivateId} from './account.js';
export async function bookOperation(action,id,options={},deps={}){
 if(!['cancel','quote','accept-price','pause','retry','generate','revisions','activate','status','usage','retry-cover'].includes(action))throw new Error('Unsupported book operation.');
 if(!id)throw new Error('Choose a private book or revision ID.');
 if(action==='activate'&&options.acceptReview!==true)throw new Error('Review this ready revision, then use activate ID --accept-review.');
 if(action==='accept-price'&&(!/^[a-f0-9-]{36}$/i.test(options.quote||'')||!/^\d+$/.test(String(options.priceCents))||Number(options.priceCents)<1))throw new Error('Review the quote, then use --quote QUOTE_ID --price-cents EXACT_CENTS.');
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
 return call({action,id:resolved,...(action==='activate'?{reviewAccepted:true}:action==='accept-price'?{quoteId:options.quote,acceptedPriceCents:Number(options.priceCents)}:{})},session);
}
