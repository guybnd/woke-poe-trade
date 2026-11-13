// Strategy codes: one strategy or a folder as text to share or back up,
// with its regexes. Loaded when Import or Export is used.
import { str, strList } from '../shared/library'
import { CODE_PREFIX, cleanFolder, threadList } from './strategies'
import type { AtlasStrategy } from './strategies'

// ---- strategy codes: what Export copies and Import reads ----

export interface SharedRegex { name: string, text: string }
export interface SharedStrategy extends Omit<AtlasStrategy, 'id'> { regexes: SharedRegex[] }

function toBase64 (text: string): string {
  let bin = ''
  for (const b of new TextEncoder().encode(text)) bin += String.fromCharCode(b)
  return btoa(bin)
}

function fromBase64 (b64: string): string {
  const bin = atob(b64.replace(/\s+/g, ''))
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new TextDecoder().decode(bytes)
}

// One strategy or a whole folder; folders inside it are kept relative to `base`.
export function strategyCode (list: Array<AtlasStrategy & { regexes?: SharedRegex[] }>, base = ''): string {
  const strip = (folder: string) => {
    const f = cleanFolder(folder)
    if (!base) return ''
    return f === base ? '' : f.startsWith(base + '/') ? f.slice(base.length + 1) : ''
  }
  const rows = list.map(s => ({ ...Object.fromEntries(Object.entries(s).filter(([k]) => k !== 'id' && k !== 'regexFolder' && k !== 'changedAt')), folder: strip(s.folder) }))
  return CODE_PREFIX + toBase64(JSON.stringify({ v: 1, strategies: rows }))
}

export function readStrategyCode (text: string): SharedStrategy[] {
  let data: unknown
  try {
    data = JSON.parse(fromBase64(text.trim().slice(CODE_PREFIX.length)))
  } catch {
    throw new Error("That strategy code can't be read. Copy it again.")
  }
  const rows = (data && typeof data === 'object' && Array.isArray((data as { strategies?: unknown }).strategies))
    ? (data as { strategies: unknown[] }).strategies
    : []
  const out: SharedStrategy[] = []
  for (const r of rows) {
    if (!r || typeof r !== 'object') continue
    const o = r as Record<string, unknown>
    out.push({
      name: str(o.name) || 'Imported strategy',
      folder: cleanFolder(str(o.folder)),
      league: str(o.league),
      tags: strList(o.tags),
      treeUrl: str(o.treeUrl),
      threads: threadList(o.threads),
      scarabs: str(o.scarabs),
      device: str(o.device),
      regex: str(o.regex),
      notes: str(o.notes),
      regexes: Array.isArray(o.regexes)
        ? o.regexes.filter((x): x is Record<string, unknown> => Boolean(x) && typeof x === 'object')
            .map(x => ({ name: str(x.name), text: str(x.text) })).filter(x => x.text)
        : []
    })
  }
  if (!out.length) throw new Error('That strategy code has no strategies in it.')
  return out
}
