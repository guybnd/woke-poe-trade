// Turns strategy text copied from a guide, video description or forum post
// into a strategy: the atlas tree link, scarab lines, map device notes, a
// map regex and the rest as notes. Also prices scarab lines.
import type { PriceItem } from '../market/types'
import type { AtlasStrategy, ThreadSlot } from './strategies'
import { MAX_THREAD_SLOTS, MAX_THREADS, THREAD_TYPES } from './strategies'
import { trimLinkEnd } from './tree'

const TREE_URL = /https?:\/\/(?:www\.)?(?:pathofexile\.com\/(?:fullscreen-)?atlas-skill-tree\/[^\s)"']+|poeplanner\.com\/[^\s)"']+|poeatlasplanner\.com\/[^\s)"']+)/i
const DEVICE_WORDS = /\b(map device|kirac|atlas memor|memory|sextant|omen|altar|eldritch|maven'?s invitation|delirium orb|map craft|alch|chisel|scour|vaal orb|8.?mod)/i
// "8x Breach Thread", "Breach Threads x6", "6 Ritual Threads"
const THREAD_LINE = new RegExp(String.raw`^(?:(\d+)\s*[x×]?\s+)?(` + THREAD_TYPES.join('|') + String.raw`)\s+Threads?(?:\s*[x×]\s*(\d+))?$`, 'i')
const REGEX_LINE = /^"[^"]*!?[^"]*"(\s+"[^"]*")*$/

export interface ScarabLine { qty: number, name: string }

export function parseGuideText (text: string): Omit<AtlasStrategy, 'id'> {
  const lines = text.split(/\r?\n/).map(l => l.trim())
  const treeUrl = trimLinkEnd(TREE_URL.exec(text)?.[0] ?? '')
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
