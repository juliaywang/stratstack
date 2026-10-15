"""Normalize reviewed plain-text/web-reader exports; never infer missing map/sample data."""
import argparse
import json
import pathlib
import re

def clean(text):
    return re.sub(r'^L\d+: ?', '', text, flags=re.M)

def metabot(text, checked):
    text = clean(text)
    rows = []
    for block in re.split(r'(?m)^#\d+\s*$', text)[1:]:
        names = re.findall(r'【\d+†Image: ([^†】]+)(?:†[^】]+)?】', block)[:5]
        matches = re.search(r'([\d,]+) Matches', block)
        wins = re.search(r'([\d,]+) Wins', block)
        rate = re.search(r'([\d.]+)%Win Rate', block)
        pick = re.search(r'([\d.]+)%Pick Rate', block)
        if len(set(names)) != 5 or not all([matches, wins, rate, pick]):
            continue
        n, w = int(matches[1].replace(',', '')), int(wins[1].replace(',', ''))
        if not 0 <= w <= n or n == 0 or abs(w/n*100-float(rate[1])) > .15:
            raise ValueError('Inconsistent MetaBot match counts')
        rows.append(dict(provider='metabot', kind='ranked', agents=names, map=None,
                         matches=n, wins=w, winRate=float(rate[1]), pickRate=float(pick[1]),
                         scope='All ranks · all regions · competitive · map unspecified',
                         sourceUpdated=re.search(r'Updated ([^\n]+)', text)[1], patch=None,
                         checkedAt=checked, source='https://metabot.gg/en/valorant/comps/win-rate'))
    return rows

def valohub(text, checked):
    text = clean(text)
    if 'editorial' not in text.lower():
        raise ValueError('Review ValoHub methodology before import')
    rows=[]
    for block in re.split(r'### Best Comps for ', text)[1:]:
        mapname=re.match(r'【\d+†([^】]+)】',block)
        if not mapname:
            continue
        for line in block.splitlines():
            match=re.fullmatch(r'(.+ · .+) ([\d.]+)%([\d.]+)% pick',line.strip())
            if not match:
                continue
            names=match[1].split(' · ')
            if len(set(names)) != 5:
                continue
            rows.append(dict(provider='valohub',kind='editorial',agents=names,map=mapname[1],
                             matches=None,wins=None,winRate=float(match[2]),pickRate=float(match[3]),
                             scope='Editorial estimate · not measured ranked matches',
                             sourceUpdated='2026-05-28',patch='12.10',checkedAt=checked,
                             source='https://valohub.co/meta/comps'))
    return rows

if __name__ == '__main__':
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--metabot-text',required=True);p.add_argument('--valohub-text',required=True)
    p.add_argument('--checked',required=True);p.add_argument('--output',required=True)
    args=p.parse_args()
    rows=metabot(pathlib.Path(args.metabot_text).read_text(),args.checked)+valohub(pathlib.Path(args.valohub_text).read_text(),args.checked)
    if not rows or not any(r['provider']=='valohub' for r in rows) or not any(r['provider']=='metabot' for r in rows):
        raise ValueError('Missing provider rows; keeping existing snapshot')
    target=pathlib.Path(args.output);temporary=target.with_suffix('.tmp')
    temporary.write_text('// Reviewed source snapshot. Refresh with scripts/import-meta-sources.py.\nexport const metaCompositions = '+json.dumps(rows,indent=2)+';\n')
    temporary.replace(target)
    print(f'Imported {len(rows)} source compositions')
