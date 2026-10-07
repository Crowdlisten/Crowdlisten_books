import hashlib,json,re,subprocess,sys,zipfile
from pathlib import Path
b=Path('/private/tmp/awb-upstream-eval-20261007'); up=Path('/Users/terry/.agents/skills/book-to-skill'); root=b/'generated/bennett-time'
checks=[]
def record(name,ok,detail): checks.append({'check':name,'passed':bool(ok),'detail':detail})
for tool in ['validate_skill.py','scan_generated_skill.py']:
    arg=root/'SKILL.md' if tool=='validate_skill.py' else root
    p=subprocess.run([sys.executable,str(up/'tools'/tool),str(arg)],capture_output=True,text=True)
    (b/(tool+'.txt')).write_text(p.stdout+p.stderr)
    record(tool,p.returncode==0,p.stdout.strip())
links=[]
for path in root.rglob('*.md'):
    for target in re.findall(r'\]\(([^)]+)\)',path.read_text()):
        if '://' not in target and not target.startswith('#'):
            dest=(path.parent/target.split('#')[0]).resolve(); links.append((str(path.relative_to(root)),target,dest.is_file()))
record('relative-links',all(x[2] for x in links),{'count':len(links),'broken':[x for x in links if not x[2]]})
m=json.loads((root/'source-map.json').read_text()); lines=(root/'source.txt').read_text().splitlines()
record('chapter-map',len(m['chapters'])==12 and all(re.fullmatch('[IVX]+',lines[c['source_start_line']-1]) for c in m['chapters']),{'chapters':len(m['chapters']),'preface_present':(root/'chapters/ch00-preface.md').exists()})
record('source-hash',hashlib.sha256((root/'source.txt').read_bytes()).hexdigest()==m['sha256'],m['sha256'])
body=(root/'SKILL.md').read_text().split('---',2)[2]; estimate=int(len(body.split())/0.75)
record('core-size',estimate<4000,{'estimated_tokens_word_heuristic':estimate,'not_actual_model_tokens':True})
zip_path=b/'bennett-time.zip'
with zipfile.ZipFile(zip_path,'w',zipfile.ZIP_DEFLATED) as z:
    for path in sorted(root.rglob('*')):
        if path.is_file(): z.write(path, str(path.relative_to(root.parent)))
with zipfile.ZipFile(zip_path) as z:
    record('zip-integrity',z.testzip() is None and 'bennett-time/source.txt' in z.namelist(),{'files':len(z.namelist()),'bytes':zip_path.stat().st_size})
(b/'generated-checks.json').write_text(json.dumps(checks,indent=2)+'\n')
print(json.dumps(checks,indent=2))
if not all(x['passed'] for x in checks): raise SystemExit(1)
