// Your changes as a code to paste to a friend (or yourself on another PC):
// edits, own rules, presets and locked price tiers, compressed. Folders,
// hotkeys and the NeverSink download setting stay out of it.
import { isPatch, isValidEdit } from './edits'
import type { FilterEdit } from './edits'
import type { OwnRule } from './rules'
import { conditionKind } from './rules'
import type { Presets } from './presets'
import { normalizePresets } from './presets'

export interface SharedChanges {
  edits: FilterEdit[]
  rules: OwnRule[]
  presets: Presets
  locks: string[]
}

const PREFIX_DEFLATE = 'WOKEF1.'
const PREFIX_PLAIN = 'WOKEF0.'
const MAX_CODE = 2_000_000

function toB64 (bytes: Uint8Array): string {
  let s = ''
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromB64 (text: string): Uint8Array {
  const s = atob(text.replace(/-/g, '+').replace(/_/g, '/'))
  const out = new Uint8Array(s.length)
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i)
  return out
}

async function pipe (bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const res = new Response(new Blob([bytes]).stream().pipeThrough(stream))
  return new Uint8Array(await res.arrayBuffer())
}

export async function encodeChanges (c: SharedChanges): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify({ v: 1, ...c }))
  if (typeof CompressionStream === 'function') {
    return PREFIX_DEFLATE + toB64(await pipe(json, new CompressionStream('deflate-raw')))
  }
  return PREFIX_PLAIN + toB64(json)
}

// Throws with a message a player can act on.
export async function decodeChanges (code: string): Promise<SharedChanges> {
  const text = code.trim().replace(/\s+/g, '')
  if (text.length > MAX_CODE) throw new Error('That code is too long')
  let bytes: Uint8Array
  try {
    if (text.startsWith(PREFIX_DEFLATE)) bytes = await pipe(fromB64(text.slice(PREFIX_DEFLATE.length)), new DecompressionStream('deflate-raw'))
    else if (text.startsWith(PREFIX_PLAIN)) bytes = fromB64(text.slice(PREFIX_PLAIN.length))
    else throw new Error('x')
  } catch {
    throw new Error('That isn\'t a loot filter changes code (it starts with WOKEF1.)')
  }
  let raw: Record<string, unknown>
  try {
    raw = JSON.parse(new TextDecoder().decode(bytes))
  } catch {
    throw new Error('That code is damaged; copy it again')
  }
  if (raw?.v !== 1) throw new Error('That code is from a newer version of the toolkit')
  const edits = Array.isArray(raw.edits) ? raw.edits.filter(isEdit) : []
  const rules = Array.isArray(raw.rules) ? raw.rules.filter(isRule) : []
  const locks = Array.isArray(raw.locks) ? raw.locks.filter((x): x is string => typeof x === 'string') : []
  return { edits, rules, presets: normalizePresets(raw.presets as Partial<Presets>), locks }
}

// Every string goes into the filter file: no quotes or line breaks, which
// could end a value early and add lines of their own.
function safeStrings (v: unknown, depth = 0): boolean {
  if (depth > 6) return false
  if (typeof v === 'string') return !/["\r\n]/.test(v) && v.length < 200
  if (Array.isArray(v)) return v.every(x => safeStrings(x, depth + 1))
  if (v && typeof v === 'object') return Object.entries(v).every(([k, x]) => safeStrings(k, depth + 1) && safeStrings(x, depth + 1))
  return v == null || typeof v === 'number' || typeof v === 'boolean'
}

function isEdit (e: unknown): e is FilterEdit {
  return isValidEdit(e) && safeStrings(e)
}

function isRule (r: unknown): r is OwnRule {
  const x = r as Partial<OwnRule> | null
  return Boolean(x && typeof x === 'object' && typeof x.id === 'number' && typeof x.name === 'string' &&
    Array.isArray(x.conditions) && x.conditions.every(c => c && conditionKind(c.key) && Array.isArray(c.values) && c.values.every(v => typeof v === 'string')) &&
    ['Show', 'Hide', 'Minimal'].includes(x.visibility as string) && isPatch(x.patch) && safeStrings(x))
}

export function describeShared (c: SharedChanges): string {
  const parts: string[] = []
  if (c.edits.length) parts.push(`${c.edits.length} change${c.edits.length === 1 ? '' : 's'}`)
  if (c.rules.length) parts.push(`${c.rules.length} own rule${c.rules.length === 1 ? '' : 's'}`)
  const presets = Object.entries(c.presets).filter(([k, p]) => k !== 'look' && p.on).length
  if (presets) parts.push(`${presets} preset${presets === 1 ? '' : 's'}`)
  if (c.locks.length) parts.push(`${c.locks.length} locked price tier${c.locks.length === 1 ? '' : 's'}`)
  return parts.join(', ') || 'nothing'
}
