import importlib.util
import unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location('refresh',Path(__file__).resolve().parents[1]/'scripts/refresh-pro-data.py')
refresh=importlib.util.module_from_spec(spec)
spec.loader.exec_module(refresh)


def panel(game_id, map_name, picks):
    return '<div class="vm-stats-game mod-active" data-game-id="'+game_id+'"><div class="team-name">Alpha</div><div class="team-name">Bravo</div><div class="map-name"><span>'+map_name+'</span></div>'+''.join('<img src="/img/vlr/game/agents/x.png" title="'+p+'" alt="agent">' for p in picks)+'</div>'


class ParserTests(unittest.TestCase):
    def test_aggregate_panel_does_not_contaminate_first_map(self):
        picks=['Jett','Sova','Kayo','Omen','Killjoy','Raze','Fade','Breach','Viper','Cypher']
        page='<div data-utc-ts="2026-10-12 00:00:00"></div>'+panel('123','Lotus',picks)+panel('all','All Maps',picks*3)+panel('456','Bind',picks)
        records=refresh.parse_match(page,'https://www.vlr.gg/1/example')
        self.assertEqual(len(records),4)
        self.assertEqual([r['map'] for r in records],['Lotus','Lotus','Bind','Bind'])
        self.assertIn('KAY/O',records[0]['agents'])
        self.assertEqual(records[0]['source'],'https://www.vlr.gg/1/example/?game=123')

    def test_incomplete_maps_are_not_fabricated(self):
        page='<div data-utc-ts="2026-10-12"></div>'+panel('123','Lotus',['Jett']*10)
        self.assertEqual(refresh.parse_match(page,'https://www.vlr.gg/1'),[])
        self.assertEqual(refresh.parse_match('<html></html>','https://www.vlr.gg/1'),[])

    def test_legacy_and_new_links_share_identity(self):
        a={'source':'https://www.vlr.gg/1/match','map':'Lotus','team':'A'}
        b={**a,'source':'https://www.vlr.gg/1/match/?game=123'}
        self.assertEqual(refresh.identity(a),refresh.identity(b))


if __name__=='__main__':
    unittest.main()
