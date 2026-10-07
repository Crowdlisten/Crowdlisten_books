export const commands=[
 {name:'books',aliases:['list'],usage:'books [search] [--topic TOPIC] [--private | --public] [--json]',description:'List and search the public shelf and your connected private books.'},
 {name:'ask',aliases:['answer'],usage:'ask "QUESTION" [--book ID] [--top-of-mind "CONTEXT"] [--private | --public] [--json]',description:'Retrieve book methods and citations for your agent to apply.'},
 {name:'upload',usage:'upload FILE [FILE ...] [--process-file] [--json]',description:'Create separate private books, skills, and covers. Reuse saved sources first.'},
 {name:'status',usage:'status [BOOK_ID] [--json]',description:'Check your private processing queue or one book.'},
 {name:'download',usage:'download BOOK_ID [--output FILE.zip] [--accept-review]',description:'Download a completed book and skill, including citation sources.'},
 {name:'login',usage:'login [--no-browser]',description:'Connect your account through browser sign-in.'},
 {name:'logout',usage:'logout',description:'Revoke this agent’s account access.'},
 {name:'install',usage:'install [--skill] [--api]',description:'Install the Codex skill and optional local API.'},
 {name:'serve',usage:'serve',description:'Start the optional local public HTTP API.'},
];
export function parseArgs(args) {
 const bool=new Set(['json','full','private','public','noBrowser','processFile','acceptReview','help','skill','api']);
 const valueFlags=new Set(['topic','book','topOfMind','sources','source','apiUrl','format','audience','generate','output','depth','purpose']);
 const values={},positionals=[];let positional=false;
 for(let i=0;i<args.length;i++){
  const arg=args[i];if(arg==='--'){positional=true;continue;}
  if(positional||!arg.startsWith('--')){positionals.push(arg);continue;}
  const [keyRaw,inline]=arg.slice(2).split(/=(.*)/s),key=keyRaw.replace(/-([a-z])/g,(_,letter)=>letter.toUpperCase());
  if(bool.has(key)){if(inline!==undefined)throw new Error(`--${keyRaw} does not take a value`);values[key]=true;continue;}
  if(!valueFlags.has(key))throw new Error(`Unknown option: --${keyRaw}`);
  const next=inline??args[++i];if(next===undefined||next.startsWith('--'))throw new Error(`Missing value for --${keyRaw}`);values[key]=next;
 }
 if(values.private&&values.public)throw new Error('Choose either --private or --public.');
 return {values,positionals};
}
