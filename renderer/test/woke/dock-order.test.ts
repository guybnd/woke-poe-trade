// Every dock icon is listed in DOCK_ORDER: dismissedIcons and Settings › Icon
// row only know those, so an icon missing there, once dismissed "Always",
// could never come back. Read from the source: dock.ts pulls in the page.
import fs from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'

const SRC = path.resolve(__dirname, '../../src/web/woke')

function vueFiles (dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const p = path.join(dir, e.name)
    return e.isDirectory() ? vueFiles(p) : e.name.endsWith('.vue') ? [p] : []
  })
}

const dockTs = fs.readFileSync(path.join(SRC, 'dock/dock.ts'), 'utf8')
const block = (name: string) => {
  const m = new RegExp(`export const ${name}[^=]*= [\\[{]([\\s\\S]*?)\\n[\\]}]`).exec(dockTs)
  if (!m) throw new Error(`${name} not found in dock.ts`)
  return m[1].replace(/\/\/.*$/gm, '')
}
const order = [...block('DOCK_ORDER').matchAll(/'([a-z-]+)'/g)].map(m => m[1])
const listNames = /export const DOCK_LIST_NAMES.*/.exec(dockTs)?.[0] ?? ''
const named = new Set([...(block('DOCK_NAMES') + listNames).matchAll(/'([a-z-]+)':/g)].map(m => m[1]))

describe('dock icons', () => {
  const ids = new Set<string>()
  for (const file of vueFiles(SRC)) {
    const text = fs.readFileSync(file, 'utf8')
    for (const m of text.matchAll(/<DockItem\b[^>]*?\sid="([a-z-]+)"/g)) ids.add(m[1])
  }

  it('finds the icons and the lists', () => {
    expect(ids.size).toBeGreaterThan(20)
    expect(order.length).toBeGreaterThan(20)
    expect(ids.has('net-worth')).toBe(true)
  })

  it('lists every icon in DOCK_ORDER with a name', () => {
    // Retired tools (modules.ts RETIRED_MODULES) keep their DockItem but never mount.
    const retired = new Set(['farming', 'league-invest', 'wealthy-exile'])
    expect([...ids].filter(id => !order.includes(id) && !retired.has(id))).toEqual([])
    expect([...ids].filter(id => !named.has(id))).toEqual([])
  })
})
