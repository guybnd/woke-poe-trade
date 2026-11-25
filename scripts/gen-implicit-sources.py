# Builds renderer/public/data/implicit-sources.json: for each trade stat, the roll
# ranges of eldritch implicits (altar and tier) and of corruption implicits, so a
# trade listing's tooltip can mark them. The trade site sends no such marks per line.
#
# python3 scripts/gen-implicit-sources.py mods.min.json stat_translations.min.json
# (RePoE: https://github.com/brather1ng/RePoE/tree/master/RePoE/data)
import json, re, sys, collections

mods = json.load(open(sys.argv[1]))
translations = json.load(open(sys.argv[2]))
STATS = 'renderer/public/data/en/stats.ndjson'
OUT = 'renderer/public/data/implicit-sources.json'

stats = []
for line in open(STATS):
    d = json.loads(line)
    stats.extend(d['stats'] if 'stats' in d else [d])

by_id = collections.defaultdict(list)
for i, t in enumerate(translations):
    for s in t['ids']:
        by_id[s].append(i)


def norm(s):
    return re.sub(r'\s+', ' ', s.strip())


# Our stat text -> trade stat numbers.
ref_nums = {}
for s in stats:
    if 'ref' not in s:
        continue
    nums = {x.split('.', 1)[1].replace('stat_', '') for v in s.get('trade', {}).get('ids', {}).values() for x in v}
    for m in s.get('matchers', []) + [{'string': s['ref']}]:
        if 'value' not in m:
            for n in nums:
                ref_nums.setdefault(norm(m['string']), set()).add(n)


def fits(c, v):
    return not c or ((c.get('min') is None or v >= c['min']) and (c.get('max') is None or v <= c['max']))


def lines_of(mod):
    """Each translated line of the mod: (trade stat numbers, low, high) of its first roll."""
    vals = {s['id']: s for s in mod['stats']}
    presence = [i for i in vals if 'presence' in i]
    prefix = ''
    if presence:
        prefix = 'While a Unique Enemy is in your Presence, ' if 'unique' in presence[0] else 'While a Pinnacle Atlas Boss is in your Presence, '
    seen = set()
    for sid in vals:
        for ti in by_id.get(sid, []):
            if ti in seen:
                continue
            seen.add(ti)
            t = translations[ti]
            mid = [(vals[i]['min'] + vals[i]['max']) / 2 if i in vals else 0 for i in t['ids']]
            for e in t['English']:
                if all(fits(c, v) for c, v in zip(e['condition'], mid)):
                    text = e['string']
                    for i, f in enumerate(e['format']):
                        text = text.replace('{%d}' % i, '' if f == 'ignore' else f)
                    first = [vals[i] for i in t['ids'] if i in vals][0]
                    low, high = sorted([abs(first['min']), abs(first['max'])])
                    for line in text.split('\n'):
                        nums = ref_nums.get(norm(prefix + line))
                        if nums:
                            yield nums, low, high
                    break


eldritch = collections.defaultdict(lambda: collections.defaultdict(set))
corrupted = collections.defaultdict(set)
for key, mod in mods.items():
    kind = mod.get('generation_type')
    if kind in ('exarch_implicit', 'eater_implicit'):
        rank = int(re.search(r'(\d+)$', key).group(1))
        altar = 0 if kind == 'exarch_implicit' else 1
        for nums, low, high in lines_of(mod):
            for n in nums:
                eldritch[n][(low, high, altar)].add(rank)
    elif kind == 'corrupted' and mod.get('domain') == 'item':
        for nums, low, high in lines_of(mod):
            for n in nums:
                corrupted[n].add((low, high))

# Each tier's roll as the item shows it, per item class: a picked eldritch row's
# range on the price check, and its hover ladder. The rows above stay in the
# stat's raw numbers (the trade site's magnitudes); these are converted.
CLASS_BITS = {'helmet': 1, 'gloves': 2, 'boots': 4, 'body_armour': 8, 'amulet': 16}
SCALE = {'milliseconds_to_seconds': 1000, 'divide_by_one_thousand': 1000, 'per_minute_to_per_second': 60}


def shown_lines(mod):
    """Each translated line of the mod: (trade stat numbers, low, high) as the item shows them."""
    vals = {s['id']: s for s in mod['stats']}
    presence = [i for i in vals if 'presence' in i]
    prefix = ''
    if presence:
        prefix = 'While a Unique Enemy is in your Presence, ' if 'unique' in presence[0] else 'While a Pinnacle Atlas Boss is in your Presence, '
    seen = set()
    for sid in vals:
        for ti in by_id.get(sid, []):
            if ti in seen:
                continue
            seen.add(ti)
            t = translations[ti]
            mid = [(vals[i]['min'] + vals[i]['max']) / 2 if i in vals else 0 for i in t['ids']]
            for e in t['English']:
                if all(fits(c, v) for c, v in zip(e['condition'], mid)):
                    text = e['string']
                    for i, f in enumerate(e['format']):
                        text = text.replace('{%d}' % i, '' if f == 'ignore' else f)
                    idx = next(i for i, x in enumerate(t['ids']) if x in vals)
                    first = vals[t['ids'][idx]]
                    handlers = e.get('index_handlers', [])
                    handlers = handlers[idx] if idx < len(handlers) else []
                    div = 1
                    for h in (handlers if isinstance(handlers, list) else [handlers]):
                        div *= SCALE.get(h, 1)
                    low, high = sorted([round(abs(first['min']) / div, 2), round(abs(first['max']) / div, 2)])
                    low, high = [int(x) if x == int(x) else x for x in (low, high)]
                    for line in text.split('\n'):
                        nums = ref_nums.get(norm(prefix + line))
                        if nums:
                            yield nums, low, high
                    break


shown = collections.defaultdict(lambda: collections.defaultdict(int))
for key, mod in mods.items():
    kind = mod.get('generation_type')
    if kind not in ('exarch_implicit', 'eater_implicit'):
        continue
    # The class tag, weighted or not: presence mods weigh 0 everywhere (they come with the altar's tier).
    bits = sum(CLASS_BITS.get(w['tag'], 0) for w in mod.get('spawn_weights', []))
    if not bits:
        continue
    rank = int(re.search(r'(\d+)$', key).group(1))
    altar = 0 if kind == 'exarch_implicit' else 1
    for nums, low, high in shown_lines(mod):
        for n in nums:
            shown[n][(altar, rank, low, high)] |= bits

out = {
    # stat: [[low, high, altar (0 Exarch, 1 Eater), lowest rank, highest rank]]
    'eldritch': {n: sorted([lo, hi, a, min(r), max(r)] for (lo, hi, a), r in rows.items()) for n, rows in eldritch.items() if n.isdigit()},
    # stat: [[low, high]]
    'corrupted': {n: sorted(list(r) for r in rows) for n, rows in corrupted.items() if n.isdigit()},
    # stat: [[altar (0 Exarch, 1 Eater), rank (1 Lesser … 6 Perfect), low, high, item classes
    # (1 helmet, 2 gloves, 4 boots, 8 body armour, 16 amulet)]], as the item shows the roll
    'shown': {n: sorted([a, r, lo, hi, bits] for (a, r, lo, hi), bits in rows.items()) for n, rows in shown.items() if n.isdigit()}
}
json.dump(out, open(OUT, 'w'), separators=(',', ':'))
print(len(out['eldritch']), 'eldritch stats,', len(out['corrupted']), 'corruption stats,', len(out['shown']), 'shown')
