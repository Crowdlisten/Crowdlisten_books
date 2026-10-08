import {credentials,serviceCall} from './account.js';
import {validateMatchQuestion} from './semantic.js';
export async function searchHostedLibrary(question,options={},deps={}) {
 validateMatchQuestion(question);
 if(options.public)throw new Error('Hosted library search reads private books. Use match --public for the editorial shelf.');
 if(options.apiUrl||process.env.ANSWER_WITH_BOOKS_API_URL)throw new Error('Private hosted search uses your connected Answer With Books account. Unset the public API override.');
 if(options.book&&!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(options.book))throw new Error('Use a returned private book ID.');
 const session=deps.session||await credentials(true);
 const result=await (deps.call||serviceCall)('book-library',{action:'search',question,...(options.book?{book:options.book}:{})},session.token);
 if(!Array.isArray(result.matches)||result.matches.length>6||result.status!=='needs_reasoning')throw new Error('The service returned invalid library evidence.');
 return result;
}
export function hostedAskResult(result) {
 return {...result,objects:{books:result.matches.map(match=>({...match,book:match.book})),answers:[],new_question:null},notice:result.semanticNotice||'Private chapter methods retrieved by meaning and keywords. Check their relevance before applying them.'};
}
