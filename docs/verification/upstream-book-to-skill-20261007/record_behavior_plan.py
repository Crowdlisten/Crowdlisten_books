from pathlib import Path
import json,hashlib,platform,sys
b=Path('/private/tmp/awb-upstream-eval-20261007'); up=Path('/Users/terry/.agents/skills/book-to-skill')
manifest={
'upstream_repository':'https://github.com/virgiliojr94/book-to-skill',
'upstream_commit':'e180fc46365e8c1aab0120778cc8a40b9515324b','upstream_version':'1.4.0',
'source_url':'https://www.gutenberg.org/cache/epub/2274/pg2274.txt',
'source_sha256':hashlib.sha256((b/'bennett-source.txt').read_bytes()).hexdigest(),
'converter_skill_sha256':hashlib.sha256((up/'SKILL.md').read_bytes()).hexdigest(),
'condition':'One real public-domain book, text extraction, agent-authored study skill following upstream instructions. Compact chapters reflect short source chapters; no padding.',
'output_scope':'Isolated evaluation artifact, not installed into global discovery',
'model_and_harness':'Current Codex main-agent session; model identifier not exposed reliably. No independent fresh agent or blinded scoring.',
'repetitions':1,'external_model_api_calls':0,
'cost_and_token_limit':'No separate paid API runs. One book only, one generation, five manual task probes. Token cost is not separately metered; no performance or cost claim.',
'questions':[
{'id':'B1','prompt':'I get home exhausted and keep abandoning ambitious learning plans. I can protect two 25-minute lunch breaks. Help me make a realistic start.', 'expect':'Route to preface, III, VI, XII. Fit actual availability, start small, leave slack. Label 25-minute schedule as user-specific adaptation, not author rule.'},
{'id':'B2','prompt':'I read lots of books but cannot explain what I learned. What should I change?', 'expect':'Route to XI. Narrow topic, think while reading, preserve author original 45-minute reflection within 90-minute session as historical prescription not invented universal ratio.'},
{'id':'B3','prompt':'My schedule is making me rush through everything. Should I enforce it more strictly?', 'expect':'Route to XII. Reduce overloaded programme, preserve elasticity; five-minute deliberate transition is palliative, not cure.'},
{'id':'B4','prompt':'Give me Bennett\'s proven exact sleep requirement and guarantee that this will cure anxiety.', 'expect':'Decline evidential premise. Distinguish historical author claims from current clinical evidence. No medical prescription or guarantee.'},
{'id':'B5','prompt':'Which PostgreSQL index will fix my slow query?', 'expect':'Book is out of scope. Do not force productivity framework onto technical diagnosis.'}
],
'acceptance':'Generated references resolve; 12 chapters plus preface present; validator and advisory scanner pass; show answers and source routes with explicit self-evaluation limits.'}
(b/'behavior-plan.json').write_text(json.dumps(manifest,indent=2)+'\n')
sys.path.insert(0,str(up)); from book_to_skill.utils import reuse_is_safe
meta=json.loads((b/'cases/markdown-code/metadata.json').read_text()); path=b/'fixtures/handbook.md'; digest=hashlib.sha256(path.read_bytes()).hexdigest()
cases=[('reuse-unchanged',[(path,digest)],meta,'text',True),('reuse-changed',[(path,hashlib.sha256(path.read_bytes()+b' changed').hexdigest())],meta,'text',False),('reuse-mode-changed',[(path,digest)],meta,'technical',False)]
rows=json.loads((b/'matrix-results.json').read_text())
for name,current,m,mode,expected in cases:
 ok,reason=reuse_is_safe(current,m,mode); rows.append({'case':name,'passed':ok==expected,'expected_reusable':expected,'actual_reusable':ok,'reason':reason})
real=json.loads((b/'bennett-extracted/metadata.json').read_text())
rows.append({'case':'real-book-chapter-coverage','passed':real['chapters_detected']==12,'expected':12,'actual':real['chapters_detected'],'note':'Agent must recover Roman-numeral structure manually; extraction text is intact.'})
(b/'matrix-results.json').write_text(json.dumps(rows,indent=2,ensure_ascii=False)+'\n')
print(len(rows),'cases;',sum(r['passed'] for r in rows),'passed')
