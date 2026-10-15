"""Import complete MetaBot overall map-agent tables from reviewed web-reader text exports."""
import argparse,json,pathlib,re

def parse(text,mapname):
    text=re.sub(r'^L\d+: ?', '', text, flags=re.M)
    table=text.split('Complete agent performance data on '+mapname,1)[1].split('## Attack Side',1)[0]
    updated=re.search(r'Last Updated\s+([^\n]+)',text)[1].strip()
    rows={}
    for line in table.splitlines():
        c=[x.strip() for x in line.split('|')]
        if len(c)!=9 or c[3] not in ('Duelist','Controller','Initiator','Sentinel'):continue
        name=re.fullmatch(r'【\d+†([^】]+)】',c[1])
        if not name:continue
        agent=name[1];n=int(c[5].replace(',',''));wr=float(c[6].rstrip('%'));pr=float(c[7].rstrip('%'))
        if agent in rows or n<=0 or not 0<=wr<=100 or not 0<=pr<=100:raise ValueError('Invalid/duplicate agent row')
        rows[agent]=dict(matches=n,winRate=wr,pickRate=pr)
    if len(rows)<20:raise ValueError(f'{mapname}: incomplete table ({len(rows)} rows)')
    return dict(source=f'https://metabot.gg/en/valorant/map/{mapname}/agents',updated=updated,scope='Competitive · all ranks, regions and platforms',patch=None,agents=rows)

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--input-dir',required=True);p.add_argument('--output',required=True);p.add_argument('--checked',required=True);a=p.parse_args()
    maps={}
    for f in sorted(pathlib.Path(a.input_dir).glob('agents-*.txt')):
        name=f.stem.removeprefix('agents-');maps[name]=parse(f.read_text(),name)
    if not maps:raise ValueError('No agent tables found')
    dest=pathlib.Path(a.output);tmp=dest.with_suffix('.tmp');tmp.write_text('export const rankedAgentSnapshot = '+json.dumps(dict(checkedAt=a.checked,maps=maps),indent=2)+';\n');tmp.replace(dest)
    print(f'Imported {len(maps)} maps / {sum(len(v["agents"]) for v in maps.values())} agent rows')
