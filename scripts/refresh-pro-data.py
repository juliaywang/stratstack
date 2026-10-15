"""Refresh source-linked VLR team/map compositions; atomic, bounded and deduplicated."""
import argparse
import concurrent.futures
import datetime
import html
import json
import pathlib
import re
import subprocess
import time

ROOT = pathlib.Path(__file__).resolve().parents[1]


def fetch(url):
    time.sleep(0.2)
    return subprocess.check_output(['curl', '--fail', '-LsS', '--max-time', '25', url], text=True)


def parse_match(page, source):
    date_match = re.search(r'data-utc-ts="(\d{4}-\d{2}-\d{2})', page)
    if not date_match:
        return []
    event_match = re.search(r'class="match-header-event"[^>]*>(.*?)</a>', page, re.S)
    patch_match = re.search(r'Patch\s+([0-9]+\.[0-9]+)', page)
    event = ''
    if event_match:
        names = re.findall(r'<div[^>]*>\s*([^<]+)', event_match.group(1))
        event = next((html.unescape(n.strip()) for n in names if n.strip()), '')
    # Split at ALL stats panels, including the interleaved aggregate "all" panel.
    # Splitting only numeric panels lets aggregate picks contaminate the first map.
    sections = re.split(r'<div\s+class="vm-stats-game(?:\s[^\"]*)?"\s+data-game-id="([^\"]+)"[^>]*>', page)
    records = []
    for game_id, chunk in zip(sections[1::2], sections[2::2]):
        if not game_id.isdigit():
            continue
        teams = [html.unescape(t.strip()) for t in re.findall(r'<div class="team-name">\s*([^<]+)', chunk)[:2]]
        map_match = re.search(r'<div class="map-name">\s*<span[^>]*>\s*([^<]+)', chunk)
        images = re.findall(r'<img\b[^>]*src="/img/vlr/game/agents/[^\"]+"[^>]*>', chunk)
        picks = []
        for image in images:
            name = re.search(r'\btitle="([^\"]+)"', image)
            if name:
                agent = html.unescape(name.group(1))
                picks.append('KAY/O' if agent in ('Kayo', 'KAYO', 'Kay/o') else agent)
        if len(teams) != 2 or not map_match or len(picks) != 10:
            continue
        for i, team in enumerate(teams):
            agents = picks[i*5:(i+1)*5]
            if len(set(agents)) != 5:
                continue
            records.append(dict(team=team, map=map_match.group(1).strip(), agents=agents,
                                sample=1, date=date_match.group(1), event=event,
                                source=source.rstrip('/')+'/?game='+game_id, gameId=game_id, **({'patch':patch_match.group(1)} if patch_match else {})))
    return records


def identity(record):
    # Also matches older records whose links did not yet contain the game id.
    match_id=re.search(r'vlr\.gg/(\d+)',record['source'])
    return (match_id.group(1) if match_id else record['source'].split('?')[0].rstrip('/'), record['map'], record['team'])


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--match-url', action='append', default=[], help='Import a specific VLR match instead of results pages (repeatable)')
    parser.add_argument('--start-page', type=int, default=1, help='First results page; use later pages for historical map coverage')
    parser.add_argument('--pages', type=int, default=4, help='Recent results pages (1–12)')
    parser.add_argument('--max-matches', type=int, default=150, help='Maximum match pages (1–500)')
    args = parser.parse_args()
    if not 1 <= args.start_page <= 1000 or not 1 <= args.pages <= 12 or not 1 <= args.max_matches <= 500:
        parser.error('Use 1–12 pages and 1–500 matches.')
    links = []
    for url in args.match_url:
        if not re.match(r'^https://www\.vlr\.gg/\d+(?:/[^?#]*)?$', url):
            parser.error('Explicit match URLs must be https://www.vlr.gg/<match-id>/... without query strings.')
        links.append(url.removeprefix('https://www.vlr.gg'))
    for page in ([] if args.match_url else range(args.start_page, args.start_page+args.pages)):
        listing = fetch('https://www.vlr.gg/matches/results/?page='+str(page))
        links.extend(re.findall(r'<a\s+href="([^"]+)"\s+class="[^"]*match-item', listing))
    links = list(dict.fromkeys(links))[:args.max_matches]
    if not links:
        raise RuntimeError('No match links found; previous snapshot retained.')
    failed = []
    def match(link):
        source = 'https://www.vlr.gg'+link
        try:
            return parse_match(fetch(source), source)
        except (subprocess.SubprocessError, ValueError) as error:
            failed.append(source)
            return []
    fresh = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        for rows in pool.map(match, links):
            fresh.extend(rows)
    if not fresh:
        raise RuntimeError('No complete compositions found; previous snapshot retained.')
    old = json.loads((ROOT/'pro-data.json').read_text()) if (ROOT/'pro-data.json').exists() else []
    records = {identity(row):row for row in old}
    records.update({identity(row):row for row in fresh})
    records = sorted(records.values(), key=lambda r:(r['date'],r['source'],r['team']), reverse=True)
    output = ROOT/'pro-data.json'
    temporary = output.with_suffix('.json.tmp')
    temporary.write_text(json.dumps(records, indent=2)+'\n')
    temporary.replace(output)
    print(json.dumps({'records':len(records),'freshRecords':len(fresh),'matchesRequested':len(links),
                      'failedMatches':len(failed),'maps':{m:sum(r['sample'] for r in records if r['map']==m) for m in sorted({r['map'] for r in records})},
                      'from':min(r['date'] for r in records),'through':max(r['date'] for r in records)}))


if __name__ == '__main__':
    main()
