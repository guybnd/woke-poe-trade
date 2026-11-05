# Rebuilds main/src/woke/stash-scarab-data.ts from screenshots of the Scarab
# sub-tab: the row symbols that find the tab, the SCARAB text that tells layouts
# apart, and each slot's item.
#
#   python testing/tools/make-stash-slots.py testing/fixtures/screens/stash-scarab-real.png testing/fixtures/screens/stash-scarab-breach-real.png
#
# Needs opencv-python and numpy, and one 2560x1440 screenshot per entry in LAYOUTS,
# in that order, with the panel at its usual top-left spot and the mouse off the tab.
# The tab differs between stashes (one has a Breach button, and its slots hold other
# scarabs), so each layout has its own table. Item icons download from poecdn into a
# folder under the system temp folder.
#
# Row symbols are fixed, so a row holds one family everywhere: the first screenshot
# works out which, and the others reuse it. Filled slots choose names first, and
# empty ghosts only take what's left. Names come from icon matching, so check new or
# moved slots by eye.
import base64, json, os, sys, tempfile, urllib.request
import cv2
import numpy as np

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))
ANCHOR = (42, 306, 34, 182)   # x, y, width, height of the left row symbols, rows 1-3
CONFIRM = (344, 306, 36, 182)  # the middle row symbols, rows 1-3
# Where the SCARAB button's text sits, which tells the layouts apart.
LAYOUTS = [(316, 243, 86, 22), (233, 243, 86, 22)]
ROWS = [298 + 63 * k for k in range(12)]
GROUPS = [[77, 131, 184, 238, 292], [400, 454, 508, 562, 616, 670]]
MIN_SCORE = 0.3
FILLED_BLUENESS = 0.3  # as in stash-read.ts
KEEP_NAME_SCORE = 0.35

def fetch(path, url):
    if not os.path.exists(path):
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        data = urllib.request.urlopen(req, timeout=20).read()
        with open(path, 'wb') as f:
            f.write(data)

def family(name):
    word = name.split(' ')[0]
    return 'Misc' if word == 'Scarab' else word

def main(shots):
    if len(shots) != len(LAYOUTS):
        sys.exit(f'Need {len(LAYOUTS)} screenshots, one per layout, got {len(shots)}')
    images = [cv2.imdecode(np.fromfile(shot, np.uint8), cv2.IMREAD_COLOR) for shot in shots]
    templates = {}
    with open(os.path.join(ROOT, 'renderer/public/data/en/items.ndjson'), encoding='utf8') as f:
        items = [json.loads(line) for line in f]
    cache = os.path.join(tempfile.gettempdir(), 'woke-scarab-icons')
    os.makedirs(cache, exist_ok=True)
    for item in items:
        name, url = item.get('refName'), item.get('icon')
        if not name or not url or 'Scarab' not in name:
            continue
        path = os.path.join(cache, base64.urlsafe_b64encode(name.encode()).decode() + '.png')
        fetch(path, url)
        icon = cv2.imread(path, cv2.IMREAD_UNCHANGED)
        if icon is None or icon.ndim != 3 or icon.shape[2] != 4:
            continue
        icon = cv2.resize(icon, (48, 48), interpolation=cv2.INTER_AREA)
        templates[name] = (icon[:, :, :3], cv2.merge([icon[:, :, 3]] * 3))
    slots = [(x, y, g) for y in ROWS for g, xs in enumerate(GROUPS) for x in xs]
    slots += [(x, 298, 2) for x in (676, 730, 784)]
    slots += [(721, 455 + 54 * k, 3) for k in range(8)]
    slots += [(784, 482 + 54 * k, 4) for k in range(7)]

    tables = []
    row_family = None
    for im in images:
        def filled(s):
            x, y = s[0], s[1]
            corners = [im[y + 41:y + 47, x + 1:x + 7], im[y + 41:y + 47, x + 41:x + 47], im[y + 1:y + 7, x + 41:x + 47]]
            vals = sorted((float(c[:, :, 0].mean()) - float(c[:, :, 2].mean())) / max(float(c.mean()), 1e-6) for c in corners)
            return vals[1] >= FILLED_BLUENESS

        def score(name, x, y):
            a, m = templates[name]
            r = cv2.matchTemplate(im[y - 4:y + 52, x - 4:x + 52], a, cv2.TM_CCOEFF_NORMED, mask=m)
            r[~np.isfinite(r)] = -1
            return float(r.max())

        table = {s: sorted(((score(n, s[0], s[1]), n) for n in templates), reverse=True) for s in slots}
        rows = {}
        for s in slots:
            rows.setdefault((s[1], s[2]) if s[2] < 2 else ('col', s[2]), []).append(s)
        if row_family is None:
            families = sorted({family(n) for n in templates} - {'Misc', 'Horned'})
            candidates = []
            for key, members in rows.items():
                if key[0] == 'col':
                    continue
                for fam in families:
                    best = sorted((max((sc for sc, n in table[s] if family(n) == fam), default=-1) for s in members), reverse=True)[:3]
                    candidates.append((sum(best) / len(best), key, fam))
            candidates.sort(reverse=True)
            row_family, used = {}, set()
            for _, key, fam in candidates:
                if key not in row_family and fam not in used:
                    row_family[key] = fam
                    used.add(fam)
        named, taken = {}, set()
        # Most slots match between layouts: keep the first table's name where the icon agrees.
        if tables:
            for s, n in tables[0].items():
                if filled(s) and next(sc for sc, name in table[s] if name == n) >= KEEP_NAME_SCORE:
                    named[s] = n
                    taken.add(n)
        for key, members in rows.items():
            allow = ({'Misc', 'Horned'} if members[0][2] in (3, 4) else {'Titanic'}) if key[0] == 'col' else {row_family.get(key)}
            # Filled slots first: their icons are bright, and a ghost shouldn't use up a name.
            # Later layouts leave ghosts alone: they can only take the first table's name below.
            groups = [[s for s in members if filled(s)]]
            if not tables:
                groups.append([s for s in members if not filled(s)])
            for group in groups:
                pool = sorted(((sc, n, s) for s in group for sc, n in table[s] if family(n) in allow and sc >= MIN_SCORE), reverse=True)
                for _, n, s in pool:
                    if s not in named and n not in taken:
                        named[s] = n
                        taken.add(n)
        if tables:
            for s, n in tables[0].items():
                if s not in named and n not in taken:
                    named[s] = n
                    taken.add(n)
        missing = [(s[0], s[1]) for s in slots if s not in named and filled(s)]
        if missing:
            print('Filled but unnamed, so no outline:', missing)
        tables.append(named)

    gray = images[0].astype(np.float32).mean(axis=2)
    ax, ay, aw, ah = ANCHOR
    cx, cy, cw, ch = CONFIRM
    flat = lambda a: ','.join(str(int(v)) for v in a.flatten())
    out = ['// Generated by testing/tools/make-stash-slots.py from 2560x1440 screenshots of the Scarab sub-tab.',
           "// Pixels are at 1440p and scale with the game window's height. Offsets are from the top left of the",
           '// row symbols at the left of the tab, which stay put when the sub-tab buttons change.',
           '',
           'export const REF_HEIGHT = 1440',
           f'export const ANCHOR = {{ width: {aw}, height: {ah}, gray: [{flat(gray[ay:ay + ah, ax:ax + aw])}] }}',
           f'export const CONFIRM = {{ dx: {cx - ax}, dy: {cy - ay}, width: {cw}, height: {ch}, gray: [{flat(gray[cy:cy + ch, cx:cx + cw])}] }}',
           '',
           'export const SLOT_SIZE = 48',
           '',
           'export interface ScarabLayout {',
           '  label: { dx: number, dy: number, width: number, height: number, gray: number[] }',
           '  slots: Array<{ name: string, dx: number, dy: number }>',
           '}',
           '',
           'export const SCARAB_LAYOUTS: ScarabLayout[] = [']
    for im, rect, named in zip(images, LAYOUTS, tables):
        lx, ly, lw, lh = rect
        lg = im.astype(np.float32).mean(axis=2)[ly:ly + lh, lx:lx + lw]
        out.append('  {')
        out.append(f'    label: {{ dx: {lx - ax}, dy: {ly - ay}, width: {lw}, height: {lh}, gray: [{flat(lg)}] }},')
        out.append('    slots: [')
        for s, n in sorted(named.items(), key=lambda kv: (kv[0][1], kv[0][0])):
            q = f'"{n}"' if "'" in n else f"'{n}'"
            out.append(f'      {{ name: {q}, dx: {s[0] - ax}, dy: {s[1] - ay} }},')
        out[-1] = out[-1].rstrip(',')
        out.append('    ]')
        out.append('  },')
        print(f'{len(named)} slots named for layout at x={lx}')
    out[-1] = '  }'
    out.append(']')
    with open(os.path.join(ROOT, 'main/src/woke/stash-scarab-data.ts'), 'w', encoding='utf8', newline='\n') as f:
        f.write('\n'.join(out) + '\n')

if __name__ == '__main__':
    main(sys.argv[1:])
