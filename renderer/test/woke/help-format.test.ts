// Help format A is a gate, not a habit: every "?" text in the app (WInfo `text`,
// Settings `hint`, the help cards session-story opens by hand) must pass
// helpProblems (ui/help-format.ts). Fix a failure by rewriting the text as a
// short lead line plus "- " bullets, not by raising a limit.
import { readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { HELP_LIMITS, helpProblems } from '@/web/woke/ui/help-format'

const ROOT = path.resolve(__dirname, '../../src/web/woke')

// Help text other threads are rewriting right now. Each entry is temporary:
// take it out once that file's "?" texts are converted.
const PENDING: string[] = []

// A help text built at run time from data, so the scan can't read it whole.
// Name the file and the expression, and why it stays short.
const DYNAMIC: Record<string, string> = {
  'ui/WSettingRow.vue :text="hint"': 'passes the hint of the row, which the scan checks where it is written',
  'settings/ModulePage.vue :hint="m.description"': 'module descriptions, checked by the module list test below',
  'settings/ScreenPage.vue :hint="m.description"': 'module descriptions, checked by the module list test below',
  'settings/ScreenPage.vue :hint="f.off ? \'Module off\' : undefined"': 'two words',
  'session-story/MapHistory.vue tip($event, readTip(line.read))': 'one sentence: the stash read\'s time and change',
  'session-story/NightCard.vue tip($event, partTitle(p))': 'a map name, clock and deaths',
  'session-story/NightCard.vue tip($event, profit.from)': 'a short "From …" line',
  'session-story/NightCard.vue tip($event, OUT_TIPS[r.label])': 'OUT_TIPS: one line each'
}

function sources (dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const p = path.join(dir, name)
    if (statSync(p).isDirectory()) return sources(p)
    return /\.(vue|ts)$/.test(name) ? [p] : []
  })
}

// JS string literals in an expression, each ${…} filled with the longest text it
// could hold (a nested literal) or a short stand-in number.
// The script of the file being scanned, for ${name} in a template.
let SCRIPT = ''
const resolving = new Set<string>()

function literals (expr: string): string[] {
  const out: string[] = []
  let i = 0
  const readQuoted = (q: string): string => {
    let s = ''
    i++
    while (i < expr.length && expr[i] !== q) {
      if (expr[i] === '\\') { s += ({ n: '\n', t: '\t' } as Record<string, string>)[expr[i + 1]] ?? expr[i + 1]; i += 2; continue }
      s += expr[i++]
    }
    i++
    return s
  }
  const readTemplate = (): string => {
    let s = ''
    i++
    while (i < expr.length && expr[i] !== '`') {
      if (expr[i] === '\\') { s += ({ n: '\n', t: '\t' } as Record<string, string>)[expr[i + 1]] ?? expr[i + 1]; i += 2; continue }
      if (expr[i] === '$' && expr[i + 1] === '{') {
        i += 2
        let depth = 1
        const start = i
        while (i < expr.length && depth) {
          const c = expr[i]
          if (c === '{') depth++
          else if (c === '}') depth--
          else if (c === '`') { readTemplate(); continue } else if (c === '\'' || c === '"') { readQuoted(c); continue }
          i++
        }
        const body = expr.slice(start, i - 1)
        let inner = literals(body)
        // ${how}: what a local const of that name can hold.
        const name = /^\s*([A-Za-z_$][\w$]*)(?:\.value)?\s*$/.exec(body)?.[1]
        if (!inner.length && name && resolving.size < 4 && !resolving.has(name)) {
          resolving.add(name)
          inner = resolveName(SCRIPT, name) ?? []
          resolving.delete(name)
        }
        s += inner.sort((a, b) => b.length - a.length)[0] ?? '12'
        continue
      }
      s += expr[i++]
    }
    i++
    return s
  }
  // 'a' + 'b' is one text.
  let lastEnd = -1
  const push = (s: string) => {
    if (out.length && /^\s*\+\s*$/.test(expr.slice(lastEnd, start))) out[out.length - 1] += s
    else out.push(s)
    lastEnd = i
  }
  let start = 0
  while (i < expr.length) {
    const c = expr[i]
    start = i
    if (c === '\'' || c === '"') push(readQuoted(c))
    else if (c === '`') push(readTemplate())
    else if (c === '/' && expr[i + 1] === '/') { while (i < expr.length && expr[i] !== '\n') i++ } else i++
  }
  return out
}

// The index just past the string literal that starts at `at`.
function skipString (src: string, at: number): number {
  const q = src[at]
  let i = at + 1
  while (i < src.length && src[i] !== q) {
    if (src[i] === '\\') { i += 2; continue }
    if (q === '`' && src[i] === '$' && src[i + 1] === '{') {
      let depth = 1
      i += 2
      while (i < src.length && depth) {
        const c = src[i]
        if (c === '\'' || c === '"' || c === '`') { i = skipString(src, i); continue }
        if (c === '{') depth++
        else if (c === '}') depth--
        i++
      }
      continue
    }
    i++
  }
  return i + 1
}

// The value written right after `name =` (or `name:`) in a script: a string, or
// strings joined into one.
function resolveName (file: string, name: string): string[] | null {
  const m = new RegExp(`(?:const|let)\\s+${name}\\s*(?::[^=]+)?=\\s*`).exec(file)
  if (!m) return null
  let rest = file.slice(m.index + m[0].length)
  // `[ 'a', 'b' ].join('\n')`
  const joined = /^\[([\s\S]*?)\]\.join\((['"`])(.*?)\2\)/.exec(rest)
  if (joined) return [literals(joined[1]).join(joined[3].replace(/\\n/g, '\n'))]
  // computed(() => …): every text it can return.
  if (rest.startsWith('computed(')) {
    let depth = 0
    let end = 0
    for (; end < rest.length; end++) {
      if (rest[end] === '(') depth++
      else if (rest[end] === ')' && --depth === 0) break
    }
    const lits = literals(rest.slice(0, end))
    return lits.length ? lits : null
  }
  // a ? 'x' : 'y', over one or more lines: every text it can be.
  if (!/^[`'"]/.test(rest)) {
    let end = 0
    while (end < rest.length) {
      const c = rest[end]
      if (c === '\'' || c === '"' || c === '`') { end = skipString(rest, end); continue }
      if (c === '\n' && !/^\s*[?:+]/.test(rest.slice(end + 1)) && !/[?:+(]\s*$/.test(rest.slice(0, end))) break
      end++
    }
    const lits = literals(rest.slice(0, end))
    return lits.length ? lits : null
  }
  // One literal, or several joined with +: up to the first line break outside
  // a string that has no + on either side.
  let end = 0
  while (end < rest.length) {
    const c = rest[end]
    if (c === '\'' || c === '"' || c === '`') { end = skipString(rest, end); continue }
    if (c === '\n' && !/^\s*\+/.test(rest.slice(end + 1)) && !/\+\s*$/.test(rest.slice(0, end))) break
    end++
  }
  rest = rest.slice(0, end)
  return [literals(rest).join('')]
}

type Found = { where: string, text: string }

function attrValues (tag: string, attr: string): Array<{ dynamic: boolean, value: string }> {
  const out: Array<{ dynamic: boolean, value: string }> = []
  const re = new RegExp(`(^|\\s)(:|v-bind:)?${attr}="([^"]*)"`, 'g')
  for (const m of tag.matchAll(re)) out.push({ dynamic: !!m[2], value: m[3].replace(/&quot;/g, '"').replace(/&amp;/g, '&') })
  return out
}

// Every opening tag with this name, whole (attributes can span lines).
function tags (src: string, names: RegExp): string[] {
  const out: string[] = []
  for (const m of src.matchAll(names)) {
    let i = m.index! + m[0].length
    let q: string | null = null
    while (i < src.length) {
      const c = src[i]
      if (q) { if (c === q) q = null } else if (c === '"') q = c
      else if (c === '>') break
      i++
    }
    out.push(src.slice(m.index!, i))
  }
  return out
}

function collect () {
  const found: Found[] = []
  const unread: string[] = []
  const dynamicSeen = new Set<string>()
  for (const file of sources(ROOT)) {
    if (!file.endsWith('.vue')) continue
    const rel = path.relative(ROOT, file).replace(/\\/g, '/')
    const src = readFileSync(file, 'utf8')
    const script = src.match(/<script[\s\S]*?<\/script>/g)?.join('\n') ?? ''
    SCRIPT = script
    const uses = [
      ...tags(src, /<(WInfo|w-info)\b/g).flatMap(t => attrValues(t, 'text').map(v => ({ ...v, attr: 'text' }))),
      ...tags(src, /<(WSettingRow|w-setting-row)\b/g).flatMap(t => attrValues(t, 'hint').map(v => ({ ...v, attr: 'hint' })))
    ]
    for (const u of uses) {
      const where = `${rel} ${u.dynamic ? ':' : ''}${u.attr}="${u.value}"`
      if (DYNAMIC[where]) { dynamicSeen.add(where); continue }
      if (!u.dynamic) { found.push({ where: rel, text: u.value }); continue }
      const lits = literals(u.value)
      if (lits.length) { lits.forEach(text => found.push({ where: rel, text })); continue }
      const name = /^\s*([A-Za-z_$][\w$]*)\s*$/.exec(u.value)?.[1]
      const resolved = name ? resolveName(script, name) : null
      if (resolved != null) resolved.forEach(text => found.push({ where: `${rel} ${name}`, text }))
      else unread.push(where)
    }
    // Help cards opened by hand: tip($event, …) feeds showHelp.
    if (/showHelp\(/.test(script)) {
      for (const m of src.matchAll(/\btip\(\$event,\s*/g)) {
        const start = m.index! + m[0].length
        let depth = 1
        let i = start
        for (; i < src.length && depth; i++) { if (src[i] === '(') depth++; else if (src[i] === ')') depth-- }
        const arg = src.slice(start, i - 1).trim()
        const where = `${rel} tip($event, ${arg})`
        if (DYNAMIC[where]) { dynamicSeen.add(where); continue }
        const lits = literals(arg)
        if (lits.length) { lits.forEach(text => found.push({ where: `${rel} tip()`, text })); continue }
        const name = /^([A-Za-z_$][\w$]*)$/.exec(arg)?.[1]
        const resolved = name ? resolveName(script, name) : null
        if (resolved != null) resolved.forEach(text => found.push({ where: `${rel} ${name}`, text }))
        else unread.push(where)
      }
    }
  }
  return { found, unread, dynamicSeen }
}

// The whole statement or function that starts at `at`: up to a line break
// outside brackets and strings that doesn't continue the expression, or the
// closing brace of a function body.
function statementAt (src: string, at: number, valueOnly = false): string {
  let depth = 0
  let i = at
  let opened = false
  while (i < src.length) {
    const c = src[i]
    if (c === '\'' || c === '"' || c === '`') { i = skipString(src, i); continue }
    if (c === '/' && src[i + 1] === '/') { while (i < src.length && src[i] !== '\n') i++; continue }
    if (valueOnly && depth === 0 && c === ',') return src.slice(at, i)
    if (c === '(' || c === '[' || c === '{') { depth++; if (c === '{') opened = true } else if (c === ')' || c === ']' || c === '}') {
      depth--
      if (valueOnly && depth < 0) return src.slice(at, i)
      if (depth === 0 && c === '}' && opened && /^\s*\n/.test(src.slice(i + 1)) && !/^\s*[?:+.)|&]/.test(src.slice(i + 1).replace(/^\s*\n/, ''))) return src.slice(at, i + 1)
    } else if (c === '\n' && depth <= 0) {
      const before = src.slice(at, i).trimEnd()
      const after = src.slice(i + 1).trimStart()
      if (!/[?:+,(=>|&[{]$/.test(before) && !/^[?:+.|&)\]}]/.test(after)) return src.slice(at, i)
    }
    i++
  }
  return src.slice(at)
}

// Every text the names in an expression can hold: a const, a computed, a
// function written in the same script.
function namedTexts (script: string, expr: string, seen = new Set<string>()): string[] {
  const out: string[] = []
  for (const m of expr.matchAll(/(?<![.\w$])([A-Za-z_$][\w$]*)/g)) {
    const name = m[1]
    if (seen.has(name) || seen.size > 12) continue
    seen.add(name)
    const def = new RegExp(`(?:^|\\n)\\s*(?:export\\s+)?(?:(?:const|let)\\s+${name}\\s*(?::[^=\\n]+)?=|function\\s+${name}\\s*[(<])`).exec(script)
    if (!def) continue
    const body = statementAt(script, def.index + def[0].length)
    SCRIPT = script
    out.push(...literals(body))
  }
  return out
}

// Every hover title the scan can read: `title="…"` and `:title="…"` in
// templates (following names into the script), `title:` in option objects, and
// `.title =` set by hand, in .vue scripts and .ts files.
function hoverTitles (): Found[] {
  const out: Found[] = []
  for (const file of sources(ROOT)) {
    const rel = path.relative(ROOT, file).replace(/\\/g, '/')
    const src = readFileSync(file, 'utf8')
    const isVue = file.endsWith('.vue')
    const script = isVue ? (src.match(/<script[\s\S]*?<\/script>/g)?.join('\n') ?? '') : src
    SCRIPT = script
    if (isVue) {
      const template = src.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, '')
      for (const m of template.matchAll(/(?:^|\s)(:|v-bind:)?title="([^"]*)"/g)) {
        const expr = m[2].replace(/&quot;/g, '"').replace(/&amp;/g, '&')
        if (!m[1]) { out.push({ where: rel, text: expr }); continue }
        SCRIPT = script
        for (const text of [...literals(expr), ...namedTexts(script, expr)]) out.push({ where: `${rel} :title="${m[2].slice(0, 40)}"`, text })
      }
    }
    for (const m of script.matchAll(/(?<![\w$.'"])title\s*:\s*|\.title\s*=(?!=)\s*/g)) {
      // Not a key: in a comment or a string ('The title: minimize').
      const line = script.slice(script.lastIndexOf('\n', m.index!) + 1, m.index!)
      if (line.includes('//') || /^\s*\*/.test(line) || ['\'', '"', '`'].some(q => line.split(q).length % 2 === 0)) continue
      const body = statementAt(script, m.index! + m[0].length, true)
      SCRIPT = script
      const lits = literals(body)
      const texts = lits.length ? lits : namedTexts(script, body)
      for (const text of texts) out.push({ where: `${rel} title:`, text })
    }
    // A const or function named for a title (blendTitle, SUPPLY_TITLE), used
    // from anywhere.
    for (const m of script.matchAll(/(?:^|\n)\s*(?:export\s+)?(?:(?:const|let)\s+([\w$]*(?:Title|TITLE))\s*(?::[^=\n]+)?=|function\s+([\w$]*Title)\s*[(<])/g)) {
      SCRIPT = script
      for (const text of literals(statementAt(script, m.index! + m[0].length))) out.push({ where: `${rel} ${m[1] ?? m[2]}`, text })
    }
  }
  return out
}

describe('help format A', () => {
  const { found, unread, dynamicSeen } = collect()

  it('reads every help text it finds', () => {
    // A new help text built at run time: write it as a literal or a const in the
    // same file, or add it to DYNAMIC with a reason.
    expect(unread).toEqual([])
    expect(found.length).toBeGreaterThan(150)
    // No stale exemptions.
    expect(Object.keys(DYNAMIC).filter(k => !dynamicSeen.has(k))).toEqual([])
  })

  it('keeps every help text short, with a lead line and bullets', () => {
    const bad = found
      .filter(f => !PENDING.some(p => f.where.startsWith(p)))
      .map(f => ({ where: f.where, problems: helpProblems(f.text) }))
      .filter(f => f.problems.length)
      .map(f => `${f.where}: ${f.problems.join('; ')}`)
    expect(bad).toEqual([])
  })

  it('keeps every hover title a short label', () => {
    // A title that needs more words than this is help: put it in a WInfo, or
    // give each button its own short title.
    expect(hoverTitles().length).toBeGreaterThan(300)
    const long = hoverTitles()
      .filter(t => t.text.trim().length > HELP_LIMITS.title)
      .map(t => `${t.where}: ${t.text.trim().length} characters: "${t.text.trim().slice(0, 60)}…"`)
    expect(long).toEqual([])
  })

  it('lists only real pending files', () => {
    for (const p of PENDING) expect(found.some(f => f.where.startsWith(p)), p).toBe(true)
  })

  it('checks module descriptions, shown as Settings hints', async () => {
    const files = sources(ROOT).filter(f => f.endsWith('.ts'))
    const descriptions = files.flatMap(f => [...readFileSync(f, 'utf8').matchAll(/\bdescription:\s*('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`[^`]*`)/g)].map(m => ({ where: path.relative(ROOT, f), text: literals(m[1])[0] })))
    const bad = descriptions.map(d => ({ ...d, problems: helpProblems(d.text) })).filter(d => d.problems.length).map(d => `${d.where}: ${d.problems.join('; ')}`)
    expect(bad).toEqual([])
  })
})

describe('helpProblems', () => {
  it('passes a lead line and bullets', () => {
    expect(helpProblems('Shows currency by its price.\n- **Show** off hides a step.\n- [[Click]] an item to set it by hand.')).toEqual([])
  })
  it('fails a wall of text', () => {
    const wall = 'In maps, each pile of currency counts as its price times stack, and an item whose full stack is worth less than Decent counts less. Under the line it hides; over it it shows Small, and Normal, Decent, Big and Tink start at the prices you set.'
    expect(helpProblems(wall).join(' ')).toMatch(/lead is \d+ characters/)
  })
  it('fails a formula', () => {
    expect(helpProblems('Counts price × stack^0.75.')).toContain('has a formula: say what it does in words')
  })
  it('fails a bullet with no lead', () => {
    expect(helpProblems('- One\n- Two')[0]).toMatch(/lead line/)
  })
  it('fails too much text in all', () => {
    const bullets = Array.from({ length: 7 }, () => `- ${'word '.repeat(22).trim()}.`).join('\n')
    expect(helpProblems(`Lead.\n${bullets}`).join(' ')).toMatch(new RegExp(`max ${HELP_LIMITS.total}`))
  })
})
