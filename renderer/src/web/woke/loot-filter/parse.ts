// Parses a PoE1 loot filter (NeverSink's, or any other) into rule blocks.
//
// NeverSink tags every block header with FilterBlade's comment tags:
//   Show # %H7 $type->currency $tier->t3annul
// `$type` names the rule group and `$tier` the tier inside it, which is what
// the editor groups by. Filters without those tags still parse; their blocks
// just land in an "untagged" group.
//
// The file is kept as an ordered list of chunks (blocks and the raw text
// between them), so writing it back reproduces every untouched line exactly.

import { groupLabel, tierLabel } from './names'

export type Visibility = 'Show' | 'Hide' | 'Minimal'

export interface FilterCondition {
  key: string
  // '' when the line has no operator (equality for numbers, substring match
  // for strings), otherwise one of == != ! < <= > >= =.
  op: string
  // Count prefix on mod conditions: `HasExplicitMod >=2 "A" "B"`.
  count: number | null
  values: string[]
  // Read from the file without quotes. A keyword newer than this editor may
  // not take them, so a rewrite keeps the line as it was.
  bare?: boolean
}

export interface FilterAction {
  key: string
  args: string[]
}

export interface FilterBlock {
  kind: 'block'
  // Position in the file's block list; stable for one parse.
  index: number
  // 1-based line of the header in the source text.
  line: number
  visibility: Visibility
  // `#Show` blocks are commented out and never match.
  disabled: boolean
  // Everything after `#` on the header line.
  comment: string
  type: string | null
  tier: string | null
  conditions: FilterCondition[]
  actions: FilterAction[]
  continue: boolean
  // Closest `[[0000]]` / `[0000]` section titles above the block.
  section: string
  subsection: string
  // Original text of the block, reused verbatim unless `dirty` is set.
  raw: string[]
  dirty: boolean
  // Added by the editor (own rule for one item), not in the source file.
  added?: boolean
  // Its conditions were copied from a block in the source file, so a keyword
  // the save check doesn't know is the game's business, not a mistake.
  inherited?: boolean
  // The edit that added this block.
  editId?: number
}

export interface FilterRaw {
  kind: 'raw'
  lines: string[]
}

export type FilterChunk = FilterBlock | FilterRaw

export interface FilterDoc {
  chunks: FilterChunk[]
  blocks: FilterBlock[]
  version: string | null
  // e.g. "1-REGULAR"; null for filters without the NeverSink header.
  strictness: string | null
  isNeverSink: boolean
  eol: '\r\n' | '\n'
  // The file started with a byte order mark.
  bom?: boolean
  // A Ruthless filter, the only kind where `Minimal` is allowed.
  ruthless: boolean
}

const HEADER_RE = /^(#?)\s*(Show|Hide|Minimal)\b\s*(?:#(.*))?$/
const SECTION_RE = /^#\s*\[\[(\d+)\]\]\s*(.*)$/
const SUBSECTION_RE = /^#\s*\[(\d+)\]\s*(.*)$/
const OP_RE = /^(==|!=|<=|>=|!|<|>|=)/

export const ACTION_KEYS = new Set([
  'SetFontSize', 'SetTextColor', 'SetBorderColor', 'SetBackgroundColor',
  'PlayAlertSound', 'PlayAlertSoundPositional', 'CustomAlertSound', 'CustomAlertSoundOptional',
  'DisableDropSound', 'EnableDropSound', 'DisableDropSoundIfAlertSound', 'EnableDropSoundIfAlertSound',
  'PlayEffect', 'MinimapIcon'
])

// Splits on whitespace, keeping "quoted strings" together (without quotes).
export function tokenize (text: string): string[] {
  const out: string[] = []
  const re = /"([^"]*)"|(\S+)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    out.push(m[1] ?? m[2])
  }
  return out
}

function stripLineComment (line: string): string {
  // A `#` outside quotes starts a comment.
  let inQuote = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') inQuote = !inQuote
    else if (ch === '#' && !inQuote) return line.slice(0, i)
  }
  return line
}

export function parseRuleLine (line: string): { key: string, rest: string } | null {
  const body = stripLineComment(line).trim()
  if (!body) return null
  const m = /^([A-Za-z]+)\s*(.*)$/.exec(body)
  if (!m) return null
  return { key: m[1], rest: m[2] }
}

export function parseCondition (key: string, rest: string): FilterCondition {
  let op = ''
  let text = rest
  const opMatch = OP_RE.exec(text)
  if (opMatch) {
    op = opMatch[1]
    text = text.slice(op.length)
  }
  text = text.trimStart()
  let count: number | null = null
  // `HasExplicitMod >=2 "A"`: the number right after the operator is a count.
  const countMatch = /^(\d+)\s+(?=")/.exec(text)
  if (countMatch) {
    count = Number(countMatch[1])
    text = text.slice(countMatch[0].length)
  }
  return { key, op, count, values: tokenize(text.trim()), bare: text.trim() ? !text.includes('"') : undefined }
}

function parseTags (comment: string): { type: string | null, tier: string | null } {
  const type = /\$type->(\S+)/.exec(comment)?.[1] ?? null
  const tier = /\$tier->(\S+)/.exec(comment)?.[1] ?? null
  return { type, tier }
}

function isBlockLine (line: string, disabled: boolean): boolean {
  // `Import` is a statement of its own and ends the block, as a header does.
  if (/^\s*Import\b/.test(line)) return false
  if (HEADER_RE.test(line) && !line.trimStart().startsWith('#')) return false
  // Rule lines are indented; commented-out blocks keep the indent after `#`.
  if (/^\s+\S/.test(line)) return true
  // Hand-written filters often don't indent; any non-header keyword line
  // still belongs to the block above it.
  if (!disabled && /^[A-Z][A-Za-z]+\b/.test(line) && !HEADER_RE.test(line)) return true
  return disabled && /^#(\t|\s{2,})[A-Z][A-Za-z]+\b/.test(line)
}

// The game keeps reading a block past blank lines and comments, until the next
// header: where does the gap at `from` end, and is a rule of this block next?
// A section title or a commented-out block in the gap starts something new, so
// what follows it is left alone.
function scanGap (lines: string[], from: number): { end: number, rule: boolean } {
  let i = from
  while (i < lines.length && (!lines[i].trim() || lines[i].trimStart().startsWith('#'))) {
    if (HEADER_RE.test(lines[i]) || SECTION_RE.test(lines[i]) || SUBSECTION_RE.test(lines[i])) return { end: i, rule: false }
    i++
  }
  return { end: i, rule: i > from && i < lines.length && isBlockLine(lines[i], false) }
}

// A key for a rule with no $type/$tier tags, so a filter from anywhere can be
// edited rule by rule. Made from its conditions, so it survives lines moving.
export function untaggedTier (conditions: FilterCondition[]): string {
  const text = JSON.stringify(conditions.map(c => [c.key, c.op, c.count, c.values]))
  let h = 5381
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0
  return `#${(h >>> 0).toString(36)}`
}

export const UNTAGGED_PREFIX = 'untagged:'

// Rule groups the editor adds to a filter, by display name.
export const EDITOR_GROUPS: Record<string, string> = {
  'woke->own': 'Your own rules',
  'woke->build': 'Your build',
  'woke->safety': 'Safety net',
  'woke->rule': 'Rules you made',
  'woke->preset': 'Presets'
}

// A group and tier the way a person reads them; a rule with no tags has no
// tier name worth showing.
export function ruleLabel (type: string | null, tier: string | null): string {
  if (!type) return 'no rule'
  const group = EDITOR_GROUPS[type] ?? (type.startsWith(UNTAGGED_PREFIX)
    ? (type.slice(UNTAGGED_PREFIX.length) || 'Rule')
    : groupLabel(type))
  return tier && !tier.startsWith('#') && type !== 'woke->own' ? `${group} › ${tierLabel(tier)}` : group
}

// A tier's name for a person: an own rule goes by its item, an untagged rule
// has no name.
export function tierName (b: Pick<FilterBlock, 'tier' | 'editId' | 'conditions'>): string {
  if (b.editId != null) return b.conditions.find(c => c.key === 'BaseType')?.values[0] ?? 'own rule'
  return !b.tier || b.tier.startsWith('#') ? 'Rule' : tierLabel(b.tier)
}

export function parseFilter (source: string): FilterDoc {
  const bom = source.charCodeAt(0) === 0xFEFF
  const text = bom ? source.slice(1) : source
  const eol: '\r\n' | '\n' = text.includes('\r\n') ? '\r\n' : '\n'
  const lines = text.split(/\r?\n/)
  const chunks: FilterChunk[] = []
  const blocks: FilterBlock[] = []
  let raw: string[] = []
  let section = ''
  let subsection = ''
  // The last gap scanned, so a long run of comments is only walked once.
  let gap = { from: -1, end: -1, rule: false }
  const ruleAfterGap = (at: number): boolean => {
    if (at < gap.from || at >= gap.end) gap = { from: at, ...scanGap(lines, at) }
    return gap.rule
  }

  const flushRaw = () => {
    if (raw.length) chunks.push({ kind: 'raw', lines: raw })
    raw = []
  }

  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    const sec = SECTION_RE.exec(line)
    if (sec && !/^\s*$/.test(sec[2])) {
      section = `${sec[2].trim()}`
      subsection = ''
    } else {
      const sub = SUBSECTION_RE.exec(line)
      if (sub && sub[2].trim()) subsection = sub[2].trim()
    }

    const header = HEADER_RE.exec(line)
    // A commented header only counts when the next line is a commented rule.
    const isHeader = header && (!header[1] || (i + 1 < lines.length && isBlockLine(lines[i + 1], true)))
    if (!header || !isHeader) {
      raw.push(line)
      i++
      continue
    }

    flushRaw()
    const disabled = header[1] === '#'
    const comment = (header[3] ?? '').trim()
    const { type, tier } = parseTags(comment)
    const block: FilterBlock = {
      kind: 'block',
      index: blocks.length,
      line: i + 1,
      visibility: header[2] as Visibility,
      disabled,
      comment,
      type,
      tier,
      conditions: [],
      actions: [],
      continue: false,
      section,
      subsection,
      raw: [line],
      dirty: false
    }
    i++
    const inBlock = (at: number) => at < lines.length && (isBlockLine(lines[at], disabled) || (!disabled && ruleAfterGap(at)))
    while (inBlock(i)) {
      const ruleLine = disabled ? lines[i].replace(/^#/, '') : lines[i]
      block.raw.push(lines[i])
      i++
      const parsed = parseRuleLine(ruleLine)
      if (!parsed) continue
      if (parsed.key === 'Continue') {
        block.continue = true
      } else if (ACTION_KEYS.has(parsed.key)) {
        block.actions.push({ key: parsed.key, args: tokenize(parsed.rest) })
      } else {
        block.conditions.push(parseCondition(parsed.key, parsed.rest))
      }
    }
    block.type ??= `${UNTAGGED_PREFIX}${section}`
    block.tier ??= untaggedTier(block.conditions)
    chunks.push(block)
    blocks.push(block)
  }
  flushRaw()

  const head = lines.slice(0, 20).join('\n')
  const version = /^#\s*VERSION:\s*(\S+)/m.exec(head)?.[1] ?? null
  const strictness = /^#\s*TYPE:\s*(\S+)/m.exec(head)?.[1] ?? null
  return {
    chunks,
    blocks,
    version,
    strictness,
    isNeverSink: /NeverSink/i.test(head),
    eol,
    bom,
    // By its header, or by already using Minimal: the game would refuse it in
    // any other filter, so a file that has it must be Ruthless, whatever its header.
    ruthless: /^#\s*filterType:\s*Ruthless/im.test(head) || /^#\s*(TYPE|STYLE):.*RUTHLESS/im.test(head) ||
      blocks.some(b => !b.disabled && b.visibility === 'Minimal')
  }
}

function quote (value: string): string {
  return `"${value}"`
}

// Values that are written bare (numbers, colours, booleans, rarities).
const BARE_KEYS = new Set([
  'ItemLevel', 'DropLevel', 'Quality', 'AreaLevel', 'MapTier', 'GemLevel', 'StackSize',
  'Height', 'Width', 'LinkedSockets', 'Sockets', 'SocketGroup', 'CorruptedMods',
  'EnchantmentPassiveNum', 'MemoryStrands', 'Rarity', 'HasInfluence', 'BaseArmour',
  'BaseEnergyShield', 'BaseEvasion', 'BaseWard', 'BaseDefencePercentile',
  'HasSearingExarchImplicit', 'HasEaterOfWorldsImplicit', 'ZanaMemory', 'UnidentifiedItemTier', 'WaystoneTier'
])

export function formatCondition (c: FilterCondition): string {
  const looksBare = c.bare != null
    ? c.bare && !c.values.some(v => /\s/.test(v))
    : BARE_KEYS.has(c.key) || c.values.every(v => /^(True|False|-?\d+)$/.test(v))
  const values = looksBare
    ? c.values.join(' ')
    : c.values.map(quote).join(' ')
  const op = c.op ? `${c.op}${c.count != null ? c.count : ''} ` : (c.count != null ? `${c.count} ` : '')
  return `${c.key} ${op}${values}`.trimEnd()
}

export function formatAction (a: FilterAction): string {
  if (a.key === 'CustomAlertSound' || a.key === 'CustomAlertSoundOptional') {
    const [file, ...rest] = a.args
    return [a.key, quote(file), ...rest].join(' ')
  }
  return [a.key, ...a.args].join(' ')
}

export function formatBlock (b: FilterBlock): string[] {
  if (!b.dirty) return b.raw
  const prefix = b.disabled ? '#' : ''
  const out = [`${prefix}${b.visibility}${b.comment ? ` # ${b.comment}` : ''}`]
  for (const c of b.conditions) out.push(`${prefix}\t${formatCondition(c)}`)
  for (const a of b.actions) out.push(`${prefix}\t${formatAction(a)}`)
  if (b.continue) out.push(`${prefix}\tContinue`)
  // Comments inside the block stay: someone may have commented out a rule.
  if (!b.raw[0]?.trimStart().startsWith('#')) out.push(...b.raw.slice(1).filter(l => l.trimStart().startsWith('#')))
  return out
}

export function serializeFilter (doc: FilterDoc, header?: string[]): string {
  const out: string[] = []
  for (const chunk of doc.chunks) {
    if (chunk.kind === 'raw') out.push(...chunk.lines)
    else {
      out.push(...formatBlock(chunk))
      // Added blocks have no blank line of their own in the source.
      if (chunk.added) out.push('')
    }
  }
  const body = out.join(doc.eol)
  // A byte order mark only belongs at the very start of the file, and ours
  // doesn't write one.
  return header?.length ? [...header, body].join(doc.eol) : (doc.bom ? '\uFEFF' : '') + body
}

export function blockKey (b: Pick<FilterBlock, 'type' | 'tier'>): string {
  return `${b.type ?? ''}|${b.tier ?? ''}`
}
