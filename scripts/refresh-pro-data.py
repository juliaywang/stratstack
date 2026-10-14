"""Refresh a bounded VLR snapshot; run manually with network access."""
import re,json,subprocess,concurrent.futures,pathlib,html
root=pathlib.Path(__file__).resolve().parents[1]
def fetch(url):
 return subprocess.check_output(['curl','--fail','-LsS','--max-time','25',url],text=True)
listing=fetch('https://www.vlr.gg/matches/results')
links=re.findall(r'<a\s+href="([^"]+)"\s+class="[^"]*match-item',listing)[:8]
def match(link):
 source='https://www.vlr.gg'+link
 s=fetch(source)
 date=re.search(r'data-utc-ts="(\d{4}-\d{2}-\d{2})',s).group(1)
 records=[]
 for chunk in re.split(r'<div class="vm-stats-game\s*" data-game-id="\d+">',s)[1:]:
  teams=[html.unescape(t.strip()) for t in re.findall(r'<div class="team-name">\s*([^<]+)',chunk)[:2]]
  m=re.search(r'<div class="map-name">\s*<span[^>]*>\s*([^<]+)',chunk)
  picks=re.findall(r'<img src="/img/vlr/game/agents/[^\"]+" alt="[^\"]+" title="([^\"]+)"',chunk)
  if len(teams)!=2 or not m or len(picks)!=10: continue
  for i,t in enumerate(teams):
   agents=['KAY/O' if a=='Kayo' else a for a in picks[i*5:(i+1)*5]]
   if len(set(agents))!=5: continue
   records.append(dict(team=t,map=m.group(1).strip(),agents=agents,sample=1,date=date,source=source))
 return records
records=[r for result in concurrent.futures.ThreadPoolExecutor(max_workers=4).map(match,links) for r in result]
assert records, 'No complete match compositions found; existing snapshot retained.'
(root/'pro-data.json').write_text(json.dumps(records,indent=2)+'\n')
print(json.dumps({'records':len(records),'maps':sorted(set(r['map'] for r in records)),'dates':sorted(set(r['date'] for r in records))}))
