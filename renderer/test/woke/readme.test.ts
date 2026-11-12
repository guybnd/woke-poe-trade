// The README's module table lists every module the app has, with the names
// and descriptions the app shows (renderer/src/web/woke/modules.ts). When a
// module is added or renamed, paste the table from the failure into README.md.
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { MODULES, MODULE_GROUPS } from '@/web/woke/modules'

const README = path.join(__dirname, '../../../README.md')

function expectedTable (): string {
  const group = (id: string) => MODULE_GROUPS.find(g => g.id === id)!.label
  const rows = MODULE_GROUPS.flatMap(g => MODULES.filter(m => m.group === g.id))
    .map(m => `| ${group(m.group)} | ${m.name} | ${m.description} |`)
  return ['| Area | Module | What it does |', '| --- | --- | --- |', ...rows].join('\n')
}

describe('README', () => {
  it('lists every module', () => {
    const text = fs.readFileSync(README, 'utf8').replace(/\r\n/g, '\n')
    const table = /<!-- modules:start[^>]*-->\n([\s\S]*?)\n<!-- modules:end -->/.exec(text)?.[1]
    expect(table, 'README.md lost its <!-- modules:start --> / <!-- modules:end --> markers').toBeDefined()
    expect(table).toBe(expectedTable())
  })
})

describe('the Tools help page', () => {
  it('lists every module', () => {
    const text = fs.readFileSync(path.join(__dirname, '../../../docs/tools.md'), 'utf8').replace(/\r\n/g, '\n')
    const table = /<!-- modules:start[^>]*-->\n([\s\S]*?)\n<!-- modules:end -->/.exec(text)?.[1]
    expect(table, 'docs/tools.md lost its <!-- modules:start --> / <!-- modules:end --> markers').toBeDefined()
    expect(table).toBe(expectedTable())
  })
})
