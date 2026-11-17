// A stand-in for the app around the loot filter store: an in-memory filter
// folder and GitHub cache, the game's config, and the chat commands it was sent.
import type { FilterFile } from '@/web/woke/loot-filter/store'

export interface FakeHost {
  files: Map<string, string>
  online: Map<string, { title: string, text: string }>
  neversink: Map<string, string>
  latestVersion: string
  gameFilter: { name: string | null, loaded: boolean | null }
  writes: Array<{ name: string, text: string }>
  // Holds the next write until released, to line up two saves.
  writeGate: Promise<void> | null
  writeFails: number
  // The app's keyed documents (doc-get / doc-put), by "collection/key".
  docs: Map<string, unknown>
  request: (name: string, args: Record<string, unknown>) => Promise<unknown>
}

export function fakeHost (): FakeHost {
  const host: FakeHost = {
    files: new Map(),
    online: new Map(),
    neversink: new Map(),
    latestVersion: '8.20.2',
    gameFilter: { name: null, loaded: null },
    writes: [],
    writeGate: null,
    writeFails: 0,
    docs: new Map(),
    async request (name, args) {
      switch (name) {
        case 'filter-list': {
          const files: FilterFile[] = [...host.files.keys()].filter(n => n.endsWith('.filter')).map(n => ({ name: n, size: 1, mtime: 1 }))
          for (const [id, f] of host.online) files.push({ name: id, size: 1, mtime: 1, online: true, title: f.title })
          return { dir: 'C:/filters', files }
        }
        case 'filter-read': {
          const text = args.online ? host.online.get(String(args.name))?.text : host.files.get(String(args.name))
          if (text == null) throw new Error(`ENOENT ${String(args.name)}`)
          return { text, mtime: 1 }
        }
        case 'filter-write': {
          const gate = host.writeGate
          host.writeGate = null
          if (gate) await gate
          if (host.writeFails > 0) {
            host.writeFails--
            throw new Error('EPERM: the game has the file open')
          }
          host.files.set(String(args.name), String(args.text))
          host.writes.push({ name: String(args.name), text: String(args.text) })
          return { path: String(args.name) }
        }
        case 'ns-read': {
          const text = host.neversink.get(`${String(args.version)}/${String(args.style ?? '')}/${String(args.level)}`)
          if (text == null) throw new Error('not cached')
          return { text }
        }
        case 'ns-download': return { version: host.latestVersion }
        case 'ns-latest': return { version: host.latestVersion, changes: 'Fixes' }
        case 'ns-prune': return {}
        case 'game-filter': return host.gameFilter
        case 'doc-get': case 'doc-get-strict': return host.docs.get(`${String(args.collection)}/${String(args.key)}`) ?? null
        case 'doc-exists': return host.docs.has(`${String(args.collection)}/${String(args.key)}`)
        case 'doc-put': host.docs.set(`${String(args.collection)}/${String(args.key)}`, JSON.parse(JSON.stringify(args.value))); return true
        default: return {}
      }
    }
  }
  return host
}
