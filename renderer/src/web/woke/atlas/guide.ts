// Turns strategy text copied from a guide, video description or forum post
// into a strategy: the atlas tree link, scarab lines, map device notes, a
// map regex and the rest as notes. Also prices scarab lines.
import type { PriceItem } from '../market/types'
import type { AtlasStrategy, ThreadSlot } from './strategies'
import { MAX_THREAD_SLOTS, MAX_THREADS, THREAD_TYPES } from './strategies'
import { parseCostLines, priceLines } from './loadout'

const TREE_URL = /https?:\/\/(?:www\.)?(?:pathofexile\.com\/(?:fullscreen-)?atlas-skill-tree\/[^\s)"']+|poeplanner\.com\/[^\s)"']+)/i
const DEVICE_WORDS = /\b(map device|kirac|atlas memor|memory|sextant|omen|altar|eldritch|maven'?s invitation|delirium orb|map craft|alch|chisel|scour|vaal orb|8.?mod)/i
// "8x Breach Thread", "Breach Threads x6", "6 Ritual Threads"
const THREAD_LINE = new RegExp(String.raw`^(?:(\d+)\s*[x×]?\s+)?(` + THREAD_TYPES.join('|') + String.raw`)\s+Threads?(?:\s*[x×]\s*(\d+))?$`, 'i')
const REGEX_LINE = /^"[^"]*!?[^"]*"(\s+"[^"]*")*$/

export interface ScarabLine { qty: number, name: string }

// "4x Ambush Scarab of Potency", "Ambush Scarab of Potency x2", "2 Breach Scarabs"
export function parseScarabs (text: string): ScarabLine[] {
  const out: ScarabLine[] = []
  for (const raw of text.split(/\r?\n|,|;/)) {
    const line = raw.replace(/^[\s\-*•·]+/, '').trim()
    if (!/scarab/i.test(line)) continue
    let qty = 1
    let name = line
    const pre = /^(\d+)\s*[x×]?\s+(.+)$/i.exec(line)
    const post = /^(.+?)\s*[x×]\s*(\d+)$/i.exec(line)
    if (pre) { qty = Number(pre[1]); name = pre[2] } else if (post) { qty = Number(post[2]); name = post[1] }
    name = name.replace(/\bScarabs\b/i, 'Scarab').trim()
    if (name) out.push({ qty: Math.max(1, Math.min(qty, 20)), name })
  }
  return out
}

export function parseGuideText (text: string): Omit<AtlasStrategy, 'id'> {
  const lines = text.split(/\r?\n/).map(l => l.trim())
  const treeUrl = TREE_URL.exec(text)?.[0] ?? ''
  const scarabs: string[] = []
  const threads: ThreadSlot[] = []
  const device: string[] = []
  const notes: string[] = []
  let regex = ''
  let name = ''
  for (const line of lines) {
    if (!line) continue
    const clean = line.replace(/^[\s\-*•·]+/, '')
    if (TREE_URL.test(line) && clean.replace(TREE_URL, '').replace(/[^\w]/g, '').length < 15) continue
    if (!regex && REGEX_LINE.test(clean)) { regex = clean; continue }
    const thread = THREAD_LINE.exec(clean)
    if (thread) {
      const type = THREAD_TYPES.find(t => t.toLowerCase() === thread[2].toLowerCase())!
      if (threads.length < MAX_THREAD_SLOTS && !threads.some(t => t.type === type)) threads.push({ type, count: Math.max(1, Math.min(MAX_THREADS + 2, Number(thread[1] ?? thread[3] ?? 1))) })
      continue
    }
    // "2x Chaos Orb", "1 Vaal Orb": something each map takes.
    if (/scarab/i.test(clean) || /^\d+\s*[x×]?\s+[A-Z][\w' -]{2,40}$/.test(clean)) { scarabs.push(clean); continue }
    if (DEVICE_WORDS.test(clean)) { device.push(clean); continue }
    if (!name && clean.length <= 60 && !/https?:\/\//.test(clean)) { name = clean.replace(/[:#]+$/, ''); continue }
    notes.push(clean)
  }
  return {
    name: name || 'Imported strategy',
    folder: '',
    league: '',
    tags: [],
    treeUrl,
    threads,
    scarabs: scarabs.join('\n'),
    device: device.join('\n'),
    regex,
    notes: notes.join('\n')
  }
}

export interface PricedScarab extends ScarabLine { item: PriceItem | null }

// Matches each line to a poe.ninja scarab: exact name first, then the
// shortest scarab name containing it ("Ambush Scarab" → "Ambush Scarab").
export function priceScarabs (lines: ScarabLine[], items: PriceItem[]): PricedScarab[] {
  const scarabs = items.filter(i => i.type === 'Scarab')
  return lines.map(l => {
    const want = l.name.toLowerCase()
    const exact = scarabs.find(s => s.name.toLowerCase() === want)
    const loose = exact ?? scarabs
      .filter(s => s.name.toLowerCase().includes(want) || want.includes(s.name.toLowerCase()))
      .sort((a, b) => Math.abs(a.name.length - want.length) - Math.abs(b.name.length - want.length))[0]
    return { ...l, item: loose ?? null }
  })
}

// The scarab lines a strategy of this name costs per map, priced now. Takes each
// Atlas widget's list: one that never mounted (its module is off) has none yet.
export function strategyScarabCosts (lists: Array<AtlasStrategy[] | undefined>, name: string, items: PriceItem[] | null | undefined): Array<{ type: string, name: string, variant: string, qty: number }> | null {
  if (!items || !name) return null
  for (const list of lists) {
    const st = (list ?? []).find(x => x.name.trim() === name)
    if (!st?.scarabs) continue
    const lines = priceLines(parseCostLines(st.scarabs), items).filter(p => p.item)
    if (!lines.length) continue
    return lines.map(p => ({ type: p.item!.type, name: p.item!.name, variant: p.item!.variant, qty: p.qty }))
  }
  return null
}
