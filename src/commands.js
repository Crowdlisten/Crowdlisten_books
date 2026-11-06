export const commands=[
 {name:'books',aliases:['list'],usage:'books [--offset N]',description:'Browse shared books and chapter maps.'},
 {name:'book',usage:'book BOOK_ID',description:'Read a book introduction and questions to explore.'},
 {name:'guides',usage:'guides [--mine]',description:'Browse published guides, or your saved and processing guides.'},
 {name:'guide',usage:'guide GUIDE_ID',description:'Read a guide with original passages, or check its progress.'},
 {name:'create-guide',usage:'create-guide "QUESTION" [--request-key UUID]',description:'Propose books for a public guide. Requires a subscription. Confirm books and minutes before generation.'},
 {name:'confirm-guide',usage:'confirm-guide GUIDE_ID --minutes 10|25|45',description:'Confirm suggested books and reserve one monthly guide.'},
 {name:'ask',aliases:['answer'],usage:'ask "QUESTION"',description:'Answer from existing guides and cited original passages; no new guide allowance used.'},
 {name:'source',usage:'source BOOK_ID [--start-line N --end-line N]',description:'Read 1–500 original lines through the subscriber reader. No file download.'},
 {name:'upload',usage:'upload FILE [...]',description:'Add books to the public library. Free hosted extraction and duplicate checks.'},
 {name:'plan',usage:'plan',description:'Check your subscription and remaining monthly guide allowance.'},
 {name:'login',usage:'login [--no-browser]',description:'Connect your account through browser sign-in.'},
 {name:'logout',usage:'logout',description:'Revoke this agent’s account access.'},
 {name:'install',usage:'install [--skill] [--agent codex|claude-code|cursor|github-copilot|gemini-cli|opencode|openclaw] [--skill-dir PATH]',description:'Install the single Answer with Books skill.'},
];
export function parseArgs(args){const values={},positionals=[],bool=new Set(['json','mine','noBrowser','skill']),fields=new Set(['offset','minutes','requestKey','startLine','endLine','agent','skillDir']);let positional=false;for(let i=0;i<args.length;i++){const arg=args[i];if(arg==='--'){positional=true;continue;}if(positional||!arg.startsWith('--')){positionals.push(arg);continue;}const [raw,inline]=arg.slice(2).split(/=(.*)/s),key=raw.replace(/-([a-z])/g,(_,l)=>l.toUpperCase());if(bool.has(key)){if(inline!==undefined)throw Error('Invalid boolean option');values[key]=true;continue;}if(!fields.has(key))throw Error('Unknown option: --'+raw);const value=inline??args[++i];if(!value||value.startsWith('--'))throw Error('Missing value: --'+raw);values[key]=value;}return {values,positionals};}
