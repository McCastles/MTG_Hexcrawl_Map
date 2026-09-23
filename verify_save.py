import json
import pathlib
import urllib.request

p = pathlib.Path(r'c:\Users\Dell\Documents\MTG_Hexcrawl_Map\hexes.json')
data = json.loads(p.read_text(encoding='utf-8'))
data[0]['mana'] = [True, False, True, False, True]
payload = json.dumps(data, indent=2).encode('utf-8')
req = urllib.request.Request(
    'http://127.0.0.1:8000/hexes.json',
    data=payload,
    method='PUT',
    headers={'Content-Type': 'application/json'}
)
with urllib.request.urlopen(req) as resp:
    print('status', resp.status)
print('updated', json.loads(p.read_text(encoding='utf-8'))[0]['mana'])
