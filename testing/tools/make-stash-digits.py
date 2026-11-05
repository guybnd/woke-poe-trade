# Makes main/src/woke/stash-digits-data.ts: the stack count digits, cut from real
# screenshots of the Scarab tab, at 1440p. Run after make-stash-slots.py.
#
# Seeds each digit from a few slots read by eye, then averages every instance found,
# so the icons behind the digits wash out.
import json
import os
import re

import cv2
import numpy as np

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
SHOTS = os.path.join(ROOT, 'testing', 'fixtures', 'screens')
SLOTS_TS = os.path.join(ROOT, 'main', 'src', 'woke', 'stash-scarab-data.ts')
OUT_TS = os.path.join(ROOT, 'main', 'src', 'woke', 'stash-digits-data.ts')

CROP_W, CROP_H = 40, 24
TOP, HEIGHT = 4, 16
STROKE = 150
SEED_MASK = 170
FILLED_BLUENESS = 0.3  # as in stash-read.ts
# Order of the filled slots in the first shot, read by eye, on plain backgrounds.
SEEDS = {0: '205', 3: '164', 4: '212', 5: '113', 7: '210', 9: '72', 10: '98', 13: '182', 15: '33', 19: '59',
         20: '107', 22: '249', 31: '160', 32: '61', 37: '108', 39: '51', 41: '188', 42: '65'}


def load_layouts():
    src = open(SLOTS_TS, encoding='utf8').read()
    m = re.search(r'export const ANCHOR = \{ width: (\d+), height: (\d+), gray: \[([^\]]*)\]', src)
    anchor = np.array(json.loads('[' + m.group(3) + ']'), np.float32).reshape(int(m.group(2)), int(m.group(1)))
    layouts = []
    for part in src.split('    slots: [')[1:]:
        body = part.split(']')[0]
        layouts.append([(int(a), int(b)) for a, b in re.findall(r"dx: (-?\d+), dy: (-?\d+)", body)])
    return anchor, layouts


def find_anchor(gray, anchor):
    res = cv2.matchTemplate(gray, anchor, cv2.TM_CCOEFF_NORMED)
    h, w = anchor.shape
    mean = cv2.blur(gray, (w, h), anchor=(0, 0), borderType=cv2.BORDER_CONSTANT)
    sq = cv2.blur(gray * gray, (w, h), anchor=(0, 0), borderType=cv2.BORDER_CONSTANT)
    var = (sq - mean * mean)[:res.shape[0], :res.shape[1]]
    res[(var < 4) | ~np.isfinite(res)] = -1
    res[int(gray.shape[0] * 0.6):] = -1
    res[:, int(gray.shape[1] * 0.5):] = -1
    return cv2.minMaxLoc(res)[3]


def filled(im, x, y):
    corners = [im[y + 41:y + 47, x + 1:x + 7], im[y + 41:y + 47, x + 41:x + 47], im[y + 1:y + 7, x + 41:x + 47]]
    vals = sorted((float(c[:, :, 0].mean()) - float(c[:, :, 2].mean())) / max(float(c.mean()), 1e-6) for c in corners)
    return vals[1] >= FILLED_BLUENESS


def crops():
    anchor, layouts = load_layouts()
    out = []
    for name, n in (('stash-scarab-real', 0), ('stash-scarab-breach-real', 1)):
        im = cv2.imdecode(np.fromfile(os.path.join(SHOTS, name + '.png'), np.uint8), cv2.IMREAD_COLOR)
        at = find_anchor(im.mean(axis=2).astype(np.float32), anchor)
        for dx, dy in layouts[n]:
            x, y = at[0] + dx, at[1] + dy
            if filled(im, x, y):
                out.append(im[y:y + CROP_H, x:x + CROP_W].min(axis=2).astype(np.float32))
    return out


def seed_templates(tiles):
    found = {}
    for i, label in SEEDS.items():
        cols = (tiles[i][TOP:TOP + HEIGHT] > SEED_MASK).sum(axis=0) > 0
        segs, start = [], None
        for x, on in enumerate(cols):
            if on and start is None:
                start = x
            if not on and start is not None:
                if x - start >= 2:
                    segs.append((start, x))
                start = None
        segs = segs[:len(label)]
        if len(segs) != len(label):
            continue
        for ch, (a, b) in zip(label, segs):
            found.setdefault(ch, []).append(tiles[i][TOP:TOP + HEIGHT, a:b])
    out = {}
    for ch, group in found.items():
        widths = [g.shape[1] for g in group]
        w = max(set(widths), key=widths.count)
        out[ch] = np.mean([g for g in group if g.shape[1] == w], axis=0)
    return out


def care_of(t):
    return cv2.dilate((t > STROKE).astype(np.uint8), np.ones((3, 3), np.uint8)) > 0


def score(crop, t, care):
    a = crop[care]
    b = t[care]
    a = a - a.mean()
    b = b - b.mean()
    d = np.sqrt((a * a).sum() * (b * b).sum())
    return float((a * b).sum() / d) if d > 0 else -1


def read(g, templates, keep):
    x, count, fixed = 0, 0, None
    while x < 36 and count < 4:
        best = (-1, None, 0, 0)
        for ch, t in templates.items():
            care = care_of(t)
            h, w = t.shape
            for dx in range(7):
                if x + dx + w > CROP_W:
                    continue
                for dy in ([fixed] if fixed is not None else [-2, -1, 0, 1, 2]):
                    s = score(g[TOP + dy:TOP + dy + h, x + dx:x + dx + w], t, care)
                    if s > best[0]:
                        best = (s, ch, x + dx, dy)
        if best[0] < 0.8:
            return
        s, ch, at, fixed = best
        w = templates[ch].shape[1]
        keep.setdefault(ch, []).append(g[TOP + fixed:TOP + fixed + HEIGHT, at:at + w])
        x = at + w
        count += 1


def main():
    tiles = crops()
    templates = seed_templates(tiles)
    assert sorted(templates) == list('0123456789'), sorted(templates)
    keep = {}
    for g in tiles:
        read(g, templates, keep)
    final = {ch: np.median(np.array(v), axis=0) for ch, v in keep.items()}
    lines = [
        '// Generated by testing/tools/make-stash-digits.py from 2560x1440 screenshots of the Scarab tab.',
        '// The darkest channel of each stack count digit, at 1440p.',
        '',
        f'export const DIGIT_TOP = {TOP}',
        f'export const DIGIT_HEIGHT = {HEIGHT}',
        f'export const DIGIT_STROKE = {STROKE}',
        '',
        'export const DIGITS: Array<{ digit: number, width: number, gray: number[] }> = ['
    ]
    for ch in sorted(final):
        t = final[ch]
        gray = ','.join(str(int(round(v))) for v in t.flatten())
        lines.append(f'  {{ digit: {ch}, width: {t.shape[1]}, gray: [{gray}] }},')
    lines[-1] = lines[-1].rstrip(',')
    lines.append(']')
    with open(OUT_TS, 'w', encoding='utf8', newline='\n') as f:
        f.write('\n'.join(lines) + '\n')
    print('digits', {c: len(v) for c, v in sorted(keep.items())})


main()
