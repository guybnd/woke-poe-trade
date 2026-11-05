// NeverSink's real filters, every strictness level, for the loot filter tests.
import fs from 'fs'
import path from 'path'
import zlib from 'zlib'
import { FIXTURES } from './game-data'

export const LEVELS = ['0-SOFT', '1-REGULAR', '2-SEMI-STRICT', '3-STRICT', '4-VERY-STRICT', '5-UBER-STRICT', '6-UBER-PLUS-STRICT'] as const
export type Level = typeof LEVELS[number]

const DIR = path.join(FIXTURES, 'filters/neversink')
const cache = new Map<string, string>()

function gz (name: string): string {
  let text = cache.get(name)
  if (text == null) {
    text = zlib.gunzipSync(fs.readFileSync(path.join(DIR, `${name}.filter.gz`))).toString('utf8')
    cache.set(name, text)
  }
  return text
}

export function neverSink (level: Level = '1-REGULAR'): string {
  return gz(level)
}

// A styled copy, which differs from the default in its actions.
export function neverSinkStyled (): string {
  return gz('VAAL-3-STRICT')
}

// Every .filter under WOKE_NEVERSINK_DIR (a NeverSink-Filter checkout), for a
// one-off run over all styles or a newer version. Empty without the variable.
export function extraFilters (): Array<{ name: string, text: string }> {
  const root = process.env.WOKE_NEVERSINK_DIR
  if (!root) return []
  const out: Array<{ name: string, text: string }> = []
  const walk = (dir: string) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name)
      if (e.isDirectory() && e.name !== '.git') walk(full)
      else if (e.isFile() && e.name.endsWith('.filter')) out.push({ name: path.relative(root, full), text: fs.readFileSync(full, 'utf8') })
    }
  }
  walk(root)
  return out
}
